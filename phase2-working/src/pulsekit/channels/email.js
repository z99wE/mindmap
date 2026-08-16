/**
 * PulseKit — Email Channel Driver
 * Uses nodemailer (already likely in deps) or bare SMTP via net.
 * Falls back to Nodemailer which handles all major SMTP providers.
 */

'use strict';

function createEmailChannel({ host, port = 587, secure = false, user, pass, from }) {
  let messageHandlers = [];
  let imapConnection = null;

  return {
    name: 'email',

    async init() {
      let nodemailer;
      try {
        nodemailer = require('nodemailer');
      } catch {
        throw new Error('nodemailer is not installed. Run: npm install nodemailer');
      }

      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });

      await transporter.verify();
      console.log(`[PulseKit:Email] SMTP ready (${host}:${port})`);
    },

    async send({ to, message, title, html }) {
      if (!transporter) throw new Error('Email channel not initialized');
      await transporter.sendMail({
        from: from || user,
        to,
        subject: title || 'ThoughtGPS — New Nudge',
        text: message,
        html: html || `<p>${message.replace(/\n/g, '<br/>')}</p>`,
      });
    },

    onMessage(handler) {
      messageHandlers.push(handler);
    },

    async startPolling() {
      if (!user || !pass) return;

      // Guess IMAP host from SMTP host (e.g. smtp.gmail.com -> imap.gmail.com)
      const imapHost = host.replace('smtp', 'imap');
      let imap;
      const { simpleParser } = require('mailparser');

      try {
        imap = require('imap-simple');
      } catch {
        console.warn('[PulseKit:Email] imap-simple not installed. Inbound disabled.');
        return;
      }

      const config = {
        imap: {
          user,
          password: pass,
          host: imapHost,
          port: 993,
          tls: true,
          authTimeout: 3000,
          tlsOptions: { rejectUnauthorized: false }
        },
        onmail: async (numNewMail) => {
          if (!imapConnection) return;
          try {
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };
            const messages = await imapConnection.search(searchCriteria, fetchOptions);
            
            for (const msg of messages) {
              const allParts = imap.getParts(msg.attributes.struct);
              const body = msg.parts.find(p => p.which === 'TEXT');
              const header = msg.parts.find(p => p.which === 'HEADER');
              
              if (body && header) {
                const parsed = await simpleParser(body.body);
                // Simple filter: Only ingest if from the user's own email (note-to-self) 
                // or if it's a direct reply to ThoughtGPS.
                const sender = (parsed.from && parsed.from.value && parsed.from.value[0]) ? parsed.from.value[0].address : '';
                
                if (sender === user) {
                  const reply = async (text) => {
                    await this.send({ to: sender, message: text });
                  };
                  for (const handler of messageHandlers) {
                    await handler({
                      from: sender,
                      text: parsed.text || parsed.html || '(Empty Email)',
                      reply
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error('[PulseKit:Email] Error reading mail:', e.message);
          }
        }
      };

      try {
        imapConnection = await imap.connect(config);
        await imapConnection.openBox('INBOX');
        console.log(`[PulseKit:Email] 🎧 IMAP polling active for ${user}`);
      } catch (e) {
        console.warn(`[PulseKit:Email] IMAP polling failed for ${user}:`, e.message);
      }
    },

    async destroy() {
      messageHandlers = [];
      if (transporter) transporter.close();
      if (imapConnection) imapConnection.end();
    },
  };
}

module.exports = { createEmailChannel };
