/**
 * PulseKit — WhatsApp Channel Driver (Cloud API)
 * Uses Meta Graph API (v19.0+) to send and receive WhatsApp messages.
 */

'use strict';

const https = require('https');

function whatsappRequest(token, phoneId, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v19.0/${phoneId}/messages`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
          if (parsed.error) reject(new Error(parsed.error.message || 'WhatsApp API error'));
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

function createWhatsappChannel({ token, phoneId }) {
  let messageHandlers = [];

  return {
    name: 'whatsapp',

    async init() {
      if (!token || !phoneId) {
        console.log(`[PulseKit:WhatsApp] Initialized in webhook-only mode (no global token).`);
        return;
      }
      console.log(`[PulseKit:WhatsApp] Active for Phone ID: ${phoneId}`);
    },

    /**
     * Send a WhatsApp message.
     * `to` should be a phone number with country code (e.g. 15551234567)
     */
    async send({ to, message, title }) {
      if (!token || !phoneId) throw new Error('WhatsApp token or phoneId missing');
      
      const text = title ? `*${title}*\n\n${message}` : message;

      await whatsappRequest(token, phoneId, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      });
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      console.log('[PulseKit:WhatsApp] 🎧 Webhook listener active. Configure Webhook in Meta dashboard.');
    },

    async handleWebhook(payload) {
      // Handle WhatsApp Cloud API webhook format
      if (payload.object === 'whatsapp_business_account' && payload.entry) {
        for (const entry of payload.entry) {
          for (const change of entry.changes) {
            const value = change.value;
            if (value && value.messages && value.messages.length > 0) {
              for (const msg of value.messages) {
                if (msg.type === 'text') {
                  const reply = async (text) => {
                    // WhatsApp requires the recipient's phone number as the 'to' field
                    if (token && phoneId) {
                       await this.send({ to: msg.from, message: text });
                    }
                  };

                  for (const handler of messageHandlers) {
                    await handler({
                      from: msg.from, // Sender phone number
                      text: msg.text.body,
                      reply
                    });
                  }
                }
              }
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

module.exports = { createWhatsappChannel };
