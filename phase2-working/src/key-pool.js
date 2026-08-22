// Shared API Key Pool - Round-robin with rate-limit awareness
// Loads admin-configured keys from BOTH env vars AND the shared_api_keys table.
// Users never see these keys — they are used transparently as fallback.
require('dotenv').config();
const crypto = require('crypto');

class KeyPool {
  constructor() {
    // Load keys from env vars: GROQ_KEY_1, GROQ_KEY_2, OPENAI_KEY_1, etc.
    this.keys = [];
    this.cooldowns = new Map(); // keyId -> cooldownUntil timestamp
    this.usage = new Map();     // keyId -> { count, resetAt }
    this.currentIndex = 0;
    this._loadKeys();
    // Async load from database (non-blocking)
    this._loadFromDB().catch(() => {});
  }

  // Reload keys from the database (called after admin adds/removes keys)
  async reload() {
    this.keys = this.keys.filter(k => k.source === 'env'); // keep env keys
    await this._loadFromDB();
  }

  async _loadFromDB() {
    try {
      const { pool } = require('./db');
      const result = await pool.query(
        "SELECT id, provider, encrypted_key, masked_key, endpoint, model, rate_limit FROM shared_api_keys WHERE is_active = true"
      );
      const { decrypt } = require('./crypto');
      for (const row of result.rows) {
        // Skip if env var key already loaded for this provider+position
        const alreadyLoaded = this.keys.some(k => k.provider === row.provider && k.id === `shared_${row.id}`);
        if (alreadyLoaded) continue;
        try {
          const decrypted = decrypt(row.encrypted_key);
          this.keys.push({
            id: `shared_${row.id}`,
            provider: row.provider,
            key: decrypted,
            masked: row.masked_key,
            rateLimit: row.rate_limit || 30,
            endpoint: row.endpoint || undefined,
            model: row.model || undefined,
            source: 'db',
          });
        } catch {
          console.warn(`[KeyPool] Failed to decrypt shared key ${row.id}`);
        }
      }
      console.log(`[KeyPool] Loaded ${this.keys.length} shared API keys (${this.keys.filter(k=>k.source==='env').length} env + ${this.keys.filter(k=>k.source==='db').length} db)`);
    } catch (err) {
      // DB might not be ready yet during startup
      console.warn(`[KeyPool] DB key load skipped: ${err.message}`);
    }
  }

  _loadKeys() {
    const providers = ['GROQ', 'OPENAI', 'ANTHROPIC', 'XAI', 'NVIDIA', 'FEATHERLESS', 'FIREWORKS', 'LIGHTNING'];
    for (const provider of providers) {
      // Check numbered keys: GROQ_KEY_1, GROQ_KEY_2, ... (up to 100 per provider)
      for (let i = 1; i <= 100; i++) {
        const key = process.env[`${provider}_KEY_${i}`];
        if (key) {
          this.keys.push({
            id: `${provider.toLowerCase()}_${i}`,
            provider: provider.toLowerCase(),
            key,
            rateLimit: provider === 'GROQ' ? 30 : 60, // requests per minute
          });
        }
      }
      // Also check single key: GROQ_API_KEY, OPENAI_API_KEY, XAI_API_KEY, ...
      const singleKey = process.env[`${provider}_API_KEY`];
      if (singleKey && !this.keys.find(k => k.provider === provider.toLowerCase())) {
        this.keys.push({
          id: `${provider.toLowerCase()}_default`,
          provider: provider.toLowerCase(),
          key: singleKey,
          rateLimit: provider === 'GROQ' ? 30 : 60,
        });
      }
    }
    // Alias: GROK_API_KEY is commonly used for xAI's Grok
    const grokAlias = process.env.GROK_API_KEY;
    if (grokAlias && !this.keys.find(k => k.provider === 'xai')) {
      this.keys.push({ id: 'xai_default', provider: 'xai', key: grokAlias, rateLimit: 60 });
    }
    // Custom OpenAI compatible keys: OPENAI_COMPATIBLE_KEY_1, ...
    for (let i = 1; i <= 100; i++) {
      const key = process.env[`OPENAI_COMPATIBLE_KEY_${i}`];
      if (key) {
        this.keys.push({
          id: `compatible_${i}`,
          provider: 'compatible',
          key,
          endpoint: process.env[`OPENAI_COMPATIBLE_URL_${i}`] || 'https://api.openai.com/v1/chat/completions',
          model: process.env[`OPENAI_COMPATIBLE_MODEL_${i}`] || 'gpt-4o-mini',
          rateLimit: 60,
        });
      }
    }
    console.log(`[KeyPool] Loaded ${this.keys.length} shared API keys`);
  }

