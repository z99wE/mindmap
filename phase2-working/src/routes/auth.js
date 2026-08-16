// Auth Routes - Register, Login, Profile, Refresh
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, signToken, signRefreshToken, verifyToken, authMiddleware } = require('../auth');
const { getDevAdminCredentials } = require('../dev-admin');

// Rate limit registration: max 5 per IP per hour
const registerLimiter = rateLimit({
  windowMs: 3600000,
  max: 5,
  message: { error: 'Too many registrations from this IP. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limit: max 10 per IP per 15 min
const loginLimiter = rateLimit({
  windowMs: 900000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper for basic email and password validation
function validateEmailPassword(email, password) {
  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return 'Invalid email format';
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return null;
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, username, profession, country } = req.body;
    const validationError = validateEmailPassword(email, password);
    if (validationError) return res.status(400).json({ error: validationError });

    // Optional: validate username format
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscores only)' });
    }

    const rawAllowed = process.env.ALLOWED_ADMIN_EMAILS || 'viktorechakraborty@gmail.com,vikkivoda@gmail.com,admin@thoughtgps.local';
    const allowedEmails = rawAllowed.split(',').map(e => e.trim().toLowerCase());
    const isWhitelisted = allowedEmails.includes(email.trim().toLowerCase());

    const rawAllowedBeta = process.env.ALLOWED_BETA_EMAILS || '';
    const allowedBetaEmails = rawAllowedBeta.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isBetaWhitelisted = allowedBetaEmails.includes(email.trim().toLowerCase());

    // Lock registration in production to whitelisted admin/beta emails only
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && !isWhitelisted && !isBetaWhitelisted) {
      return res.status(403).json({ error: 'Unzonk is currently in private beta. Registration is restricted.' });
    }

    // Auto-promote whitelisted admin registrations; normal registrations get free tier
    const overrides = isWhitelisted
      ? { is_admin: true, tier: 'admin', daily_runs_limit: 1000 }
      : { is_admin: false, tier: 'free', daily_runs_limit: 10 };

    const user = await register(email, password, { firstName, lastName, username, profession, country }, overrides);
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    // Send welcome email (non-blocking)
    try {
      const { sendWelcomeEmail } = require('../mailer');
      sendWelcomeEmail({ email: user.email, firstName: user.first_name }).catch(() => {});
    } catch (e) { /* mailer unavailable */ }

    res.status(201).json({
      user: {
        id: user.id, email: user.email, tier: user.tier,
        firstName: user.first_name, lastName: user.last_name,
        username: user.username, profession: user.profession, country: user.country,
      },
      token,
      refreshToken,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/auth/dev-admin-hint — local-network convenience for the seeded dev
// admin. Returns the credentials on non-production instances, or
// { available: false } in production (where no admin account exists).
router.get('/dev-admin-hint', (req, res) => {
  const creds = getDevAdminCredentials();
  if (!creds) return res.json({ available: false });
  res.json({ available: true, email: creds.email, password: creds.password });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const validationError = validateEmailPassword(email, password);
    if (validationError) return res.status(400).json({ error: validationError });
    const user = await login(email, password);
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        isAdmin: user.is_admin,
        dailyRunsUsed: user.daily_runs_used,
        dailyRunsLimit: user.daily_runs_limit,
        totalCredits: user.total_credits,
      },
      token,
      refreshToken,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const result = await pool.query(
      `SELECT id, email, tier, is_admin, daily_runs_used, daily_runs_limit,
              total_credits, notification_prefs, witness_contacts, data_sharing, web_search,
              first_name, last_name, username, profession, country, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      tier: u.tier,
      isAdmin: u.is_admin,
      dailyRunsUsed: u.daily_runs_used,
      dailyRunsLimit: u.daily_runs_limit,
      totalCredits: u.total_credits,
      notificationPrefs: u.notification_prefs,
      witnessContacts: u.witness_contacts,
      dataSharing: u.data_sharing,
      webSearch: u.web_search,
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
      profession: u.profession,
      country: u.country,
      createdAt: u.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const payload = verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const { pool } = require('../db');
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    const token = signToken(user);
    const newRefresh = signRefreshToken(user);
    res.json({ token, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// PUT /api/auth/profile — update user profile fields
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const { firstName, lastName, username, profession, country } = req.body;

    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscores only)' });
    }

    // Check username uniqueness if provided
    if (username) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE lower(username) = lower($1) AND id != $2',
        [username, req.user.userId]
      );
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });
    }

    const result = await pool.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        username   = COALESCE($3, username),
        profession = COALESCE($4, profession),
        country    = COALESCE($5, country),
        updated_at = NOW()
       WHERE id = $6
       RETURNING id, email, tier, first_name, last_name, username, profession, country`,
      [firstName || null, lastName || null, username || null, profession || null, country || null, req.user.userId]
    );
    const u = result.rows[0];
    res.json({
      success: true,
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
      profession: u.profession,
      country: u.country,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/notification-prefs
router.put('/notification-prefs', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const { prefs } = req.body;
    await pool.query(
      'UPDATE users SET notification_prefs = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(prefs), req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/data-sharing
router.put('/data-sharing', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const { dataSharing } = req.body;
    if (typeof dataSharing !== 'boolean') {
      return res.status(400).json({ error: 'dataSharing must be a boolean' });
    }
    await pool.query(
      'UPDATE users SET data_sharing = $1, updated_at = NOW() WHERE id = $2',
      [dataSharing, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/web-search
router.put('/web-search', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const { webSearch } = req.body;
    if (typeof webSearch !== 'boolean') {
      return res.status(400).json({ error: 'webSearch must be a boolean' });
    }
    await pool.query(
      'UPDATE users SET web_search = $1, updated_at = NOW() WHERE id = $2',
      [webSearch, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/account → use the safer GDPR flow in memory.js instead.
// Account deletion is a destructive cascade (memories, channels, notifications, billing)
// and memory.js requires a confirmation token obtained via POST /api/memory/account/delete-request.
// The frontend routes through that flow; keep this path consistent with it.
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const { confirmationToken } = req.body;
    const userId = req.user.userId;

    if (!confirmationToken) {
      return res.status(400).json({ error: 'Confirmation token required. Call POST /api/memory/account/delete-request first.' });
    }

    // Delegate to the memory.js deletion logic (single source of truth for the cascade)
    const memoryRoutes = require('./memory');
    const tokenData = memoryRoutes.verifyDeletionToken?.(confirmationToken, userId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired confirmation token' });
    }

    await pool.query('DELETE FROM memory_graph WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM channels WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM billing_transactions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM api_key_log WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [userId]);

    await pool.query(
      `UPDATE users SET email = $1, password_hash = 'DELETED', tier = 'free',
       api_keys = '{}', notification_prefs = '{}', witness_contacts = '[]',
       daily_runs_used = 0, daily_runs_limit = 0, total_credits = 0,
       subscription_status = 'deleted', updated_at = NOW()
       WHERE id = $2`,
      [`deleted_${userId}@removed.local`, userId]
    );

    memoryRoutes.consumeDeletionToken?.(confirmationToken);

    res.json({ success: true, message: 'Account and all data permanently deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/witness-contacts
router.put('/witness-contacts', authMiddleware, async (req, res) => {
  try {
    const { pool } = require('../db');
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts must be an array' });
    await pool.query(
      'UPDATE users SET witness_contacts = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(contacts), req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
