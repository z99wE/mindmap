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

module.exports = router;