  // Get next available key for a provider, with round-robin
  getNextKey(provider = 'groq') {
    const available = this.keys.filter(k =>
      k.provider === provider && !this._isCoolingDown(k.id) && !this._isRateLimited(k.id)
    );
    if (available.length === 0) {
      // Try fallback providers
      const fallbacks = provider === 'groq' ? ['openai', 'anthropic'] : ['groq'];
      for (const fb of fallbacks) {
        const fbKeys = this.keys.filter(k =>
          k.provider === fb && !this._isCoolingDown(k.id) && !this._isRateLimited(k.id)
        );
        if (fbKeys.length > 0) {
          const key = fbKeys[this.currentIndex % fbKeys.length];
          this.currentIndex++;
          this._trackUsage(key.id);
          return key;
        }
      }
      return null; // All keys exhausted
    }
    const key = available[this.currentIndex % available.length];
    this.currentIndex++;
    this._trackUsage(key.id);
    return key;
  }

  // Mark a key as cooling down (429 rate limit hit)
  markCoolingDown(keyId, seconds = 60) {
    this.cooldowns.set(keyId, Date.now() + seconds * 1000);
    console.log(`[KeyPool] Key ${keyId} cooling down for ${seconds}s`);
  }

  // Track usage per key (reset every hour)
  _trackUsage(keyId) {
    const now = Date.now();
    const current = this.usage.get(keyId);
    if (!current || now > current.resetAt) {
      this.usage.set(keyId, { count: 1, resetAt: now + 3600000 });
    } else {
      current.count++;
    }
  }

  _isCoolingDown(keyId) {
    const until = this.cooldowns.get(keyId);
    if (!until) return false;
    if (Date.now() > until) {
      this.cooldowns.delete(keyId);
      return false;
    }
    return true;
  }

  _isRateLimited(keyId) {
    const usage = this.usage.get(keyId);
    if (!usage) return false;
    const keyDef = this.keys.find(k => k.id === keyId);
    return usage.count >= (keyDef?.rateLimit || 30);
  }

  // Get pool status (for admin dashboard)
  getStatus() {
    return {
      totalKeys: this.keys.length,
      byProvider: this.keys.reduce((acc, k) => {
        acc[k.provider] = (acc[k.provider] || 0) + 1;
        return acc;
      }, {}),
      coolingDown: [...this.cooldowns.entries()]
        .filter(([, until]) => Date.now() < until)
        .map(([id, until]) => ({ id, until: new Date(until).toISOString() })),
      usage: [...this.usage.entries()].map(([id, data]) => ({
        id,
        count: data.count,
        resetAt: new Date(data.resetAt).toISOString(),
      })),
    };
  }

  // Get all available keys for a user (considering their BYO keys)
  async getKeysForUser(user, pool) {
    const byoKeys = user.api_keys || {};
    const result = { byo: {}, shared: {} };

    for (const [provider, keyData] of Object.entries(byoKeys)) {
      const keyList = Array.isArray(keyData) ? keyData : (keyData ? [keyData] : []);
      result.byo[provider] = keyList
        .filter((k) => k?.key)
        .map((k) => ({ key: k.key, masked: k.masked || '****' }));
    }

    // Always provide shared pool status
    const groqKey = this.getNextKey('groq');
    if (groqKey) result.shared.groq = { available: true, keyId: groqKey.id };

    return result;
  }
}

// Singleton
const keyPool = new KeyPool();
module.exports = { keyPool, KeyPool };
