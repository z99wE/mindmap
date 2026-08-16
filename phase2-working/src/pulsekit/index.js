/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  PULSEKIT  —  ThoughtGPS Native Communication Kernel                ║
 * ║                                                                      ║
 * ║  A zero-dependency, self-owned replacement for Caspian SDK.          ║
 * ║  Every user gets delivery. No third-party SDK can take it down.      ║
 * ║                                                                      ║
 * ║  Architecture:                                                       ║
 * ║    send() → ChannelRouter → [Telegram|Email|Discord|Slack|WebPush]   ║
 * ║           ↘ QueueManager (retry, backoff, dedup)                    ║
 * ║           ↘ DB notification store (always wins)                     ║
 * ║                                                                      ║
 * ║  Design goals:                                                       ║
 * ║    • 100% free channels only by default                              ║
 * ║    • Multi-tenant: each user brings their own bot tokens             ║
 * ║    • Smart routing: picks best available channel per user            ║
 * ║    • Retry queue with exponential backoff                            ║
 * ║    • Inbound message handler (replies, commands)                     ║
 * ║    • Graceful degradation to DB-only if everything else fails        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const { createTelegramChannel } = require('./channels/telegram');
const { createEmailChannel }    = require('./channels/email');
const { createDiscordChannel }  = require('./channels/discord');
const { createSlackChannel }    = require('./channels/slack');
const { createWhatsappChannel } = require('./channels/whatsapp');
const { createWebPushChannel }  = require('./channels/webpush');
const { PulseQueue }            = require('./queue');
const { decrypt }               = require('../crypto');

// ── Channel priority order (free first, most reliable first) ─────────────────
const CHANNEL_PRIORITY = ['telegram', 'discord', 'slack', 'email', 'webpush', 'browser'];

// ── Channels that require paid API plans (blocked unless opted-in) ────────────
const PAID_CHANNELS = new Set(['whatsapp', 'sms', 'x', 'twitter', 'voice', 'phone', 'imessage']);

/**
 * Create a PulseKit messaging adapter.
 * 
 * @param {import('pg').Pool} dbPool
 * @param {object} webpushModule  - The web-push npm module (injected from server.js)
 * @param {object} vapidKeys      - { publicKey, privateKey }
 * @returns {object} PulseKit adapter
 */
