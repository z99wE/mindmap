// Notification System - store and deliver notifications
const { pool } = require('./db');

const NOTIFICATION_TYPES = [
  'half_life_nudge',
  'commitment_witness',
  'departure_alert',
  'drift_nudge',
  'door_rule',
  'thought_revival',
  'run_limit_warning',
  'system',
];

// Create a notification record
async function createNotification(userId, type, title, message, channel = 'browser', metadata = {}) {
  if (!NOTIFICATION_TYPES.includes(type)) type = 'system';
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, channel, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, type, title, message, channel, delivered, read, sent_at`,
    [userId, type, title, message, channel, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

// Get user's notifications (paginated)
async function getNotifications(userId, limit = 50, offset = 0, unreadOnly = false) {
  const whereClause = unreadOnly ? 'AND read = false' : '';
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ${whereClause}
     ORDER BY sent_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 ${whereClause}`,
    [userId]
  );
  return {
    notifications: result.rows,
    total: parseInt(countResult.rows[0].total),
    unread: (await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    )).rows[0].count,
  };
}

// Mark notification as read
async function markRead(userId, notificationId) {
  await pool.query(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
}

// Mark all as read
async function markAllRead(userId) {
  await pool.query(
    'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
    [userId]
  );
}

// Attempt to deliver via Caspian SDK (if channel configured)
async function deliverViaCaspian(userId, notification, caspianClient) {
  if (!caspianClient) return false;
  try {
    const channels = await pool.query(
      'SELECT * FROM channels WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    if (channels.rows.length === 0) return false;

    // Try each active channel
    for (const ch of channels.rows) {
      try {
        await caspianClient.send({ channel: ch.platform, to: userId, message: notification.message });
        await pool.query(
          'UPDATE notifications SET delivered = true WHERE id = $1',
          [notification.id]
        );
        return true;
      } catch (e) {
        console.error(`[Notify] Caspian send failed for ${ch.platform}:`, e.message);
      }
    }
    return false;
  } catch (e) {
    console.error('[Notify] Delivery error:', e.message);
    return false;
  }
}

module.exports = {
  NOTIFICATION_TYPES, createNotification, getNotifications,
  markRead, markAllRead, deliverViaCaspian,
};
