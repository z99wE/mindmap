// Notification Routes - History + preferences + push subscriptions
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { getNotifications, markRead, markAllRead } = require('../notifications');

// Resolve the shared webpush instance (configured in server.js).
// Preferred path: read from req.app.locals — no circular require. The lazy
// require is kept only as a fallback for callers without a req (sendWebPush).
function getWebpush(req) {
  const locals = req?.app?.locals;
  if (locals?.webpush) return { webpush: locals.webpush, vapidKeys: locals.vapidKeys };
  try {
    const serverModule = require('../../server');
    const vapidKeys = serverModule?.vapidKeys || serverModule?.getSharedVapid?.()?.vapidKeys;
    const webpush = serverModule?.webpush || serverModule?.getSharedVapid?.()?.webpush;
    return { webpush, vapidKeys };
  } catch { return { webpush: null, vapidKeys: null }; }
}

// GET /api/notifications/vapid-public-key - returns VAPID public key (no auth needed)
router.get('/vapid-public-key', (req, res) => {
  const { vapidKeys } = getWebpush(req);
  if (!vapidKeys) return res.status(500).json({ error: 'VAPID not configured' });
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST /api/notifications/subscribe - store push subscription
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    // Store in users.notification_prefs JSONB
    await pool.query(
      `UPDATE users SET notification_prefs = jsonb_set(
        COALESCE(notification_prefs, '{}'::jsonb),
        '{pushSubscription}',
        $2::jsonb
      ) WHERE id = $1`,
      [req.user.userId, JSON.stringify(subscription)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/unsubscribe - remove push subscription
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET notification_prefs = (COALESCE(notification_prefs, '{}'::jsonb) - 'pushSubscription') WHERE id = $1`,
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ── Helper: Send web push to a user ────────────────────────────────────
async function sendWebPush(userId, payload) {
  try {
    const { webpush } = getWebpush(null);
    if (!webpush) return;
    const result = await pool.query(
      "SELECT notification_prefs->'pushSubscription' as sub FROM users WHERE id = $1",
      [userId]
    );
    const sub = result.rows[0]?.sub;
    if (!sub?.endpoint) return;
    await webpush.sendNotification(sub, JSON.stringify(payload)).catch(async (err) => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired/gone — clean up
        await pool.query(
          `UPDATE users SET notification_prefs = (COALESCE(notification_prefs, '{}'::jsonb) - 'pushSubscription') WHERE id = $1`,
          [userId]
        );
      }
    });
  } catch { /* push failure is non-fatal */ }
}
module.exports.sendWebPush = sendWebPush;
