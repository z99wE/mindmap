/**
 * PulseKit — Telegram Channel Driver
 * Uses direct Telegram Bot API (no third-party library needed).
 * 100% free, no rate limits for small-volume bots.
 */

'use strict';

const https = require('https');

function telegramRequest(token, method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) resolve(parsed.result);
          else reject(new Error(parsed.description || 'Telegram API error'));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function createTelegramChannel({ botToken }) {
  let messageHandlers = [];
  let pollingOffset = 0;
  let pollingActive = false;
  let pollingTimer = null;

  async function poll() {
    if (!pollingActive) return;
    try {
      const updates = await telegramRequest(botToken, 'getUpdates', {
        offset: pollingOffset,
        timeout: 30,
        allowed_updates: ['message'],
      });
      for (const update of updates) {
        pollingOffset = update.update_id + 1;
        const msg = update.message;
        if (!msg || !msg.text) continue;
        const envelope = {
          from: String(msg.from?.id || msg.chat.id),
          text: msg.text,
          channel: 'telegram',
          reply: async (text) => telegramRequest(botToken, 'sendMessage', {
            chat_id: msg.chat.id,
            text,
            parse_mode: 'Markdown',
          }),
        };
        for (const handler of messageHandlers) {
          handler(envelope).catch(e => console.error('[PulseKit:Telegram] Handler error:', e.message));
        }
      }
    } catch (e) {
      if (pollingActive) console.warn('[PulseKit:Telegram] Polling error:', e.message);
    }
    if (pollingActive) {
      pollingTimer = setTimeout(poll, 1000);
    }
  }

  return {
    name: 'telegram',

    async init() {
      // Validate token
      const me = await telegramRequest(botToken, 'getMe', {});
      console.log(`[PulseKit:Telegram] Bot: @${me.username}`);
    },

    /**
     * Send a message to a Telegram chat ID.
     * `to` is a Telegram chat_id or user_id (numeric string).
     */
    async send({ to, message, title }) {
      const text = title ? `*${title}*\n\n${message}` : message;
      await telegramRequest(botToken, 'sendMessage', {
        chat_id: to,
        text,
        parse_mode: 'Markdown',
      });
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      if (pollingActive) return;
      pollingActive = true;
      poll();
    },

    async destroy() {
      pollingActive = false;
      if (pollingTimer) clearTimeout(pollingTimer);
      messageHandlers = [];
    },
  };
}

module.exports = { createTelegramChannel };
