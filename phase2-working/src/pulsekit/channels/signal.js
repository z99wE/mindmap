/**
 * PulseKit — Signal Channel Driver
 * Uses Signal REST API (signal-cli REST API or third-party gateway).
 * Supports sending messages via a configured REST endpoint.
 * Inbound handled via webhook.
 * 
 * NOTE: Signal does not provide an official bot API. This driver works with:
 *   - A self-hosted signal-cli REST API (https://github.com/AsamK/signal-cli)
 *   - A third-party Signal gateway service
 */

'use strict';

const https = require('https');
const http = require('http');

function signalRequest(baseUrl, endpoint, body, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const payload = body ? JSON.stringify(body) : null;
    const client = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (data) {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) reject(new Error(parsed.error || parsed.message || `Signal API ${res.statusCode}`));
            else resolve(parsed);
          } else {
            resolve(null);
          }
        } catch (e) {
          if (res.statusCode >= 400) reject(new Error(`Signal API ${res.statusCode}`));
          else resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Create a Signal channel driver.
 * 
 * @param {object} options
 * @param {string} options.baseUrl - Base URL of the Signal REST API (e.g. http://localhost:8080)
 * @param {string} options.apiKey  - Optional API key for the Signal gateway
 * @param {string} options.phoneNumber - The Signal phone number (with country code) to send FROM
 */
function createSignalChannel({ baseUrl = process.env.SIGNAL_REST_URL || 'http://localhost:8080', apiKey = null, phoneNumber = null }) {
  let messageHandlers = [];
  const fromNumber = phoneNumber || process.env.SIGNAL_PHONE_NUMBER;

  return {
    name: 'signal',

    async init() {
      if (!fromNumber) {
        console.log(`[PulseKit:Signal] Initialized in webhook-only mode (no phone number configured).`);
        return;
      }
      try {
        // Health check: try to reach the signal REST API
        const health = await signalRequest(baseUrl, '/v1/health', null, apiKey);
        console.log(`[PulseKit:Signal] Gateway reachable at ${baseUrl}`);
      } catch (e) {
        console.warn(`[PulseKit:Signal] Gateway at ${baseUrl} not reachable: ${e.message}. Will retry on send.`);
      }
    },

    /**
     * Send a Signal message to a phone number.
     * `to` is a phone number with country code (e.g. +15551234567).
     */
    async send({ to, message, title }) {
      if (!fromNumber) throw new Error('Signal phone number not configured. Set SIGNAL_PHONE_NUMBER env var.');

      const text = title ? `*${title}*\n\n${message}` : message;

      // Try signal-cli REST API format (v1)
      try {
        await signalRequest(baseUrl, '/v1/send', {
          message: text,
          recipient: [to.replace(/^\+/, '')], // signal-cli expects number without +
          number: fromNumber.replace(/^\+/, ''),
        }, apiKey);
        return;
      } catch (e) {
        // If v1 fails, try v2 format
        try {
          await signalRequest(baseUrl, '/v2/send', {
            recipients: [to],
            message: text,
            sourceNumber: fromNumber,
          }, apiKey);
          return;
        } catch (e2) {
          throw new Error(`Signal send failed: ${e2.message}`);
        }
      }
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      console.log('[PulseKit:Signal] 🎧 Webhook listener active. Configure your Signal gateway to POST to /api/webhooks/signal');
    },

    async handleWebhook(payload) {
      // Handle various Signal webhook formats
      const messages = [];

      // Format 1: signal-cli webhook format
      if (payload.envelope && payload.envelope.dataMessage) {
        messages.push({
          from: payload.envelope.sourceNumber || payload.envelope.source,
          text: payload.envelope.dataMessage.message,
        });
      }

      // Format 2: generic webhook wrapper
      if (payload.messages && Array.isArray(payload.messages)) {
        for (const msg of payload.messages) {
          messages.push({
            from: msg.from || msg.source,
            text: msg.text || msg.body || msg.message,
          });
        }
      }

      // Format 3: single message object
      if (payload.from && payload.text) {
        messages.push({
          from: payload.from,
          text: payload.text,
        });
      }

      for (const { from, text } of messages) {
        if (!text) continue;

        const reply = async (replyText) => {
          await this.send({ to: from, message: replyText });
        };

        for (const handler of messageHandlers) {
          await handler({
            from,
            text,
            reply
          });
        }
      }

      return { ok: true };
    },

    async destroy() {
      messageHandlers = [];
    },
  };
}

module.exports = { createSignalChannel };
