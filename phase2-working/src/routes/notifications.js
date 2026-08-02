// Notification Routes - History + preferences
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { getNotifications, markRead, markAllRead } = require('../notifications');

// GET /api/notifications - list notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread } = req.query;
    const result = await getNotifications(req.user.userId, parseInt(limit), parseInt(offset), unread === 'true');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read - mark as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await markRead(req.user.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all - mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await markAllRead(req.user.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count - quick unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
