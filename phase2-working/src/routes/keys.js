// API Key Vault Routes - AES-256 encrypted key storage
// Supports hundreds of keys per provider (round-robin rotation). The provider
// registry below is the single source of truth served to the frontend so the
// UI is configured from the backend, not hardcoded.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { encrypt, decrypt, maskKey } = require('../crypto');
const { keyRouter } = require('../key-router');
const rateLimit = require('express-rate-limit');

// Abuse filter to prevent key addition/deletion spam
const keyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 operations per minute per IP
  message: { error: 'Too many key operations. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Provider registry (backend → frontend configuration) ─────────────────────
// Served via GET /api/keys/providers so the API Vault page and Mission Control
// render exactly what the backend supports. `requiresKey: false` providers are
// local endpoints (Ollama, LM Studio) where connectivity depends on the local
// server being reachable.
const PROVIDER_REGISTRY = [
  { id: 'groq',         name: 'Groq',                    type: 'llm',    requiresKey: true,  freeTier: true,  note: 'Low-latency inference' },
  { id: 'openai',       name: 'OpenAI',                  type: 'llm',    requiresKey: true,  freeTier: false, note: 'Pay per use' },
  { id: 'anthropic',    name: 'Anthropic',               type: 'llm',    requiresKey: true,  freeTier: false, note: 'Pay per use' },
  { id: 'gemini',       name: 'Google Gemini',           type: 'llm',    requiresKey: true,  freeTier: true,  note: 'Multimodal foundation models' },
  { id: 'claude',       name: 'Claude (AWS/GCP)',        type: 'llm',    requiresKey: true,  freeTier: false, note: 'Enterprise API integration' },
  { id: 'mistral',      name: 'Mistral AI',              type: 'llm',    requiresKey: true,  freeTier: true,  note: 'Open-weight models API' },
  { id: 'cohere',       name: 'Cohere',                  type: 'llm',    requiresKey: true,  freeTier: true,  note: 'Command & embedding models' },
  { id: 'nvidia',       name: 'NVIDIA NIM',              type: 'llm',    requiresKey: true,  freeTier: true,  note: 'Credits on signup' },
  { id: 'openrouter',   name: 'OpenRouter',              type: 'llm',    requiresKey: true,  freeTier: false, note: 'Multi-model gateway' },
  { id: 'ollama',       name: 'Ollama (Local)',          type: 'llm',    requiresKey: false, freeTier: true,  note: 'Local server — no key needed' },
  { id: 'lmstudio',     name: 'LM Studio (Local)',       type: 'llm',    requiresKey: false, freeTier: true,  note: 'Local server — no key needed' },
  { id: 'tavily',       name: 'Tavily (Web Search)',     type: 'search', requiresKey: true,  freeTier: true,  note: 'Monthly credits included' },
  { id: 'firecrawl',    name: 'Firecrawl (Scraping)',    type: 'search', requiresKey: true,  freeTier: true,  note: 'Monthly credits included' },
  { id: 'searxng_url',  name: 'SearXNG (Self-hosted)',   type: 'search', requiresKey: false, freeTier: true,  note: 'Local endpoint — no key needed' },
];

// A shared usage disclaimer shown on the API Vault + Connected Channels pages:
// availability depends on the provider and the user's own usage limits, NOT on
// how the app itself functions.
const USAGE_DISCLAIMER =
  'Connectivity and response limits depend on the provider you choose and your current usage limits with that provider — they do not depend on how ReMentally functions.';

// Max keys per provider — intentionally high ("hundreds"). No meaningful app
// limit; providers enforce their own quotas.
const MAX_KEYS_PER_PROVIDER = 500;

// Normalize stored api_keys into { provider: [ { key, masked, addedAt, id } ] }.
// Legacy rows stored a single object per provider — wrap them into an array.
function normalizeKeys(raw) {
  const out = {};
  for (const [provider, value] of Object.entries(raw || {})) {
    if (Array.isArray(value)) {
      out[provider] = value.map((k) => ({ ...k, id: k.id || crypto.randomUUID() }));
    } else if (value && typeof value === 'object' && value.key) {
      out[provider] = [{ ...value, id: value.id || crypto.randomUUID() }];
    } else {
      out[provider] = [];
    }
  }
  return out;
}

// GET /api/keys/providers - public provider registry (drives the frontend)
router.get('/providers', (req, res) => {
  res.json({ providers: PROVIDER_REGISTRY, usageDisclaimer: USAGE_DISCLAIMER });
});

// GET /api/keys/status - Key Router status: every connected provider + key,
// key counts, last-used time, and active cooldowns. Drives the "what's
// connected" overview in the API Vault and Mission Control.
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const user = { id: req.user.userId, api_keys: result.rows[0]?.api_keys || {} };
    res.json(keyRouter.getStatus(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/keys - list user's API keys (masked), grouped by provider
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = normalizeKeys(result.rows[0]?.api_keys || {});
    const masked = {};
    for (const [provider, list] of Object.entries(keys)) {
      masked[provider] = list.map((data) => ({
        id: data.id,
        provider,
        masked: data.masked || '****',
        addedAt: data.addedAt,
        active: true,
      }));
    }
    res.json({ keys: masked, providers: PROVIDER_REGISTRY, usageDisclaimer: USAGE_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/keys - add an API key (multiple keys per provider allowed)
router.post('/', authMiddleware, keyLimiter, async (req, res) => {
  try {
    const { provider, key } = req.body;
    if (!provider || !key) return res.status(400).json({ error: 'Provider and key are required' });

    const norm = provider.toLowerCase();
    const providerDef = PROVIDER_REGISTRY.find((p) => p.id === norm);
    if (!providerDef) {
      return res.status(400).json({ error: `Invalid provider. Use: ${PROVIDER_REGISTRY.map((p) => p.id).join(', ')}` });
    }

    const encrypted = encrypt(key);
    const masked = maskKey(key);

    // Get existing keys and append
    const existing = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = normalizeKeys(existing.rows[0]?.api_keys || {});

    if (!keys[norm]) keys[norm] = [];
    if (keys[norm].length >= MAX_KEYS_PER_PROVIDER) {
      return res.status(400).json({ error: `You have reached the maximum of ${MAX_KEYS_PER_PROVIDER} keys for ${providerDef.name}. Delete an old key first.` });
    }

    keys[norm].push({
      id: crypto.randomUUID(),
      key: encrypted,
      masked,
      addedAt: new Date().toISOString(),
    });

    await pool.query(
      'UPDATE users SET api_keys = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(keys), req.user.userId]
    );

    // Audit log
    await pool.query(
      'INSERT INTO api_key_log (user_id, provider, action, masked_key) VALUES ($1, $2, $3, $4)',
      [req.user.userId, norm, 'added', masked]
    );

    res.json({ success: true, provider: norm, masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/keys/:provider - remove ALL keys for a provider
router.delete('/:provider', authMiddleware, keyLimiter, async (req, res) => {
  try {
    const existing = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = normalizeKeys(existing.rows[0]?.api_keys || {});
    const removed = keys[req.params.provider]?.length || 0;
    delete keys[req.params.provider];

    await pool.query(
      'UPDATE users SET api_keys = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(keys), req.user.userId]
    );

    await pool.query(
      'INSERT INTO api_key_log (user_id, provider, action) VALUES ($1, $2, $3)',
      [req.user.userId, req.params.provider, 'deleted']
    );

    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/keys/:provider/:keyId - remove a single specific key
router.delete('/:provider/:keyId', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = normalizeKeys(existing.rows[0]?.api_keys || {});
    const before = keys[req.params.provider]?.length || 0;
    keys[req.params.provider] = (keys[req.params.provider] || []).filter((k) => k.id !== req.params.keyId);
    const after = keys[req.params.provider]?.length || 0;
    if (after === 0) delete keys[req.params.provider];

    await pool.query(
      'UPDATE users SET api_keys = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(keys), req.user.userId]
    );

    await pool.query(
      'INSERT INTO api_key_log (user_id, provider, action) VALUES ($1, $2, $3)',
      [req.user.userId, req.params.provider, 'deleted']
    );

    res.json({ success: true, removed: before - after });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helpers: decrypt a user's key(s) for LLM routing
// Returns all decrypted keys for a provider (for rotation), or null.
async function getDecryptedKeys(userId, provider) {
  const result = await pool.query('SELECT api_keys FROM users WHERE id = $1', [userId]);
  const keys = normalizeKeys(result.rows[0]?.api_keys || {});
  const list = keys[provider] || [];
  const out = [];
  for (const keyData of list) {
    if (keyData?.key) {
      try { out.push(decrypt(keyData.key)); } catch { /* skip bad key */ }
    }
  }
  return out.length > 0 ? out : null;
}

// Single-key helper (first available) — kept for backward compatibility.
async function getDecryptedKey(userId, provider) {
  const keys = await getDecryptedKeys(userId, provider);
  return keys && keys.length > 0 ? keys[0] : null;
}

module.exports = router;
module.exports.getDecryptedKey = getDecryptedKey;
module.exports.getDecryptedKeys = getDecryptedKeys;
module.exports.PROVIDER_REGISTRY = PROVIDER_REGISTRY;
module.exports.USAGE_DISCLAIMER = USAGE_DISCLAIMER;
