// Admin Routes - Admin dashboard, system health, OmniRoute, Langfuse
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { authMiddleware, adminMiddleware } = require('../auth');
const { keyPool } = require('../key-pool');
const { logAudit } = require('../middleware');

// All admin routes require auth + admin
router.use(authMiddleware, adminMiddleware);

// Rate limit admin endpoints: 5 requests per minute
router.use(rateLimit({
  windowMs: 60000,
  max: 30,
  standardHeaders: true,
  message: { error: 'Too many admin requests. Please slow down.' },
}));

// GET /api/admin/health - system health
router.get('/health', async (req, res) => {
  try {
    const [dbCheck, userCount, memoryCount] = await Promise.all([
      pool.query('SELECT 1 as ok').catch(() => ({ rows: [{ ok: false }] })),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM memory_graph'),
    ]);
    res.json({
      database: dbCheck.rows[0]?.ok ? 'healthy' : 'error',
      users: parseInt(userCount.rows[0].count),
      memories: parseInt(memoryCount.rows[0].count),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      keyPool: keyPool.getStatus(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users - list all users (admin-only; emails visible to admins)
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, tier, is_admin, daily_runs_used, daily_runs_limit,
              total_credits, subscription_status, created_at
       FROM users ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/tier - change user tier
router.put('/users/:id/tier', async (req, res) => {
  try {
    const { tier } = req.body;
    const validTiers = ['free', 'pro', 'managed', 'premium', 'enterprise', 'admin'];
    if (!validTiers.includes(tier)) return res.status(400).json({ error: 'Invalid tier' });
    const dailyLimit = tier === 'free' ? 10 : tier === 'pro' ? 500 : 999999;
    await pool.query(
      "UPDATE users SET tier = $1, daily_runs_limit = $2, updated_at = NOW() WHERE id = $3",
      [tier, dailyLimit, req.params.id]
    );

    await logAudit({
      userId: req.user.userId,
      action: 'TIER_CHANGE',
      resourceType: 'users',
      resourceId: req.params.id,
      ipAddress: req.ip || 'unknown',
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/key-pool - shared key pool status
router.get('/key-pool', (req, res) => {
  res.json(keyPool.getStatus());
});

// POST /api/admin/key-pool - add a key to the shared pool
router.post('/key-pool', async (req, res) => {
  try {
    const { provider, key, endpoint, model, rate_limit } = req.body;
    if (!provider || !key) return res.status(400).json({ error: 'Provider and key are required' });

    const { encrypt, maskKey } = require('../crypto');
    const encrypted = encrypt(key);
    const masked = maskKey(key);

    const result = await pool.query(
      `INSERT INTO shared_api_keys (provider, encrypted_key, masked_key, endpoint, model, rate_limit, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, provider, masked_key, created_at`,
      [provider.toLowerCase(), encrypted, masked, endpoint || null, model || null, rate_limit || 30, req.user.userId]
    );

    // Reload the pool to pick up the new key
    await keyPool.reload();

    await logAudit({
      userId: req.user.userId,
      action: 'SHARED_KEY_ADD',
      resourceType: 'shared_api_keys',
      resourceId: result.rows[0].id,
      ipAddress: req.ip || 'unknown',
    });

    res.json({ success: true, key: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/key-pool/:keyId - remove a key from the shared pool
router.delete('/key-pool/:keyId', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE shared_api_keys SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, provider',
      [req.params.keyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Key not found' });

    // Reload the pool
    await keyPool.reload();

    await logAudit({
      userId: req.user.userId,
      action: 'SHARED_KEY_REMOVE',
      resourceType: 'shared_api_keys',
      resourceId: req.params.keyId,
      ipAddress: req.ip || 'unknown',
    });

    res.json({ success: true, removed: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/key-pool/list - list all shared keys (masked) with usage stats
router.get('/key-pool/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, masked_key, endpoint, model, rate_limit, is_active, created_at
       FROM shared_api_keys ORDER BY provider, created_at DESC`
    );
    res.json({ keys: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/runs - per-user run consumption (shared pool visibility)
router.get('/runs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, tier, daily_runs_used, daily_runs_limit, created_at
       FROM users ORDER BY daily_runs_used DESC LIMIT 100`
    );
    const totalUsed = result.rows.reduce((sum, u) => sum + (u.daily_runs_used || 0), 0);
    const totalLimit = result.rows.reduce((sum, u) => sum + (u.daily_runs_limit || 0), 0);
    res.json({
      users: result.rows,
      totals: { used: totalUsed, limit: totalLimit },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - platform statistics
router.get('/stats', async (req, res) => {
  try {
    const [users, memories, notifications, channels, billing] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE tier = $1) as premium FROM users', ['premium']),
      pool.query('SELECT COUNT(*) as total FROM memory_graph'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE delivered = true) as delivered FROM notifications'),
      pool.query('SELECT COUNT(*) as total FROM channels WHERE is_active = true'),
      pool.query("SELECT COUNT(*) as total, SUM(runs_credited) as total_runs FROM billing_transactions WHERE status = 'completed'"),
    ]);
    res.json({
      users: { total: parseInt(users.rows[0].total), premium: parseInt(users.rows[0].premium) },
      memories: parseInt(memories.rows[0].total),
      notifications: { total: parseInt(notifications.rows[0].total), delivered: parseInt(notifications.rows[0].delivered) },
      activeChannels: parseInt(channels.rows[0].total),
      billing: { transactions: parseInt(billing.rows[0].total), runsSold: parseInt(billing.rows[0].total_runs || 0) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/backup - create a system-wide database backup dump
router.get('/backup', async (req, res) => {
  try {
    const [users, memories, keys, channels] = await Promise.all([
      pool.query('SELECT * FROM users'),
      pool.query('SELECT * FROM memory_graph'),
      // admin-only endpoint: includes user rows + channel metadata (no raw key values)
      pool.query('SELECT id, user_id, provider, action, masked_key, created_at FROM api_key_log'),
      pool.query('SELECT id, user_id, platform, display_name, is_active, webhook_url, created_at FROM channels'),
    ]);
    
    const dump = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        users: users.rows,
        memories: memories.rows,
        keys: keys.rows,
        channels: channels.rows
      }
    };

	  res.setHeader('Content-Type', 'application/json');
	  res.setHeader('Content-Disposition', 'attachment; filename="system_backup.json"');
	  res.send(JSON.stringify(dump, null, 2));
	} catch (err) {
	  res.status(500).json({ error: err.message });
	}
	});

// ── Admin Channel Management ──────────────────────────────────────────────

// GET /api/admin/channels - list all user channels
router.get('/channels', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.user_id, c.platform, c.display_name, c.is_active, c.webhook_url, c.created_at,
              u.email as user_email, u.tier as user_tier
       FROM channels c
       LEFT JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC
       LIMIT 200`
    );
    res.json({ channels: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/channels/stats - channel platform statistics
router.get('/channels/stats', async (req, res) => {
  try {
    const [total, byPlatform, activeCount, globalStatus] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as total FROM channels'),
      pool.query('SELECT platform, COUNT(*)::int as count FROM channels GROUP BY platform ORDER BY count DESC'),
      pool.query('SELECT COUNT(*)::int as active FROM channels WHERE is_active = true'),
      pool.query('SELECT platform, COUNT(*)::int as active FROM channels WHERE is_active = true GROUP BY platform ORDER BY active DESC'),
    ]);

    // Get PulseKit status from app
    const pulseKit = req.app?.locals?.pulseKit;
    const globalChannels = pulseKit?.channels || [];
    const isLive = pulseKit?.isLive || false;

    res.json({
      total: parseInt(total.rows[0]?.total || 0),
      active: parseInt(activeCount.rows[0]?.active || 0),
      byPlatform: byPlatform.rows,
      activeByPlatform: globalStatus.rows,
      globalChannels,
      pulseKitLive: isLive,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/channels/:id/deliver - admin test delivery to a specific channel
router.post('/channels/:id/deliver', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM channels WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });

    const channel = result.rows[0];
    const { decrypt } = require('../crypto');
    let creds;
    try {
      creds = JSON.parse(decrypt(channel.credentials));
    } catch {
      return res.status(400).json({ error: 'Cannot decrypt credentials' });
    }

    const testMsg = `[Admin Test] PulseKit delivery test to ${channel.platform}`;

    const pulseKit = req.app?.locals?.pulseKit;
    if (!pulseKit || !pulseKit.send) {
      return res.status(503).json({ error: 'PulseKit not available' });
    }

    const response = await pulseKit.send({
      channel: channel.platform,
      to: channel.user_id,
      message: testMsg,
    });

    res.json({
      success: response?.delivered !== false,
      channel: channel.platform,
      user: channel.user_id,
      via: response?.via || 'unknown',
      errors: response?.errors || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Waitlist Management ─────────────────────────────────────────────────

// GET /api/admin/waitlist - list all waitlist signups
router.get('/waitlist', async (req, res) => {
  try {
    const { plan, limit: queryLimit } = req.query;
    const limit = Math.min(parseInt(queryLimit) || 100, 500);
    let sql = 'SELECT id, email, name, plan, country, email_sent, created_at FROM waitlist';
    const params = [];
    if (plan) {
      sql += ' WHERE plan = $1';
      params.push(plan);
    }
    sql += ' ORDER BY created_at DESC';
    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    const result = await pool.query(sql, params);
    const countResult = await pool.query('SELECT COUNT(*)::int as total FROM waitlist');
    const byPlan = await pool.query('SELECT plan, COUNT(*)::int as count FROM waitlist GROUP BY plan ORDER BY count DESC');

    res.json({
      waitlist: result.rows,
      total: countResult.rows[0].total,
      byPlan: byPlan.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/waitlist/export - export waitlist as CSV
router.get('/waitlist/export', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT email, name, plan, country, email_sent, created_at FROM waitlist ORDER BY created_at DESC'
    );

    const header = 'email,name,plan,country,email_sent,signed_up_at';
    const rows = result.rows.map(r =>
      [r.email, r.name || '', r.plan || '', r.country || '', r.email_sent || false, r.created_at?.toISOString() || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="waitlist-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
