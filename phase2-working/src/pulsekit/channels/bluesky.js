/**
 * PulseKit — Bluesky Channel Driver
 * 
 * Uses the AT Protocol (atproto.com) which is free and open.
 * Anyone can create a Bluesky account and use an App Password.
 * No developer account needed — just a regular Bluesky account.
 * 
 * Credentials: identifier (handle or email) + app_password
 * App passwords are created in Settings > App Passwords on Bluesky.
 */

'use strict';

const https = require('https');

function bskyRequest(hostname, path, method, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.message || parsed.error || `Bluesky ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          if (res.statusCode >= 400) reject(new Error(`Bluesky ${res.statusCode}`));
          else resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function bskyAuthenticate(identifier, password) {
  const resp = await bskyRequest('bsky.social', '/xrpc/com.atproto.server.createSession', 'POST', {
    identifier,
    password,
  });
  return resp; // { accessJwt, refreshJwt, did, handle }
}

function createBlueskyChannel({ identifier, appPassword }) {
  let messageHandlers = [];
  let session = null;
  let did = null;
  let handle = null;

  return {
    name: 'bluesky',

    async init() {
      if (!identifier || !appPassword) {
        console.log('[PulseKit:Bluesky] Missing credentials. Configure in Channels page.');
        return;
      }
      try {
        session = await bskyAuthenticate(identifier, appPassword);
        did = session.did;
        handle = session.handle;
        console.log(`[PulseKit:Bluesky] Authenticated as @${handle} (${did})`);
      } catch (e) {
        console.warn(`[PulseKit:Bluesky] Auth failed: ${e.message}`);
      }
    },

    async send({ to, message, title }) {
      if (!session?.accessJwt) throw new Error('Bluesky not authenticated. Check credentials.');
      if (!did) throw new Error('Bluesky DID not available. Re-authenticate.');

      const text = title ? `${title}: ${message}` : message;

      // Create a post (BSKY post = "skeet")
      const postBody = {
        repo: did,
        collection: 'com.atproto.repo.createRecord',
        record: {
          $type: 'app.bsky.feed.post',
          text: text.length > 300 ? text.substring(0, 297) + '...' : text,
          createdAt: new Date().toISOString(),
        },
      };

      // If `to` is a Bluesky handle, include a mention
      if (to && to !== handle) {
        const mentionHandle = to.replace(/^@/, '');
        // Facet for the mention
        postBody.record.facets = [{
          index: { byteStart: 0, byteEnd: mentionHandle.length + 1 },
          features: [{ $type: 'app.bsky.richtext.facet#mention', did: mentionHandle }],
        }];
        // Prepend @mention to text
        postBody.record.text = `@${mentionHandle} ${text}`.substring(0, 300);
      }

      await bskyRequest(
        'bsky.social',
        '/xrpc/com.atproto.repo.createRecord',
        'POST',
        postBody,
        session.accessJwt
      );
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      console.log('[PulseKit:Bluesky] 🦋 Bluesky inbound via firehose subscription only (not implemented).');
    },

    async handleWebhook(payload) {
      // Bluesky firehose events would be processed here
      // For now, inbound is not supported (Bluesky has no webhook API)
      return { ok: true };
    },

    async destroy() {
      messageHandlers = [];
      session = null;
    },
  };
}

module.exports = { createBlueskyChannel };
