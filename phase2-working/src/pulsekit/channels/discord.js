/**
 * PulseKit — Discord Channel Driver
 * Uses Discord HTTP API directly (no discord.js needed).
 * Sends DMs or channel messages via bot token.
 */

'use strict';

const https = require('https');
let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  // Graceful degradation if ws is not installed
}

function discordRequest(token, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 204) return resolve(null);
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.message || `Discord ${res.statusCode}`));
          else resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createDiscordChannel({ token }) {
  let botUser = null;
  let messageHandlers = [];

    let ws = null;
    let heartbeatInterval = null;

    async function startPolling() {
      if (!WebSocket) {
        console.warn('[PulseKit:Discord] Cannot start inbound polling: ws package is missing. Run: npm install ws');
        return;
      }

      ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

      ws.on('open', () => {
        console.log('[PulseKit:Discord] 🔌 Connected to Gateway');
      });

      ws.on('message', async (data) => {
        const payload = JSON.parse(data);
        const { t, event, op, d } = payload;

        if (op === 10) { // Hello
          const { heartbeat_interval } = d;
          heartbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: null }));
          }, heartbeat_interval);

          // Identify
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: token,
              intents: 512 | 4096 | 32768, // GUILD_MESSAGES | DIRECT_MESSAGES | MESSAGE_CONTENT
              properties: {
                os: process.platform,
                browser: 'pulsekit',
                device: 'pulsekit'
              }
            }
          }));
        }

        if (t === 'MESSAGE_CREATE' && !d.author.bot) {
          const reply = async (text) => {
            await discordRequest(token, 'POST', `/channels/${d.channel_id}/messages`, { content: text });
          };
          for (const handler of messageHandlers) {
            await handler({
              from: d.author.id,
              text: d.content,
              reply
            });
          }
        }
      });

      ws.on('close', () => {
        console.log('[PulseKit:Discord] 🔌 Disconnected. Reconnecting in 5s...');
        clearInterval(heartbeatInterval);
        setTimeout(startPolling, 5000);
      });
    }

    // Attach to the return object
    return {
      name: 'discord',

      async init() {
        botUser = await discordRequest(token, 'GET', '/users/@me', null);
        console.log(`[PulseKit:Discord] Bot: ${botUser.username}#${botUser.discriminator}`);
      },

      async send({ to, message, title }) {
        const content = title ? `**${title}**\n\n${message}` : message;
        try {
          const dmChannel = await discordRequest(token, 'POST', '/users/@me/channels', { recipient_id: to });
          await discordRequest(token, 'POST', `/channels/${dmChannel.id}/messages`, { content });
          return;
        } catch {}
        await discordRequest(token, 'POST', `/channels/${to}/messages`, { content });
      },

      onMessage(handler) {
        messageHandlers.push(handler);
      },

      startPolling,

      async destroy() {
        messageHandlers = [];
        if (ws) ws.close();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      },
    };
}

module.exports = { createDiscordChannel };
