/**
 * PulseKit — Slack Channel Driver
 * Uses Slack Web API directly (no @slack/bolt needed).
 * Works with bot tokens (xoxb-...) to post messages and DMs.
 */

'use strict';

const https = require('https');

function slackRequest(token, method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'slack.com',
      path: `/api/${method}`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) reject(new Error(parsed.error || 'Slack API error'));
          else resolve(parsed);
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

function createSlackChannel({ token }) {
  let botInfo = null;
  let messageHandlers = [];

  return {
    name: 'slack',

    async init() {
      const res = await slackRequest(token, 'auth.test', {});
      botInfo = res;
      console.log(`[PulseKit:Slack] Bot: ${res.user} in workspace ${res.team}`);
    },

    /**
     * Send a Slack message.
     * `to` can be:
     *   - A Slack user ID (e.g. U123ABC) → opens DM
     *   - A channel ID (e.g. C123ABC) → posts in channel
     *   - A channel name (e.g. #general) → posts in channel
     */
    async send({ to, message, title }) {
      const text = title ? `*${title}*\n\n${message}` : message;

      // Try as user ID → open DM conversation first
      if (/^U[A-Z0-9]+$/.test(to)) {
        try {
          const conv = await slackRequest(token, 'conversations.open', { users: to });
          await slackRequest(token, 'chat.postMessage', {
            channel: conv.channel.id,
            text,
            mrkdwn: true,
          });
          return;
        } catch {
          // fall through to direct channel post
        }
      }

      // Direct channel/DM ID
      await slackRequest(token, 'chat.postMessage', {
        channel: to,
        text,
        mrkdwn: true,
      });
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    // Slack inbound is webhook-driven, so startPolling is a no-op
    async startPolling() {
      console.log('[PulseKit:Slack] 🎧 Webhook listener active. Configure Events API in Slack dashboard.');
    },

    async handleWebhook(payload) {
      if (payload.type === 'url_verification') {
        return { challenge: payload.challenge };
      }

      if (payload.type === 'event_callback') {
        const event = payload.event;
        // Ignore bot messages
        if (event.bot_id || (botInfo && event.user === botInfo.user_id)) {
          return { ok: true };
        }

        if (event.type === 'message' && event.text) {
          // Provide a reply function that routes back to this conversation
          const reply = async (text) => {
            await this.send({ to: event.channel, message: text });
          };

          for (const handler of messageHandlers) {
            await handler({
              from: event.user, // The Slack User ID (U12345)
              text: event.text,
              reply
            });
          }
        }
      }

      return { ok: true };
    },

    async destroy() {
      messageHandlers = [];
    },
  };
}

module.exports = { createSlackChannel };
