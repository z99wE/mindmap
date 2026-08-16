// Resend Transactional Email — REST API
// Docs: https://resend.com/docs/api-reference/emails/send-email
'use strict';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';
const RESEND_SENDER_NAME = process.env.RESEND_SENDER_NAME || 'Thought GPS';
const API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, toName, subject, htmlContent }) {
  if (!RESEND_API_KEY) {
    console.warn('[Mailer] RESEND_API_KEY not set — skipping email to', to);
    return { skipped: true };
  }

  const body = JSON.stringify({
    from: `${RESEND_SENDER_NAME} <${RESEND_SENDER_EMAIL}>`,
    to: [to],
    subject,
    html: htmlContent,
  });

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('[Mailer] Resend error:', resp.status, data);
    throw new Error(data.message || `Resend API error ${resp.status}`);
  }
  console.log('[Mailer] Email sent via Resend to', to, '| messageId:', data.id);
  return data;
}

// ── Email Templates ──────────────────────────────────────────────────────────

function waitlistTemplate({ name, plan }) {
  const displayName = name ? name.split(' ')[0] : 'there';
  const isUpdates = plan === 'updates' || plan === 'newsletter';
  const planLabel = plan === 'managed_tier' ? 'Managed / Enterprise' : 'Explorer Plus';
  
  const eyebrow = isUpdates ? 'Newsletter & Updates' : 'Early Access';
  const headline = isUpdates 
    ? `You're subscribed, ${displayName} 🚀`
    : `You're on the list, ${displayName} 🧠`;
  const bodyText = isUpdates
    ? `Thank you for subscribing to updates and news from <strong style="color:#ccff00;">Thought GPS</strong>. We'll keep you in the loop with new features, cognitive science deep-dives, and product releases.`
    : `We've reserved your spot for <strong style="color:#ccff00;">${planLabel}</strong>. You'll be among the first to experience Thought GPS when we open access.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>You're on the list</title></head>
<body style="margin:0;padding:0;background:#080a0f;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="display:inline-block;width:40px;height:40px;border-radius:12px;background:linear-gradient(145deg,#d6ff3e,#ccff00);text-align:center;line-height:40px;font:italic 700 20px Inter,system-ui;color:#000;">T</span>
          <span style="font:700 18px/40px Inter,system-ui;color:#f0f4ee;letter-spacing:-0.02em;vertical-align:top;margin-left:10px;">Thought GPS</span>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:20px;padding:40px 36px;">
          <p style="margin:0 0 8px;font:700 11px/1 Inter;letter-spacing:0.12em;color:#ccff00;text-transform:uppercase;">${eyebrow}</p>
          <h1 style="margin:0 0 16px;font:700 28px/1.2 Inter,system-ui;color:#f0f4ee;letter-spacing:-0.03em;">${headline}</h1>
          <p style="margin:0 0 24px;font:400 16px/1.6 Inter,system-ui;color:rgba(240,244,238,0.7);">${bodyText}</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
          <p style="margin:0 0 12px;font:600 13px/1 Inter;color:rgba(240,244,238,0.9);letter-spacing:0.04em;text-transform:uppercase;">What to expect</p>
          ${isUpdates ? `
          <p style="margin:0 0 6px;font:400 14px/1.6 Inter;color:rgba(240,244,238,0.7);">&#x2022; Product announcements and early feature previews</p>
          <p style="margin:0 0 6px;font:400 14px/1.6 Inter;color:rgba(240,244,238,0.7);">&#x2022; Tips for optimizing focus and navigating ADHD workflow</p>
          <p style="margin:0 0 24px;font:400 14px/1.6 Inter;color:rgba(240,244,238,0.7);">&#x2022; We promise never to spam or clutter your inbox</p>
          ` : `
          <p style="margin:0 0 6px;font:400 14px/1.6 Inter;color:rgba(240,244,238,0.7);">&#x2022; We'll email you the moment your access is ready</p>
          <p style="margin:0 0 6px;font:400 14px/1.6 Inter;color:rgba(240,244,238,0.7);">&#x2022; Early access users get a discount on the first month</p>
          <p style="margin:0 0 24px;font:400 14px/1.6 Inter;color:rgba(240,244,238,0.7);">&#x2022; Your cognitive coprocessor will be ready to help you think</p>
          `}
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
          <p style="margin:0 0 20px;font:400 14px/1.5 Inter;color:rgba(240,244,238,0.6);">In the meantime, you can start using the free tier — 10 runs/day, no card required.</p>
          <a href="https://thought-gps.onrender.com" style="display:inline-block;background:linear-gradient(145deg,#d6ff3e,#ccff00);color:#000;font:700 14px/1 Inter,system-ui;padding:14px 28px;border-radius:100px;text-decoration:none;">Try the Free Tier &#x2192;</a>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font:400 12px/1.6 Inter;color:rgba(240,244,238,0.3);">Thought GPS &#x2014; Your cognitive coprocessor<br>You're receiving this because you joined the waitlist.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeTemplate({ firstName, email }) {
  const name = firstName || email.split('@')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Welcome to Thought GPS</title></head>
<body style="margin:0;padding:0;background:#080a0f;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="display:inline-block;width:40px;height:40px;border-radius:12px;background:linear-gradient(145deg,#d6ff3e,#ccff00);text-align:center;line-height:40px;font:italic 700 20px Inter;color:#000;">T</span>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:20px;padding:40px 36px;">
          <p style="margin:0 0 8px;font:700 11px/1 Inter;letter-spacing:0.12em;color:#ccff00;text-transform:uppercase;">Welcome</p>
          <h1 style="margin:0 0 16px;font:700 28px/1.2 Inter;color:#f0f4ee;letter-spacing:-0.03em;">Hello, ${name} &#x1F44B;</h1>
          <p style="margin:0 0 24px;font:400 16px/1.6 Inter;color:rgba(240,244,238,0.7);">Your Thought GPS account is ready. Start capturing thoughts and letting your cognitive coprocessor do the heavy lifting.</p>
          <a href="https://thought-gps.onrender.com" style="display:inline-block;background:linear-gradient(145deg,#d6ff3e,#ccff00);color:#000;font:700 14px/1 Inter;padding:14px 28px;border-radius:100px;text-decoration:none;">Open Thought GPS &#x2192;</a>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font:400 12px/1.6 Inter;color:rgba(240,244,238,0.3);">Thought GPS &#x2014; Your cognitive coprocessor</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Public API ───────────────────────────────────────────────────────────────

async function sendWaitlistConfirmation({ email, name, plan }) {
  return sendEmail({
    to: email, toName: name,
    subject: `You're on the Thought GPS waitlist 🧠`,
    htmlContent: waitlistTemplate({ name, plan }),
  });
}

async function sendWelcomeEmail({ email, firstName }) {
  return sendEmail({
    to: email, toName: firstName,
    subject: `Welcome to Thought GPS, ${firstName || email.split('@')[0]}!`,
    htmlContent: welcomeTemplate({ firstName, email }),
  });
}

module.exports = { sendWaitlistConfirmation, sendWelcomeEmail };
