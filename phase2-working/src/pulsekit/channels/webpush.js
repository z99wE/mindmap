/**
 * PulseKit — WebPush Channel Driver
 * Uses the VAPID keys already set up in server.js.
 * Sends browser push notifications to subscribed users.
 * 100% free — no external service, all traffic goes directly to browsers.
 */

'use strict';

function createWebPushChannel({ webpush, vapidKeys, pool }) {
  return {
    name: 'webpush',

    async init() {
      if (!vapidKeys?.publicKey) throw new Error('VAPID keys missing');
      // webpush is already configured in server.js — just validate
      console.log('[PulseKit:WebPush] VAPID keys loaded');
    },

    /**
     * Send a push notification to a user (looked up from DB by userId).
     * `to` is a user UUID — subscriptions are fetched from the DB.
     */
    async send({ to, message, title }) {
      const payload = JSON.stringify({
        title: title || 'Mentally',
        body: message.slice(0, 200),
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: 'cognitive-nudge',
        data: { url: '/' },
        vibrate: [100, 50, 100],
      });

      // Load subscriptions for this user (stored in users.notification_prefs)
      let subscriptions = [];
      try {
        const result = await pool.query(
          "SELECT notification_prefs->'pushSubscription' as sub FROM users WHERE id = $1",
          [to]
        );
        subscriptions = result.rows
          .map(r => r.sub)
          .filter(s => s && s.endpoint);
      } catch {
        // Table may not exist yet
      }

      if (subscriptions.length === 0) {
        throw new Error('No push subscriptions for user');
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => {
          const parsed = typeof sub === 'string' ? JSON.parse(sub) : sub;
          return webpush.sendNotification(parsed, payload);
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      if (succeeded === 0) throw new Error('All push subscriptions failed');
    },

    // WebPush is outbound-only
    onMessage(_handler) { /* no-op */ },
    async startPolling() { /* no-op */ },
    async destroy() { /* no-op */ },
  };
}

module.exports = { createWebPushChannel };
