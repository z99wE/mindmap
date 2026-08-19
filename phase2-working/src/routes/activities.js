/**
 * ACTIVITIES ROUTES — Attention Layer / Recent Activity Feed
 * 
 * Tracks recent cognitive activities for display in:
 * - Dashboard quick glance
 * - Browser extension popup
 * - Mobile widget
 * 
 * Activities include: thought captured, commitment made, nudge sent,
 * deadline approaching, pattern detected.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

// GET /api/activities — recent activities
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT id, activity_type, title, summary, metadata, is_read, created_at
       FROM recent_activities
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.userId, parseInt(limit)]
    );
    // Get unread count
    const countRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM recent_activities WHERE user_id = $1 AND is_read = false',
      [req.user.userId]
    );
    res.json({
      activities: result.rows,
      unreadCount: countRes.rows[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/activities/read — mark activity as read
router.put('/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (id) {
      await pool.query(
        'UPDATE recent_activities SET is_read = true WHERE id = $1 AND user_id = $2',
        [id, req.user.userId]
      );
    } else {
      await pool.query(
        'UPDATE recent_activities SET is_read = true WHERE user_id = $1',
        [req.user.userId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activities/unread-count — quick unread count (for extensions)
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int as count FROM recent_activities WHERE user_id = $1 AND is_read = false',
      [req.user.userId]
    );
    res.json({ count: result.rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Utility: Create an activity record (called from other modules)
async function createActivity(userId, type, title, summary = '', metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO recent_activities (user_id, activity_type, title, summary, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, summary, JSON.stringify(metadata)]
    );
  } catch { /* non-critical */ }
}

module.exports = router;
module.exports.createActivity = createActivity;
