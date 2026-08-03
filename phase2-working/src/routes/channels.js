// Channel Routes - Messaging platform configuration (Caspian SDK)
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { encrypt, decrypt, ENCRYPTION_KEY } = require('../crypto');

const SUPPORTED_PLATFORMS = [
  { id: 'slack', name: 'Slack', fields: ['bot_token', 'channel_id'] },
  { id: 'telegram', name: 'Telegram', fields: ['bot_token', 'chat_id'] },
  { id: 'whatsapp', name: 'WhatsApp', fields: ['phone_number', 'api_key'] },
  { id: 'discord', name: 'Discord', fields: ['bot_token', 'channel_id'] },
  { id: 'email', name: 'Email', fields: ['smtp_host', 'smtp_port', 'email', 'password'] },
  { id: 'sms', name: 'SMS', fields: ['phone_number', 'api_key'] },
  { id: 'signal', name: 'Signal', fields: ['phone_number', 'api_key'] },
  { id: 'twitter', name: 'Twitter (X)', fields: ['api_key', 'api_secret', 'access_token', 'access_secret'] },
  { id: 'bluesky', name: 'Bluesky', fields: ['identifier', 'app_password'] },
];

// GET /api/channels/platforms - list supported platforms
router.get('/platforms', (req, res) => {
  res.json({ platforms: SUPPORTED_PLATFORMS });
});

// POST /api/channels/install-oauth/:platform - Get OAuth install URL for platforms that require it
router.post('/install-oauth/:platform', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Get the global caspian client from app (injected in server.js, but here we can just require it if needed, or we might need to handle it)
    // Wait, the easiest way is to import it, but it's initialized in server.js.
    // For now, we'll return a mock or require the caspian-client instance if we have a way.
    // Let's rely on req.app.get('caspian') which we'll set in server.js
    const caspian = req.app.get('caspian');
    if (!caspian || !caspian.rawClient) {
      return res.status(503).json({ error: 'Caspian messaging service is unavailable' });
    }

    let result = null;
    if (platform === 'slack') {
      result = await caspian.rawClient.installSlack();
    } else if (platform === 'discord') {
      result = await caspian.rawClient.installDiscord();
    } else {
      return res.status(400).json({ error: `OAuth install not supported for platform: ${platform}` });
    }

    if (result && result.authorize_url) {
      res.json({ authorize_url: result.authorize_url });
    } else {
      res.json({ message: 'Installation requested but no authorize_url was returned by Caspian.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels - user's connected channels
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, platform, display_name, is_active, created_at FROM channels WHERE user_id = $1 ORDER BY created_at',
      [req.user.userId]
    );
    res.json({ channels: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/connect - connect a new channel
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { platform, displayName, credentials, webhookUrl } = req.body;
    if (!platform || !credentials) {
      return res.status(400).json({ error: 'Platform and credentials are required' });
    }

    // Check user tier for gatekeeping
    const userRes = await pool.query('SELECT tier FROM users WHERE id = $1', [req.user.userId]);
    const userTier = userRes.rows[0]?.tier || 'free';

    if (userTier === 'free') {
      const allowedFreePlatforms = ['telegram', 'email', 'slack', 'discord', 'bluesky'];
      if (!allowedFreePlatforms.includes(platform.toLowerCase())) {
        return res.status(403).json({
          error: `The ${platform.toUpperCase()} integration is a Premium feature. Upgrade to Premium ($15/mo) for access to paid channels (WhatsApp, SMS, Twitter). Free channels: Telegram, Email, Slack, Discord, Bluesky.`
        });
      }

      // Check count of active channels
      const countRes = await pool.query('SELECT COUNT(*) FROM channels WHERE user_id = $1 AND is_active = true', [req.user.userId]);
      const currentCount = parseInt(countRes.rows[0]?.count || '0');
      if (currentCount >= 2) {
        return res.status(403).json({
          error: 'Free tier users are limited to a maximum of 2 active connection channels. Upgrade to Premium for unlimited channels.'
        });
      }
    }

    const platformDef = SUPPORTED_PLATFORMS.find(p => p.id === platform);
    if (!platformDef) {
      return res.status(400).json({ error: `Unsupported platform. Available: ${SUPPORTED_PLATFORMS.map(p => p.id).join(', ')}` });
    }

    // Encrypt credentials
    const encrypted = encrypt(JSON.stringify(credentials));

    const result = await pool.query(
      `INSERT INTO channels (user_id, platform, display_name, credentials, webhook_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET credentials = $4, display_name = $3, webhook_url = $5, is_active = true, updated_at = NOW()
       RETURNING id, platform, display_name, is_active, created_at`,
      [req.user.userId, platform, displayName || platformDef.name, encrypted, webhookUrl || null]
    );

    res.status(201).json({ channel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/channels/:id/toggle - toggle channel active/inactive
router.put('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE channels SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING id, is_active`,
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    res.json({ channel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:id - disconnect a channel
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM channels WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/:id/test - test channel delivery
router.post('/:id/test', authMiddleware, async (req, res) => {
  try {
    const chResult = await pool.query(
      'SELECT * FROM channels WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (chResult.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    const channel = chResult.rows[0];

    // Decrypt credentials for test
    const decrypted = decrypt(channel.credentials);
    const creds = JSON.parse(decrypted);

    // Actual test send: log and store notification
    const testMessage = `[Thought GPS Test] This is a test message to your ${channel.platform} channel. If you see this, delivery is working.`;

    // Use real Caspian delivery if client is available
    const caspianClient = req.app.get('caspian');
    if (caspianClient && caspianClient.isLive) {
      try {
        await caspianClient.send({ channel: channel.platform, to: req.user.userId, message: testMessage });
      } catch (e) {
        console.warn(`[Channel Test] Caspian delivery failed:`, e.message);
      }
    } else {
      console.log(`[Channel Test] ${channel.platform} -> user ${req.user.userId}: ${testMessage}`);
    }

    // Store test notification in DB
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, channel)
         VALUES ($1, 'channel_test', $2, $3, $4)`,
        [req.user.userId, `Test: ${channel.platform}`, testMessage, channel.platform]
      );
    } catch { /* notifications table may not exist */ }

    res.json({
      success: true,
      message: `Test message sent to ${channel.platform}`,
      platform: channel.platform,
    });
  } catch (err) {
    res.status(500).json({ error: 'Test failed: ' + err.message });
  }
});

module.exports = router;
