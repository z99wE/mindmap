/**
 * PulseKit — Twitter (X) Channel Driver
 * 
 * Uses Twitter API v2 with OAuth 1.0a User Context.
 * Requires: API Key, API Secret, Access Token, Access Token Secret.
 * These are obtained from developer.twitter.com after creating a Project.
 * 
 * Free tier: 500 posts/month, 10k reads/month.
 */

'use strict';

const https = require('https');
const crypto = require('crypto');

/**
 * Generate an OAuth 1.0a signature for Twitter API requests.
 */
function oauthSignature(method, url, params, consumerSecret, tokenSecret) {
  const paramString = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
  const sigBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;
  return crypto.createHmac('sha1', key).update(sigBase).digest('base64');
}

/**
 * Build OAuth 1.0a header for Twitter API v2.
 */
function oauthHeader(method, url, consumerKey, consumerSecret, accessToken, accessSecret, extraParams = {}) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: accessToken,
    oauth_version: '1.0',
    ...extraParams,
  };
  oauth.oauth_signature = oauthSignature(method, url, oauth, consumerSecret, accessSecret);
  return 'OAuth ' + Object.keys(oauth).map(k => `${k}="${encodeURIComponent(oauth[k])}"`).join(', ');
}

function twitterRequest(method, path, body, consumerKey, consumerSecret, accessToken, accessSecret) {
  return new Promise((resolve, reject) => {
    const url = `https://api.twitter.com/2${path}`;
    const payload = body ? JSON.stringify(body) : '';
    const auth = oauthHeader(method, url, consumerKey, consumerSecret, accessToken, accessSecret);
    
    const options = {
      hostname: 'api.twitter.com',
      path: `/2${path}`,
      method,
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.detail || parsed.title || `Twitter API ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          if (res.statusCode >= 400) reject(new Error(`Twitter API ${res.statusCode}`));
          else resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createTwitterChannel({ apiKey, apiSecret, accessToken, accessSecret }) {
  let messageHandlers = [];

  return {
    name: 'twitter',

    async init() {
      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.log('[PulseKit:Twitter] Missing credentials. Configure in Channels page.');
        return;
      }
      // Verify credentials by fetching the authenticated user
      try {
        const me = await twitterRequest('GET', '/users/me', null, apiKey, apiSecret, accessToken, accessSecret);
        console.log(`[PulseKit:Twitter] Authenticated as @${me.data?.username || 'unknown'}`);
      } catch (e) {
        console.warn(`[PulseKit:Twitter] Auth check failed: ${e.message}`);
      }
    },

    async send({ to, message, title }) {
      if (!apiKey) throw new Error('Twitter API key not configured');

      const text = title ? `${title}: ${message}` : message;
      // Truncate to Twitter's 280 character limit (or 4000 for X Premium)
      const tweetText = text.length > 280 ? text.substring(0, 277) + '...' : text;

      // Twitter API v2: POST /tweets
      // `to` can be a tweet ID to reply to, or we just post a new tweet
      const params = { text: tweetText };
      if (to && to !== 'me') {
        params.reply = { in_reply_to_tweet_id: to };
      }

      await twitterRequest('POST', '/tweets', params, apiKey, apiSecret, accessToken, accessSecret);
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      console.log('[PulseKit:Twitter] 🐦 Twitter inbound via webhook/webhook only. Configure Account Activity API.');
    },

    async handleWebhook(payload) {
      // Twitter Account Activity API webhook format
      if (payload.tweet_create_events) {
        for (const tweet of payload.tweet_create_events) {
          // Only process mentions and DMs that aren't from the bot itself
          if (tweet.user?.screen_name) {
            const reply = async (text) => {
              await this.send({ to: tweet.id_str, message: text });
            };
            for (const handler of messageHandlers) {
              await handler({
                from: tweet.user.screen_name,
                text: tweet.text,
                reply
              });
            }
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

module.exports = { createTwitterChannel };
