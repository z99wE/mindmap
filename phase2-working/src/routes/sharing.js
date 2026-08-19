/**
 * SHARING ROUTES — Collaborative Memory Graphs
 * 
 * Allows users to share individual memories with other users.
 * Enables couples, co-founders, and accountability pairs.
 * 
 * Zero additional infrastructure cost — uses existing Postgres.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

// GET /api/sharing — list memories shared WITH me
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sm.id, sm.permission, sm.created_at as shared_at,
              m.id as memory_id, m.content, m.category, m.importance,
              m.status, m.created_at,
              u.email as owner_email
       FROM shared_memories sm
       JOIN memory_graph m ON m.id = sm.memory_id
       JOIN users u ON u.id = sm.owner_id
       WHERE sm.shared_with_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 100`,
      [req.user.userId]
    );
    res.json({ shared: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sharing/outgoing — memories I've shared with others
router.get('/outgoing', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sm.id, sm.permission, sm.created_at as shared_at,
              m.id as memory_id, m.content, m.category,
              u.email as shared_with_email
       FROM shared_memories sm
       JOIN memory_graph m ON m.id = sm.memory_id
       JOIN users u ON u.id = sm.shared_with_id
       WHERE sm.owner_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 100`,
      [req.user.userId]
    );
    res.json({ shared: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sharing/share — share a memory with another user
router.post('/share', authMiddleware, async (req, res) => {
  try {
    const { memoryId, email, permission = 'view' } = req.body;
    if (!memoryId || !email) {
      return res.status(400).json({ error: 'memoryId and email are required' });
    }

    // Find target user by email
    const targetRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with that email' });
    }
    const targetId = targetRes.rows[0].id;
    if (targetId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot share with yourself' });
    }

    // Verify memory belongs to current user
    const memRes = await pool.query(
      'SELECT id FROM memory_graph WHERE id = $1 AND user_id = $2',
      [memoryId, req.user.userId]
    );
    if (memRes.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    await pool.query(
      `INSERT INTO shared_memories (owner_id, shared_with_id, memory_id, permission)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (owner_id, shared_with_id, memory_id)
       DO UPDATE SET permission = $4, created_at = NOW()
       RETURNING id`,
      [req.user.userId, targetId, memoryId, permission]
    );

    // Log analytics event (anonymized)
    await pool.query(
      `INSERT INTO analytics_events (event_type, metadata)
       VALUES ('memory_shared', $1)`,
      [JSON.stringify({ permission })]
    ).catch(() => {});

    res.json({ success: true, sharedWith: email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sharing/:id — remove a share
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM shared_memories WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sharing/partners — find users to share with (by email prefix)
router.get('/partners', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.json({ users: [] });
    }
    const result = await pool.query(
      `SELECT id, email FROM users
       WHERE email ILIKE $1 AND id != $2
       LIMIT 10`,
      [`%${q}%`, req.user.userId]
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
