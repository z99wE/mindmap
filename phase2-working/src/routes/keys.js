// API Key Vault Routes - AES-256 encrypted key storage
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { encrypt, decrypt, maskKey } = require('../crypto');

// GET /api/keys - list user's API keys (masked)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = result.rows[0]?.api_keys || {};
    const masked = {};
    for (const [provider, data] of Object.entries(keys)) {
      masked[provider] = {
        masked: data.masked || '****',
        addedAt: data.addedAt,
        provider,
      };
    }
    res.json({ keys: masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/keys - add an API key
router.post('/', authMiddleware, async (req, res) => {
  try {
    // BYO keys available for all tiers

    const { provider, key } = req.body;
    if (!provider || !key) return res.status(400).json({ error: 'Provider and key are required' });

    const validProviders = ['groq', 'openai', 'anthropic', 'nvidia', 'ollama', 'tavily', 'firecrawl', 'searxng_url'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ error: `Invalid provider. Use: ${validProviders.join(', ')}` });
    }

    const encrypted = encrypt(key);
    const masked = maskKey(key);

    // Get existing keys and add/update
    const existing = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = existing.rows[0]?.api_keys || {};
    keys[provider.toLowerCase()] = {
      key: encrypted,
      masked,
      addedAt: new Date().toISOString(),
    };

    await pool.query(
      'UPDATE users SET api_keys = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(keys), req.user.userId]
    );

    // Audit log
    await pool.query(
      'INSERT INTO api_key_log (user_id, provider, action, masked_key) VALUES ($1, $2, $3, $4)',
      [req.user.userId, provider.toLowerCase(), 'added', masked]
    );

    res.json({ success: true, provider: provider.toLowerCase(), masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/keys/:provider - remove an API key
router.delete('/:provider', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT api_keys FROM users WHERE id = $1', [req.user.userId]);
    const keys = existing.rows[0]?.api_keys || {};
    delete keys[req.params.provider];

    await pool.query(
      'UPDATE users SET api_keys = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(keys), req.user.userId]
    );

    await pool.query(
      'INSERT INTO api_key_log (user_id, provider, action) VALUES ($1, $2, $3)',
      [req.user.userId, req.params.provider, 'deleted']
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: decrypt a user's key for LLM routing
async function getDecryptedKey(userId, provider) {
  const result = await pool.query('SELECT api_keys FROM users WHERE id = $1', [userId]);
  const keys = result.rows[0]?.api_keys || {};
  const keyData = keys[provider];
  if (!keyData?.key) return null;
  return decrypt(keyData.key);
}

module.exports = router;
module.exports.getDecryptedKey = getDecryptedKey;
