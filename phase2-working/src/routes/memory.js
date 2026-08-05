// Memory Routes - CRUD for memory graph
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { logAudit } = require('../middleware');

// In-memory confirmation tokens for account deletion (expires in 5 min)
const deletionTokens = new Map();

// GET /api/memory - list user's memories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, category } = req.query;
    let query = 'SELECT * FROM memory_graph WHERE user_id = $1';
    const params = [req.user.userId];
    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM memory_graph WHERE user_id = $1',
      [req.user.userId]
    );
    res.json({
      memories: result.rows.map(r => ({
        id: r.id,
        content: r.content,
        source: r.source,
        category: r.category,
        importance: r.importance,
        halfLifeHours: r.half_life_hours,
        urgencyTier: r.urgency_tier,
        status: r.status,
        archived: r.archived,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/stats - memory statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [totalRes, catRes, statusRes, activeRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM memory_graph WHERE user_id = $1', [userId]),
      pool.query('SELECT category, COUNT(*) as count FROM memory_graph WHERE user_id = $1 GROUP BY category ORDER BY count DESC', [userId]),
      pool.query('SELECT status, COUNT(*) as count FROM memory_graph WHERE user_id = $1 GROUP BY status', [userId]),
      pool.query('SELECT COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND status = $2', [userId, 'pending']),
    ]);
    res.json({
      total: parseInt(totalRes.rows[0].count),
      active: parseInt(activeRes.rows[0]?.count || 0),
      byCategory: catRes.rows,
      byStatus: statusRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/search - semantic search
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    // Text-based search (embedding search handled by orchestrator)
    const result = await pool.query(
      `SELECT * FROM memory_graph
       WHERE user_id = $1 AND (content ILIKE $2 OR category ILIKE $2)
       ORDER BY importance DESC, created_at DESC
       LIMIT $3`,
      [req.user.userId, `%${q}%`, parseInt(limit)]
    );
    res.json({ results: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memory - create a memory
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, category, importance, metadata, witness_contact } = req.body;
    const text = content;
    if (!text) return res.status(400).json({ error: 'Content is required' });
    const result = await pool.query(
      `INSERT INTO memory_graph (user_id, content, category, importance, witness_contact)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.userId, text, category || 'general', importance || 0.5, witness_contact || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/memory/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM memory_graph WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/memory/:id/complete - mark as complete
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE memory_graph SET status = 'completed', archived = true WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/:id/traces - Get cognitive trace for a thought
router.get('/:id/traces', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT span_name, input, output, status, created_at, ended_at FROM thought_traces WHERE thought_id = $1 AND user_id = $2 ORDER BY created_at ASC',
      [req.params.id, req.user.userId]
    );
    res.json({ traces: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/export - export all memories as JSON or CSV
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { format = 'json', category, status } = req.query;
    let query = 'SELECT id, content, category, importance, intent, half_life_hours, urgency_tier, action_verb, is_actionable, expires_at, status, archived, witness_contact, created_at FROM memory_graph WHERE user_id = $1';
    const params = [req.user.userId];
    if (category) { query += ` AND category = $${params.length + 1}`; params.push(category); }
    if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);

    if (format === 'csv') {
      const header = 'id,content,category,half_life_hours,urgency_tier,status,created_at\n';
      const rows = result.rows.map(r =>
        `"${r.id}","${(r.content || '').replace(/"/g, '""')}","${r.category || ''}",${r.half_life_hours || ''},"${r.urgency_tier || ''}","${r.status || ''}","${r.created_at}"`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=thought-gps-export.csv');
      return res.send(header + rows);
    }
    res.json({
      memories: result.rows.map(r => ({
        id: r.id,
        content: r.content,
        category: r.category,
        halfLifeHours: r.half_life_hours,
        urgencyTier: r.urgency_tier,
        actionVerb: r.action_verb,
        isActionable: r.is_actionable,
        status: r.status,
        archived: r.archived,
        witnessContact: r.witness_contact,
        createdAt: r.created_at,
      })),
      exportedAt: new Date().toISOString(),
      total: result.rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/knowledge-graph - graph data for visualization
router.get('/knowledge-graph', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, category, brain_area, emotional_tone, importance,
              half_life_hours, decay_status, created_at
       FROM memory_graph WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [req.user.userId]
    );
    // Build graph nodes and edges
    const nodes = result.rows.map(r => ({
      id: r.id,
      label: r.content.substring(0, 60),
      category: r.category,
      brainArea: r.brain_area,
      importance: r.importance,
      decayStatus: r.decay_status,
    }));
    // Simple edge: connect memories in same category
    const edges = [];
    const byCat = {};
    result.rows.forEach(r => {
      if (!byCat[r.category]) byCat[r.category] = [];
      byCat[r.category].push(r.id);
    });
    for (const ids of Object.values(byCat)) {
      for (let i = 0; i < ids.length - 1; i++) {
        edges.push({ source: ids[i], target: ids[i + 1] });
      }
    }
    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GDPR: Export ALL user data ───────────────────────────────────────────────
router.get('/export-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [memories, channels, notifications, billing, user] = await Promise.all([
      pool.query('SELECT * FROM memory_graph WHERE user_id = $1 ORDER BY created_at', [userId]),
      pool.query('SELECT id, platform, display_name, is_active, created_at FROM channels WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY sent_at', [userId]),
      pool.query('SELECT type, amount, currency, runs_credited, status, created_at FROM billing_transactions WHERE user_id = $1', [userId]),
      pool.query('SELECT id, tier, daily_runs_limit, total_credits, notification_prefs, witness_contacts, subscription_status, created_at FROM users WHERE id = $1', [userId]),
    ]);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=thought-gps-full-export.json');
    res.json({
      exportedAt: new Date().toISOString(),
      user: user.rows[0] || null,
      memories: memories.rows,
      channels: channels.rows,
      notifications: notifications.rows,
      billing: billing.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GDPR: Request account deletion (step 1: get confirmation token) ──────────
router.post('/account/delete-request', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    deletionTokens.set(token, { userId, createdAt: Date.now() });
    // Auto-expire after 5 minutes
    setTimeout(() => deletionTokens.delete(token), 300000);
    res.json({
      confirmationToken: token,
      expiresIn: 300,
      message: 'Call DELETE /api/memory/account with this token to permanently delete your account.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GDPR: Delete account (step 2: confirm with token) ────────────────────────
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { confirmationToken } = req.body;
    const userId = req.user.userId;

    if (!confirmationToken) {
      return res.status(400).json({ error: 'Confirmation token required. Call POST /api/memory/account/delete-request first.' });
    }

    const tokenData = deletionTokens.get(confirmationToken);
    if (!tokenData || tokenData.userId !== userId) {
      return res.status(400).json({ error: 'Invalid or expired confirmation token' });
    }

    // Check token not expired (5 min)
    if (Date.now() - tokenData.createdAt > 300000) {
      deletionTokens.delete(confirmationToken);
      return res.status(400).json({ error: 'Token expired. Request a new one.' });
    }

    // Cascading soft-delete: remove all user data
    await pool.query('DELETE FROM memory_graph WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM channels WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM billing_transactions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM api_key_log WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [userId]);

    // Soft-delete user account (preserve row for referential integrity)
    await pool.query(
      `UPDATE users SET email = $1, password_hash = 'DELETED', tier = 'free',
       api_keys = '{}', notification_prefs = '{}', witness_contacts = '[]',
       daily_runs_used = 0, daily_runs_limit = 0, total_credits = 0,
       subscription_status = 'deleted', updated_at = NOW()
       WHERE id = $2`,
      [`deleted_${userId}@removed.local`, userId]
    );

    deletionTokens.delete(confirmationToken);

    await logAudit({
      userId,
      action: 'ACCOUNT_DELETED',
      resourceType: 'users',
      resourceId: userId,
      ipAddress: req.ip || 'unknown',
    });

    res.json({ success: true, message: 'Account and all data permanently deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shared deletion-token helpers (used by routes/auth.js DELETE /account) ───
function verifyDeletionToken(token, userId) {
  const data = deletionTokens.get(token);
  if (!data || data.userId !== userId) return null;
  if (Date.now() - data.createdAt > 300000) {
    deletionTokens.delete(token);
    return null;
  }
  return data;
}

function consumeDeletionToken(token) {
  deletionTokens.delete(token);
}

module.exports = router;
module.exports.verifyDeletionToken = verifyDeletionToken;
module.exports.consumeDeletionToken = consumeDeletionToken;
module.exports.requestDeletionToken = (userId) => {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  deletionTokens.set(token, { userId, createdAt: Date.now() });
  setTimeout(() => deletionTokens.delete(token), 300000);
  return token;
};
