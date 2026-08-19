/**
 * PulseKit — SMS Channel Driver
 * 
 * Generic SMS driver supporting multiple providers:
 * - Twilio (default, most common)
 * - Vonage (Nexmo)
 * - AWS SNS (Simple Notification Service)
 * 
 * Provider is auto-detected from the API key format or configurable.
 */

'use strict';

const https = require('https');

function smsRequest(hostname, path, method, auth, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const authHeader = auth ? 'Basic ' + Buffer.from(auth).toString('base64') : '';
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.message || parsed.error_message || `SMS API ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          if (res.statusCode >= 400) reject(new Error(`SMS API ${res.statusCode}`));
          else resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Create an SMS channel driver.
 * 
 * @param {object} options
 * @param {string} options.apiKey    - Twilio: "ACCOUNT_SID:AUTH_TOKEN" | Vonage: "API_KEY:API_SECRET"
 * @param {string} options.phoneNumber - Sender phone number (with country code)
 * @param {string} options.provider  - 'twilio' (default), 'vonage'
 */
function createSmsChannel({ apiKey, phoneNumber, provider = 'twilio' }) {
  let messageHandlers = [];

  return {
    name: 'sms',

    async init() {
      if (!apiKey) {
        console.log('[PulseKit:SMS] No API key configured. SMS unavailable.');
        return;
      }
      console.log(`[PulseKit:SMS] Ready via ${provider} (${phoneNumber})`);
    },

    async send({ to, message, title }) {
      if (!apiKey) throw new Error('SMS API key not configured');
      if (!phoneNumber) throw new Error('SMS sender phone number not configured');

      const text = title ? `${title}: ${message}` : message;
      // Strip + from numbers for consistency
      const fromNum = phoneNumber.replace(/^\+/, '');
      const toNum = to.replace(/^\+/, '');

      if (provider === 'twilio') {
        const [sid, token] = apiKey.split(':');
        if (!sid || !token) throw new Error('Twilio API key must be in format: ACCOUNT_SID:AUTH_TOKEN');
        const payload = `From=%2B${fromNum}&To=%2B${toNum}&Body=${encodeURIComponent(text)}`;
        await smsRequest(
          'api.twilio.com',
          `/2010-04-01/Accounts/${sid}/Messages.json`,
          'POST',
          `${sid}:${token}`,
          payload
        );
      } else if (provider === 'vonage') {
        const [key, secret] = apiKey.split(':');
        if (!key || !secret) throw new Error('Vonage API key must be in format: API_KEY:API_SECRET');
        const payload = `from=${fromNum}&to=${toNum}&text=${encodeURIComponent(text)}&api_key=${key}&api_secret=${secret}`;
        await smsRequest('rest.nexmo.com', '/sms/json', 'POST', null, payload);
      } else {
        throw new Error(`Unsupported SMS provider: ${provider}`);
      }
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      console.log('[PulseKit:SMS] 📱 SMS is outbound-only. Use a webhook service for incoming SMS.');
    },

    async handleWebhook(payload) {
      // Twilio inbound SMS webhook format
      if (payload.From && payload.Body) {
        const reply = async (text) => {
          await this.send({ to: payload.From, message: text });
        };
        for (const handler of messageHandlers) {
          await handler({ from: payload.From, text: payload.Body, reply });
        }
      }
      // Vonage inbound SMS webhook format
      if (payload.msisdn && payload.text) {
        const reply = async (text) => {
          await this.send({ to: payload.msisdn, message: text });
        };
        for (const handler of messageHandlers) {
          await handler({ from: payload.msisdn, text: payload.text, reply });
        }
      }
      return { ok: true };
    },

    async destroy() {
      messageHandlers = [];
    },
  };
}

module.exports = { createSmsChannel };
