/**
 * CASPIAN CLIENT ADAPTER
 * 
 * Wraps the real Caspian CommClient behind the same interface the stub used:
 *   caspian.send({ channel, to, message })
 * 
 * - Connects only FREE channels (Email, Telegram, Slack, Discord, Bluesky)
 * - Hard-caps spend at $0 so paid channels can never charge
 * - Falls back to browser push + DB notification if Caspian is unavailable
 * - Zero changes required to any feature cron that calls caspian.send()
 */

const { pool } = require('./db');
const { decrypt } = require('./crypto');

// Free channels on Caspian — unlimited, $0
const FREE_CHANNELS = new Set(['email', 'telegram', 'slack', 'discord', 'bluesky']);

// Paid channels we refuse to send on unless explicitly overridden
const PAID_CHANNELS = new Set(['whatsapp', 'sms', 'x', 'twitter', 'voice', 'phone']);

/**
 * Create the Caspian client adapter.
 * Returns an object with the same .send() interface the stub had,
 * plus .startListening() for optional inbound message handling.
 * 
 * @param {import('pg').Pool} dbPool - PostgreSQL connection pool
 * @returns {Promise<object>} caspian adapter
 */
async function createCaspianClient(dbPool) {
  const _pool = dbPool || pool;
  let client = null;
  let isLive = false;
  const connectedChannels = new Map(); // Global channel name -> connection info
  const userConnections = new Map(); // userId_channel -> conn

  // ── Try to initialize real CommClient ──────────────────────────────────────
  const apiKey = process.env.CASPIAN_API_KEY;
  if (apiKey) {
    try {
      // caspian-sdk is ESM-only, use dynamic import
      const { CommClient } = await import('caspian-sdk');
      client = new CommClient({ apiKey });

      // Hard-cap spend at $0 — safety net against accidental paid usage
      try {
        await client.setSpendLimits({ monthlyCapCents: 0 });
        console.log('[Caspian] Spend cap set to $0/month');
      } catch (e) {
        // setSpendLimits may fail if no billing account — that's fine, means $0 by default
        console.log('[Caspian] No billing account (spend is $0 by default)');
      }

      // ── Connect free channels based on env vars ────────────────────────────
      // Email: auto-provisions an agent address, easiest free channel
      if (process.env.CASPIAN_EMAIL_ENABLED !== 'false') {
        try {
          const emailConn = await client.connectEmail();
          connectedChannels.set('email', emailConn);
          console.log(`[Caspian] ✅ Email connected: ${emailConn.address || emailConn.id}`);
        } catch (e) {
          console.warn('[Caspian] Email connect failed:', e.message);
        }
      }

      // Telegram: needs a bot token from @BotFather
      if (process.env.CASPIAN_TELEGRAM_BOT_TOKEN) {
        try {
          const tgConn = await client.connectTelegram({
            botToken: process.env.CASPIAN_TELEGRAM_BOT_TOKEN,
          });
          connectedChannels.set('telegram', tgConn);
          console.log(`[Caspian] ✅ Telegram connected: ${tgConn.id}`);
        } catch (e) {
          console.warn('[Caspian] Telegram connect failed:', e.message);
        }
      }

      // Slack: one-click OAuth install
      if (process.env.CASPIAN_SLACK_ENABLED === 'true') {
        try {
          const slackConn = await client.installSlack();
          connectedChannels.set('slack', slackConn);
          if (slackConn.authorize_url) {
            console.log(`[Caspian] ⏳ Slack OAuth needed: ${slackConn.authorize_url}`);
          } else {
            console.log(`[Caspian] ✅ Slack connected: ${slackConn.id}`);
          }
        } catch (e) {
          console.warn('[Caspian] Slack connect failed:', e.message);
        }
      }

      // Discord: one-click OAuth install
      if (process.env.CASPIAN_DISCORD_ENABLED === 'true') {
        try {
          const discordConn = await client.installDiscord();
          connectedChannels.set('discord', discordConn);
          if (discordConn.authorize_url) {
            console.log(`[Caspian] ⏳ Discord OAuth needed: ${discordConn.authorize_url}`);
          } else {
            console.log(`[Caspian] ✅ Discord connected: ${discordConn.id}`);
          }
        } catch (e) {
          console.warn('[Caspian] Discord connect failed:', e.message);
        }
      }

      isLive = connectedChannels.size > 0;
      console.log(`[Caspian] Live mode: ${isLive} (${connectedChannels.size} channels connected)`);

    } catch (e) {
      console.warn('[Caspian] SDK init failed, running in stub mode:', e.message);
      client = null;
      isLive = false;
    }
  } else {
    console.log('[Caspian] No CASPIAN_API_KEY — running in stub mode (browser push only)');
  }

  // ── Inbound message handler registry ───────────────────────────────────────
  let inboundHandler = null;

  // ── The adapter object ─────────────────────────────────────────────────────
  const adapter = {
    /** Whether the real Caspian SDK is connected */
    get isLive() { return isLive; },

    /** Which channels are actively connected */
    get channels() { return [...connectedChannels.keys()]; },

    /**
     * Get or create a user-specific connection.
     */
    getUserConnection: async (userId, channelName, credentialsObj) => {
      if (!isLive || !client) return null;
      const cacheKey = `${userId}_${channelName}`;
      if (userConnections.has(cacheKey)) {
        return userConnections.get(cacheKey);
      }

      try {
        let conn = null;
        if (channelName === 'telegram' && credentialsObj.bot_token) {
          conn = await client.connectTelegram({ botToken: credentialsObj.bot_token });
        } else if (channelName === 'slack' && credentialsObj.bot_token) {
          // Slack custom tokens
          conn = await client.connectSlack({ token: credentialsObj.bot_token });
        } else if (channelName === 'discord' && credentialsObj.bot_token) {
          conn = await client.connectDiscord({ token: credentialsObj.bot_token });
        } else if (channelName === 'bluesky' && credentialsObj.identifier && credentialsObj.app_password) {
          conn = await client.connectBluesky({ identifier: credentialsObj.identifier, password: credentialsObj.app_password });
        }
        
        if (conn) {
          userConnections.set(cacheKey, conn);
          return conn;
        }
      } catch (err) {
        console.warn(`[Caspian] Failed to connect user channel ${channelName}:`, err.message);
      }
      return null;
    },

    /**
     * Send a message to a user via the specified channel.
     * @param {Object} options
     * @param {string} options.channel - 'email', 'telegram', etc.
     * @param {string} options.to - User ID (UUID)
     * @param {string} options.message - The text to send
     */
    send: async ({ channel, to, message }) => {
      if (!message) return;

      const channelLower = (channel || 'browser').toLowerCase();

      // ── Guard: block paid channels ─────────────────────────────────────
      if (PAID_CHANNELS.has(channelLower)) {
        const enableWhatsapp = process.env.CASPIAN_ENABLE_WHATSAPP === 'true';
        const enableSms = process.env.CASPIAN_ENABLE_SMS === 'true';

        if (channelLower === 'whatsapp' && !enableWhatsapp) {
          console.warn(`[Caspian] Paid channel "${channelLower}" blocked → rerouting to free channel`);
          // Reroute: try email, then browser
          return adapter.send({ channel: 'email', to, message });
        }
        if (channelLower === 'sms' && !enableSms) {
          console.warn(`[Caspian] Paid channel "${channelLower}" blocked → rerouting to free channel`);
          return adapter.send({ channel: 'email', to, message });
        }
        // Any other paid channel → reroute
        if (!enableWhatsapp && !enableSms) {
          console.warn(`[Caspian] Paid channel "${channelLower}" blocked → rerouting to free channel`);
          return adapter.send({ channel: 'email', to, message });
        }
      }

      // ── Try real Caspian delivery ──────────────────────────────────────
      if (isLive && client) {
        try {
          // Query user's custom configured channels from DB
          let customConn = null;
          let activeChannelName = channelLower;
          const chResult = await _pool.query(
            'SELECT platform, credentials FROM channels WHERE user_id = $1 AND is_active = true',
            [to]
          ).catch(() => ({ rows: [] }));

          if (chResult.rows.length > 0) {
            // Find the requested channel, or fallback to the first active custom channel
            const targetCh = chResult.rows.find(c => c.platform.toLowerCase() === channelLower) || chResult.rows[0];
            activeChannelName = targetCh.platform.toLowerCase();
            
            try {
              const credsStr = decrypt(targetCh.credentials);
              const creds = JSON.parse(credsStr);
              customConn = await adapter.getUserConnection(to, activeChannelName, creds);
            } catch (e) {
              console.warn(`[Caspian] Failed to decrypt or parse credentials for ${activeChannelName}:`, e.message);
            }
          }

          // If we have a custom connection, use it
          if (customConn) {
            await client.initiate(customConn.id, to, message);
            console.log(`[Caspian] ✉ ${activeChannelName} (custom) → ${to}: ${message.slice(0, 80)}`);
            await _storeNotification(_pool, to, activeChannelName, message);
            return;
          }

          // Fallback to global connected channels if no custom connection exists
          if (connectedChannels.has(activeChannelName)) {
            const conn = connectedChannels.get(activeChannelName);
            await client.initiate(conn.id, to, message);
            console.log(`[Caspian] ✉ ${activeChannelName} → ${to}: ${message.slice(0, 80)}`);
            await _storeNotification(_pool, to, activeChannelName, message);
            return;
          }

          // Any global connected channel as final fallback
          if (connectedChannels.size > 0) {
            const [fallbackChannel, fallbackConn] = [...connectedChannels.entries()][0];
            try {
              await client.initiate(fallbackConn.id, to, message);
              console.log(`[Caspian] ✉ ${fallbackChannel} (fallback) → ${to}: ${message.slice(0, 80)}`);
              await _storeNotification(_pool, to, fallbackChannel, message);
              return;
            } catch (fallbackErr) {
              console.warn(`[Caspian] Fallback ${fallbackChannel} failed:`, fallbackErr.message);
            }
          }
        } catch (e) {
          console.warn(`[Caspian] Delivery failed for ${channelLower}:`, e.message);
          // Fall through to stub mode
        }
      }

      // ── Stub mode fallback (same as original server.js stub) ───────────
      try {
        // Query user's active channels from DB for logging
        const chResult = await _pool.query(
          'SELECT platform, display_name FROM channels WHERE user_id = $1 AND is_active = true',
          [to]
        ).catch(() => ({ rows: [] }));

        if (chResult.rows.length > 0) {
          for (const ch of chResult.rows) {
            console.log(`[Caspian:stub] ${ch.platform} → ${to}: ${message.slice(0, 80)}`);
          }
        } else {
          console.log(`[Caspian:stub] browser → ${to}: ${message.slice(0, 80)}`);
        }

        // Store in notifications table
        await _storeNotification(_pool, to, channelLower, message);

        // Send web push notification
        try {
          const { sendWebPush } = require('./routes/notifications');
          await sendWebPush(to, {
            title: 'Thought GPS',
            body: message.slice(0, 200) || 'New cognitive nudge',
            tag: 'cognitive-nudge',
            data: { url: '/' },
            vibrate: [100, 50, 100],
          });
        } catch {
          // Web push may not be available
        }
      } catch (err) {
        // DB may not be ready
        console.log(`[Caspian:stub] ${channelLower} → ${to}: ${message.slice(0, 80)}`);
      }
    },

    /**
     * Register a handler for inbound messages from connected channels.
     * Optional — enables users to reply to nudges via Telegram/Email.
     * 
     * @param {function} handler - async (message) => void
     */
    onInbound: (handler) => {
      inboundHandler = handler;
    },

    /**
     * Start listening for inbound messages (non-blocking).
     * Uses Caspian's polling event loop — no webhook server needed.
     */
    startListening: async () => {
      if (!isLive || !client) {
        console.log('[Caspian] Not in live mode — skipping inbound listener');
        return;
      }

      // Register inbound handler with CommClient
      client.onMessage(async (msg) => {
        console.log(`[Caspian] ← Inbound from ${msg.channel || 'unknown'}: ${(msg.text || '').slice(0, 80)}`);

        if (inboundHandler) {
          try {
            await inboundHandler(msg);
          } catch (e) {
            console.error('[Caspian] Inbound handler error:', e.message);
          }
        }

        // Default: acknowledge receipt
        try {
          await msg.reply('Got it — processing your thought.');
        } catch {
          // reply may fail for some channels
        }
      });

      // Start the event loop (with abort support for graceful shutdown)
      const ac = new AbortController();
      process.on('SIGTERM', () => ac.abort());
      process.on('SIGINT', () => ac.abort());

      console.log('[Caspian] Starting inbound listener...');
      client.listen({ signal: ac.signal, concurrency: 'queue' }).catch(err => {
        if (err.name !== 'AbortError') {
          console.error('[Caspian] Listener error:', err.message);
        }
      });
    },

    /** Get the raw CommClient (for advanced usage) */
    get rawClient() { return client; },
  };

  return adapter;
}

/**
 * Store a notification in the DB for the in-app notification feed.
 * Fire-and-forget — never throws.
 */
async function _storeNotification(dbPool, userId, channel, message) {
  try {
    await dbPool.query(
      `INSERT INTO notifications (user_id, type, title, message, channel)
       VALUES ($1, 'cognitive_nudge', $2, $3, $4)`,
      [userId, `Nudge via ${channel}`, message, channel]
    );
  } catch {
    // notifications table may not exist or userId may be invalid
  }
}

module.exports = { createCaspianClient };
