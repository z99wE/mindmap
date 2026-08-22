/**
 * Embedding Router — Multi-provider, multi-tenant embedding generation
 * 
 * Routes embedding requests across multiple free/paid providers with:
 * - Round-robin rotation across providers
 * - 60s cooldown on failure (same as LLM key router)
 * - Automatic fallback through the chain
 * - Per-user cache to avoid re-embedding identical text
 * - Batch support for multiple texts at once
 *
 * Providers (free tier):
 *   1. Groq — nomic-embed-text-v1_5 (1024 dims, free, fast)
 *   2. NVIDIA NIM — baai/bge-m3 (1024 dims, free 1000 req/day)
 *   3. HuggingFace — all-MiniLM-L6-v2 (384 dims, free, rate-limited)
 *   4. OpenAI — text-embedding-3-small (1536 dims, $0.02/1M tokens)
 *   5. Fallback — FNV-1a hash (no API needed, degraded quality)
 *
 * Multi-tenant: embeddings are stored per-user in PostgreSQL.
 * Each user's memory graph is isolated by user_id.
 */

'use strict';

const https = require('https');

// ── Provider Configurations ────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq',
    hostname: 'api.groq.com',
    path: '/openai/v1/embeddings',
    model: 'nomic-embed-text-v1_5',
    dims: 768,
    maxTokens: 8192,
    keyEnv: ['GROQ_KEY_1', 'GROQ_API_KEY'],
    rateLimit: 30, // requests per minute
    costPer1M: 0,  // free
  },
  {
    id: 'nvidia_nim',
    name: 'NVIDIA NIM',
    hostname: 'integrate.api.nvidia.com',
    path: '/v1/embeddings',
    model: 'nvidia/nv-embedqa-e5-v5',
    dims: 1024,
    maxTokens: 512,
    keyEnv: ['NVIDIA_API_KEY', 'NIM_API_KEY'],
    rateLimit: 20,
    costPer1M: 0, // free 1000 req/day
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    hostname: 'api-inference.huggingface.co',
    path: '/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
    model: 'all-MiniLM-L6-v2',
    dims: 384,
    maxTokens: 512,
    keyEnv: ['HUGGINGFACE_API_KEY'],
    rateLimit: 10,
    costPer1M: 0, // free, rate-limited
  },
  {
    id: 'openai',
    name: 'OpenAI',
    hostname: 'api.openai.com',
    path: '/v1/embeddings',
    model: 'text-embedding-3-small',
    dims: 1536,
    maxTokens: 8191,
    keyEnv: ['OPENAI_KEY_1', 'OPENAI_API_KEY'],
    rateLimit: 60,
    costPer1M: 0.02, // $0.02 per 1M tokens
  },
];

const TARGET_DIM = 1536; // pgvector column dimension
const COOLDOWN_MS = 60_000; // 60s cooldown on failure
const CACHE_MAX = 10_000;

class EmbeddingRouter {
  constructor() {
    this.cooldowns = new Map(); // providerId -> until timestamp
    this.usage = new Map();    // providerId -> { count, resetAt }
    this.currentIndex = 0;
    this.cache = new Map();    // textHash -> embedding[]
    this._loadKeys();
  }

  _loadKeys() {
    this.providers = [];
    for (const p of PROVIDERS) {
      // Check multiple env var names for each provider
      let key = null;
      for (const envName of p.keyEnv) {
        if (process.env[envName]) {
          key = process.env[envName];
          break;
        }
      }
      if (key) {
        this.providers.push({ ...p, key });
      }
    }
    console.log(`[EmbeddingRouter] Loaded ${this.providers.length} provider(s): [${this.providers.map(p => p.id).join(', ')}]`);
  }

  /**
   * Get next available provider (round-robin with cooldown)
   */
  _getNextProvider() {
    const available = this.providers.filter(p => !this._isCoolingDown(p.id) && !this._isRateLimited(p.id));
    if (available.length === 0) return null;
    const provider = available[this.currentIndex % available.length];
    this.currentIndex++;
    this._trackUsage(provider.id);
    return provider;
  }

  _isCoolingDown(id) {
    const until = this.cooldowns.get(id);
    if (!until) return false;
    if (Date.now() > until) { this.cooldowns.delete(id); return false; }
    return true;
  }

  _isRateLimited(id) {
    const usage = this.usage.get(id);
    if (!usage) return false;
    const provider = this.providers.find(p => p.id === id);
    return usage.count >= (provider?.rateLimit || 30);
  }

  _trackUsage(id) {
    const now = Date.now();
    const current = this.usage.get(id);
    if (!current || now > current.resetAt) {
      this.usage.set(id, { count: 1, resetAt: now + 60_000 });
    } else {
      current.count++;
    }
  }

