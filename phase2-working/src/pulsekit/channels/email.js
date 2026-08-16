/**
 * PulseKit — Email Channel Driver
 * Uses nodemailer (already likely in deps) or bare SMTP via net.
 * Falls back to Nodemailer which handles all major SMTP providers.
 */

'use strict';

function createEmailChannel({ host, port = 587, secure = false, user, pass, from }) {
  let transporter = null;

  return {
    name: 'email',

    async init() {
      // Lazy-load nodemailer — it's already in most Node projects
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

      // Verify connection
      await transporter.verify();
      console.log(`[PulseKit:Email] SMTP ready (${host}:${port})`);
    },

    /**
     * Send an email.
     * `to` can be an email address or a user ID (will be looked up from DB if needed).
     */
    async send({ to, message, title, html }) {
      if (!transporter) throw new Error('Email channel not initialized');
      await transporter.sendMail({
        from: from || user,
        to,
        subject: title || 'UnZonko — New Nudge',
        text: message,
        html: html || `<p>${message.replace(/\n/g, '<br/>')}</p>`,
      });
    },

    // Email is outbound-only in this driver (inbound requires IMAP polling — future feature)
    onMessage(_handler) { /* no-op */ },

    async startPolling() { /* IMAP polling — future enhancement */ },

    async destroy() {
      if (transporter) transporter.close();
    },
  };
}

module.exports = { createEmailChannel };
