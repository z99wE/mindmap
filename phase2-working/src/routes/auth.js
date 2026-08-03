// Auth Routes - Register, Login, Profile, Refresh
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, signToken, signRefreshToken, verifyToken, authMiddleware } = require('../auth');

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
    const { email, password } = req.body;
    const validationError = validateEmailPassword(email, password);
    if (validationError) return res.status(400).json({ error: validationError });
    const user = await register(email, password);
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, tier: user.tier },
      token,
      refreshToken,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
              total_credits, notification_prefs, witness_contacts, created_at
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