  _markCooldown(id) {
    this.cooldowns.set(id, Date.now() + COOLDOWN_MS);
    console.log(`[EmbeddingRouter] ${id} cooling down for 60s`);
  }

  /**
   * Generate embedding for a single text with automatic failover
   * Returns: number[] (1536-dim vector)
   */
  async generate(text) {
    if (!text || typeof text !== 'string') return this._fallbackEmbed(text || '');

    // Check cache
    const cacheKey = text.slice(0, 300);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    // Try each provider in round-robin order
    let lastError = null;
    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this._getNextProvider();
      if (!provider) break;

      try {
        const embedding = await this._callProvider(provider, text);
        if (embedding) {
          const normalized = this._normalizeDim(embedding, TARGET_DIM);
          this._cacheResult(cacheKey, normalized);
          return normalized;
        }
      } catch (e) {
        lastError = e;
        this._markCooldown(provider.id);
      }
    }

    // All providers failed — use hash fallback
    console.warn(`[EmbeddingRouter] All providers failed, using hash fallback. Last error: ${lastError?.message}`);
    const fallback = this._fallbackEmbed(text);
    this._cacheResult(cacheKey, fallback);
    return fallback;
  }

  /**
   * Generate embeddings for multiple texts in parallel (batch)
   */
  async generateBatch(texts) {
    return Promise.all(texts.map(t => this.generate(t)));
  }

  /**
   * Call a specific provider's embedding API
   */
  async _callProvider(provider, text) {
    const truncated = text.slice(0, provider.maxTokens);

    if (provider.id === 'huggingface') {
      return this._callHuggingFace(provider, truncated);
    }

    // OpenAI-compatible API (Groq, NVIDIA NIM, OpenAI)
    return this._callOpenAICompatible(provider, truncated);
  }

  async _callOpenAICompatible(provider, text) {
    const body = JSON.stringify({
      model: provider.model,
      input: text,
      encoding_format: 'float',
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: provider.hostname,
        path: provider.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.key}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`${provider.id} ${res.statusCode}: ${parsed.error?.message || data.slice(0, 200)}`));
              return;
            }
            const emb = parsed.data?.[0]?.embedding;
            if (emb && Array.isArray(emb)) {
              resolve(emb);
            } else {
              reject(new Error(`${provider.id}: no embedding in response`));
            }
          } catch (e) {
            reject(new Error(`${provider.id}: parse error`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10_000, () => { req.destroy(); reject(new Error(`${provider.id}: timeout`)); });
      req.write(body);
      req.end();
    });
  }

  async _callHuggingFace(provider, text) {
    const body = JSON.stringify({
      inputs: text,
      options: { wait_for_model: true },
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: provider.hostname,
        path: provider.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.key ? { 'Authorization': `Bearer ${provider.key}` } : {}),
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`huggingface ${res.statusCode}: ${data.slice(0, 200)}`));
              return;
            }
            const emb = Array.isArray(parsed[0]) ? parsed[0] : parsed;
            if (Array.isArray(emb) && emb.length > 0) {
              resolve(emb);
            } else {
              reject(new Error('huggingface: no embedding in response'));
            }
          } catch (e) {
            reject(new Error('huggingface: parse error'));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(15_000, () => { req.destroy(); reject(new Error('huggingface: timeout')); });
      req.write(body);
      req.end();
    });
  }

  /**
   * FNV-1a hash fallback — deterministic pseudo-embeddings
   */
  _fallbackEmbed(text) {
    const dim = TARGET_DIM;
    const embedding = new Array(dim);
    for (let i = 0; i < dim; i++) {
      let hash = 2166136261;
      const combined = String(i) + '|' + (text || '');
      for (let j = 0; j < combined.length; j++) {
        hash ^= combined.charCodeAt(j);
        hash = Math.imul(hash, 16777619);
      }
      embedding[i] = ((hash >>> 0) / 4294967296) * 2 - 1;
    }
    return embedding;
  }

  _normalizeDim(emb, targetDim) {
    if (emb.length === targetDim) return emb;
    if (emb.length > targetDim) return emb.slice(0, targetDim);
    return [...emb, ...new Array(targetDim - emb.length).fill(0)];
  }

  _cacheResult(key, embedding) {
    if (this.cache.size >= CACHE_MAX) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, embedding);
  }

  /**
   * Health check — returns status of all configured providers
   */
  status() {
    return {
      providers: this.providers.map(p => ({
        id: p.id,
        name: p.name,
        dims: p.dims,
        model: p.model,
        costPer1M: p.costPer1M,
        coolingDown: this._isCoolingDown(p.id),
        rateLimited: this._isRateLimited(p.id),
      })),
      cacheSize: this.cache.size,
      targetDim: TARGET_DIM,
    };
  }
}

// Singleton
const embeddingRouter = new EmbeddingRouter();

module.exports = { EmbeddingRouter, embeddingRouter };