async function createPulseKit(dbPool, webpushModule, vapidKeys) {
  const _pool = dbPool;

  // ── Initialize built-in global channels ──────────────────────────────────
  const globalChannels = new Map(); // channelName → channel driver instance
  const inboundHandlers = [];
  const queue = new PulseQueue();

  // Telegram global bot (if configured)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const tg = createTelegramChannel({ botToken: process.env.TELEGRAM_BOT_TOKEN });
      await tg.init();
      globalChannels.set('telegram', tg);
      console.log('[PulseKit] ✅ Telegram global bot ready');
    } catch (e) {
      console.warn('[PulseKit] Telegram init failed:', e.message);
    }
  }

  // Discord global bot (if configured)
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const dc = createDiscordChannel({ token: process.env.DISCORD_BOT_TOKEN });
      await dc.init();
      globalChannels.set('discord', dc);
      console.log('[PulseKit] ✅ Discord global bot ready');
    } catch (e) {
      console.warn('[PulseKit] Discord init failed:', e.message);
    }
  }

  // Slack global bot (or webhook-only listener if no token)
  try {
    const sl = createSlackChannel({ token: process.env.SLACK_BOT_TOKEN || null });
    await sl.init();
    globalChannels.set('slack', sl);
  } catch (e) {
    console.warn('[PulseKit] Slack init failed:', e.message);
  }

  // WhatsApp global listener (webhook-only if no token)
  try {
    const wa = createWhatsappChannel({ token: null, phoneId: null });
    await wa.init();
    globalChannels.set('whatsapp', wa);
  } catch (e) {
    console.warn('[PulseKit] WhatsApp init failed:', e.message);
  }

  // Email (SMTP / nodemailer)
  if (process.env.SMTP_HOST || process.env.SMTP_USER) {
    try {
      const em = createEmailChannel({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
      });
      await em.init();
      globalChannels.set('email', em);
      console.log('[PulseKit] ✅ Email (SMTP) ready');
    } catch (e) {
      console.warn('[PulseKit] Email init failed:', e.message);
    }
  }

  // Web Push (always available if VAPID keys are present)
  if (webpushModule && vapidKeys) {
    try {
      const wp = createWebPushChannel({ webpush: webpushModule, vapidKeys, pool: _pool });
      await wp.init();
      globalChannels.set('webpush', wp);
      console.log('[PulseKit] ✅ WebPush ready');
    } catch (e) {
      console.warn('[PulseKit] WebPush init failed:', e.message);
    }
  }

  console.log(`[PulseKit] Live with ${globalChannels.size} global channel(s): [${[...globalChannels.keys()].join(', ')}]`);

  // ── Helper: load user's custom channel credentials from DB ───────────────
  async function getUserChannels(userId) {
    try {
      const result = await _pool.query(
        'SELECT platform, credentials, display_name FROM channels WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      return result.rows.map(row => {
        try {
          const creds = JSON.parse(decrypt(row.credentials));
          return { platform: row.platform.toLowerCase(), creds, displayName: row.display_name };
        } catch {
          return null;
        }
      }).filter(Boolean);
  // ── Helper: get or create a per-user channel driver (cached in memory) ────
  const userDriverCache = new Map(); // `${userId}_${platform}` → driver

  async function getUserDriver(userId, platform, creds) {
    const key = `${userId}_${platform}`;
    if (userDriverCache.has(key)) return userDriverCache.get(key);

    let driver = null;
    try {
      if (platform === 'telegram' && creds.bot_token) {
        driver = createTelegramChannel({ botToken: creds.bot_token });
        await driver.init();
      } else if (platform === 'discord' && creds.bot_token) {
        driver = createDiscordChannel({ token: creds.bot_token });
        await driver.init();
      } else if (platform === 'slack' && creds.bot_token) {
        driver = createSlackChannel({ token: creds.bot_token });
        await driver.init();
      } else if (platform === 'email' && creds.smtp_host) {
        driver = createEmailChannel({
          host: creds.smtp_host, port: creds.smtp_port || 587,
          user: creds.smtp_user, pass: creds.smtp_pass,
          from: creds.smtp_from || creds.smtp_user,
        });
        await driver.init();
      } else if (platform === 'whatsapp' && creds.bot_token && creds.chat_id) {
        driver = createWhatsappChannel({ token: creds.bot_token, phoneId: creds.chat_id });
        await driver.init();
      }

      if (driver) {
        // Automatically wire up inbound handling for newly instantiated drivers
        if (typeof driver.onMessage === 'function') {
          driver.onMessage(async (msg) => {
            for (const handler of inboundHandlers) {
              try {
                await handler({ from: msg.from, message: msg.text, channel: platform, reply: msg.reply });
              } catch (e) {
                console.error(`[PulseKit] User inbound handler error on ${platform}:`, e.message);
              }
            }
          });
        }
        // Auto-start polling if the channel requires it (WebSockets / long-polling)
        if (typeof driver.startPolling === 'function') {
          driver.startPolling().catch(e => console.warn(`[PulseKit] Polling failed to start for ${platform}:`, e.message));
        }
        
        userDriverCache.set(key, driver);
      }
    } catch (e) {
      console.warn(`[PulseKit] Failed to init user driver ${platform} for ${userId}:`, e.message);
    }

    return driver;
  }

  // ── Core: store notification in DB (always wins) ──────────────────────────
  async function storeNotification(userId, channel, title, message, metadata = {}) {
    try {
      await _pool.query(
        `INSERT INTO notifications (user_id, type, title, message, channel, metadata)
         VALUES ($1, 'cognitive_nudge', $2, $3, $4, $5)`,
        [userId, title || `Nudge via ${channel}`, message, channel, JSON.stringify(metadata)]
      );
    } catch { /* DB may not be ready */ }
  }

  // ── Core: mark notification delivered ────────────────────────────────────
  async function markDelivered(notificationId) {
    if (!notificationId) return;
    try {
      await _pool.query(
        'UPDATE notifications SET delivered = true WHERE id = $1',
        [notificationId]
      );
    } catch { /* ignore */ }
  }

  // ── The PulseKit adapter ──────────────────────────────────────────────────
  const adapter = {

    /** Which global channels are online */
    get channels() { return [...globalChannels.keys()]; },

    /** True if at least one real channel is connected */
    get isLive() { return globalChannels.size > 0; },

    /**
     * SEND — deliver a message to a user.
     * 
     * Smart routing order:
     *   1. User's own configured channel (platform-specific creds in DB)
     *   2. Global bot for the requested channel
     *   3. Best available global channel (priority order)
     *   4. WebPush (browser notification)
     *   5. DB-only (in-app notification feed — always succeeds)
     * 
     * @param {object} opts
     * @param {string} opts.channel   - Preferred channel name ('telegram', 'email', etc.)
     * @param {string} opts.to        - User UUID
     * @param {string} opts.message   - Text to send
     * @param {string} [opts.title]   - Optional notification title
     * @param {object} [opts.meta]    - Optional metadata stored in DB
     * @param {string} [opts.notifId] - Existing notification ID to mark delivered
     */
    send: async ({ channel, to, message, title, meta = {}, notifId }) => {
      if (!message || !to) return;

      const requested = (channel || 'webpush').toLowerCase();

      // Guard: block paid channels unless explicitly enabled
      if (PAID_CHANNELS.has(requested)) {
        console.warn(`[PulseKit] Blocked paid channel "${requested}" → routing to best free channel`);
        return adapter.send({ channel: 'webpush', to, message, title, meta, notifId });
      }

      // Store in DB first — ensures in-app feed is always populated
      await storeNotification(to, requested, title, message, meta);

      // ── Attempt 1: User's own configured channel ──────────────────────
      const userChannels = await getUserChannels(to);
      if (userChannels.length > 0) {
        // Sort by priority
        const sorted = userChannels.sort((a, b) =>
          CHANNEL_PRIORITY.indexOf(a.platform) - CHANNEL_PRIORITY.indexOf(b.platform)
        );
        // Prefer the requested channel, else best available
        const target = sorted.find(c => c.platform === requested) || sorted[0];

        const driver = await getUserDriver(to, target.platform, target.creds);
        if (driver) {
          try {
            await driver.send({ to: target.creds.recipient_id || target.creds.channel_id || to, message, title });
            console.log(`[PulseKit] ✉ ${target.platform} (user) → ${to}: ${message.slice(0, 80)}`);
            await markDelivered(notifId);
            return { delivered: true, channel: target.platform, via: 'user' };
          } catch (e) {
            console.warn(`[PulseKit] User channel ${target.platform} failed, trying global:`, e.message);
          }
        }
      }

      // ── Attempt 2: Global bot for requested channel ───────────────────
      if (globalChannels.has(requested)) {
        try {
          const driver = globalChannels.get(requested);
          await driver.send({ to, message, title });
          console.log(`[PulseKit] ✉ ${requested} (global) → ${to}: ${message.slice(0, 80)}`);
          await markDelivered(notifId);
          return { delivered: true, channel: requested, via: 'global' };
        } catch (e) {
          console.warn(`[PulseKit] Global ${requested} failed:`, e.message);
        }
      }

      // ── Attempt 3: Best available global channel ──────────────────────
      for (const ch of CHANNEL_PRIORITY) {
        if (ch === requested) continue; // already tried
        if (!globalChannels.has(ch)) continue;
        try {
          const driver = globalChannels.get(ch);
          await driver.send({ to, message, title });
          console.log(`[PulseKit] ✉ ${ch} (fallback) → ${to}: ${message.slice(0, 80)}`);
          await markDelivered(notifId);
          return { delivered: true, channel: ch, via: 'fallback' };
        } catch (e) {
          console.warn(`[PulseKit] Fallback ${ch} failed:`, e.message);
        }
      }

      // ── DB only: in-app feed always there ────────────────────────────
      console.log(`[PulseKit] 📋 DB-only → ${to}: ${message.slice(0, 80)}`);
      return { delivered: false, channel: 'db', via: 'db-only' };
    },

    /**
     * BROADCAST — send same message to multiple users at once.
     * Uses the queue for rate-limit-safe delivery.
     */
    broadcast: async (userIds, { message, title, channel = 'webpush', meta = {} }) => {
      const results = [];
      for (const userId of userIds) {
        results.push(
          queue.enqueue(() => adapter.send({ to: userId, message, title, channel, meta }))
        );
      }
      return Promise.allSettled(results);
    },

    /**
     * SCHEDULE — queue a message to be sent after a delay (ms).
     */
    schedule: (delayMs, opts) => {
      return new Promise(resolve => {
        setTimeout(() => adapter.send(opts).then(resolve), delayMs);
      });
    },

    /**
     * REGISTER_INBOUND — handle replies from users.
     * @param {function} handler - async ({ from, message, channel, reply }) => void
     */
    onInbound: (handler) => {
      inboundHandlers.push(handler);
      // Wire into all active global channels that support inbound
      for (const [name, driver] of globalChannels.entries()) {
        if (typeof driver.onMessage === 'function') {
          driver.onMessage(async (msg) => {
            try {
              await handler({ from: msg.from, message: msg.text, channel: name, reply: msg.reply });
            } catch (e) {
              console.error(`[PulseKit] Inbound handler error on ${name}:`, e.message);
            }
          });
        }
      }
    },

    /**
     * HANDLE_WEBHOOK_EVENT — proxy HTTP webhook payloads to the correct channel driver.
     */
    handleWebhookEvent: async (channel, payload) => {
      let handled = false;
      let lastResult = null;

      // 1. Check global channel
      if (globalChannels.has(channel)) {
        const driver = globalChannels.get(channel);
        if (typeof driver.handleWebhook === 'function') {
          lastResult = await driver.handleWebhook(payload);
          handled = true;
        }
      }

      // 2. Check all active user drivers for this platform
      for (const [key, driver] of userDriverCache.entries()) {
        // key is `${userId}_${platform}`
        if (key.endsWith(`_${channel}`)) {
          if (typeof driver.handleWebhook === 'function') {
            const res = await driver.handleWebhook(payload);
            if (res) lastResult = res;
            handled = true;
          }
        }
      }

      return handled ? lastResult : null;
    },

    /**
     * START_LISTENING — begin polling/webhook for inbound messages.
     * Non-blocking — runs as background loop.
     */
    startListening: async () => {
      // Start global listeners
      for (const [name, driver] of globalChannels.entries()) {
        if (typeof driver.startPolling === 'function') {
          try {
            await driver.startPolling();
            console.log(`[PulseKit] 🎧 Listening on ${name}`);
          } catch (e) {
            console.warn(`[PulseKit] Could not start polling on ${name}:`, e.message);
          }
        }
      }

      // Start user-specific listeners (e.g. IMAP polling)
      try {
        const result = await _pool.query('SELECT user_id, platform, credentials FROM channels WHERE is_active = true');
        for (const row of result.rows) {
          try {
            const creds = JSON.parse(decrypt(row.credentials));
            // This will auto-wire onMessage and startPolling automatically inside getUserDriver!
            await getUserDriver(row.user_id, row.platform, creds);
          } catch (e) {
            console.warn(`[PulseKit] StartListening: failed to init ${row.platform} for user ${row.user_id}:`, e.message);
          }
        }
      } catch (e) {
        console.error('[PulseKit] startListening error:', e.message);
      }
    },

    /** Health report — useful for admin dashboard */
    status: () => ({
      channels: [...globalChannels.keys()],
      isLive: globalChannels.size > 0,
      queueDepth: queue.depth,
      userDriversCached: userDriverCache.size,
    }),

    /** Graceful shutdown */
    destroy: async () => {
      queue.drain();
      userDriverCache.clear();
      for (const driver of globalChannels.values()) {
        if (typeof driver.destroy === 'function') await driver.destroy();
      }
    },
  };

  return adapter;
}

module.exports = { createPulseKit };
