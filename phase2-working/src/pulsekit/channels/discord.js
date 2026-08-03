/**
 * PulseKit — Discord Channel Driver
 * Uses Discord HTTP API directly (no discord.js needed).
 * Sends DMs or channel messages via bot token.
 */

'use strict';

const https = require('https');

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

  return {
    name: 'discord',

    async init() {
      botUser = await discordRequest(token, 'GET', '/users/@me', null);
      console.log(`[PulseKit:Discord] Bot: ${botUser.username}#${botUser.discriminator}`);
    },

    /**
     * Send a message.
     * `to` should be a Discord user ID (for DMs) or a channel ID.
     * For DMs: first opens a DM channel, then sends the message.
     */
    async send({ to, message, title }) {
      const content = title ? `**${title}**\n\n${message}` : message;

      // Try DM first (if `to` looks like a user snowflake)
      try {
        const dmChannel = await discordRequest(token, 'POST', '/users/@me/channels', { recipient_id: to });
        await discordRequest(token, 'POST', `/channels/${dmChannel.id}/messages`, { content });
        return;
      } catch {
        // If DM fails (user has DMs disabled), try as channel ID
      }

      // Try as channel ID directly
      await discordRequest(token, 'POST', `/channels/${to}/messages`, { content });
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    // Discord polling requires Gateway websocket — simplified stub here
    // Full implementation would use ws + IDENTIFY
    async startPolling() {
      console.log('[PulseKit:Discord] Note: Inbound messages require webhook setup. See docs.');
    },

    async destroy() {
      messageHandlers = [];
    },
  };
}

module.exports = { createDiscordChannel };
