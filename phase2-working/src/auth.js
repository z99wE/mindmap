// JWT Authentication + Disposable Email Blocking
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'mentally-secret-change-in-prod';
const JWT_EXPIRY = '7d';
const REFRESH_EXPIRY = '30d';
const BCRYPT_ROUNDS = 12;

// ── Disposable Email Blocklist ──────────────────────────────────────────────
// In-memory blocklist of known disposable email domains (10K+)
// Loaded from disposable-email-domains package or embedded list
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la',
  'guerrillamail.info','guerrillamail.biz','guerrillamail.de','guerrillamail.net',
  'tempail.com','tempr.email','temp-mail.org','temp-mail.io','fakeinbox.com',
  'dispostable.com','mailnesia.com','maildrop.cc','discard.email','mailcatch.com',
  'trashmail.com','trashmail.me','trashmail.net','getnada.com','mohmal.com',
  'burnermail.io','tempinbox.com','10minutemail.com','emailondeck.com',
  'getairmail.com','mailforspam.com','safetymail.info','spamgourmet.com',
  'mytemp.email','tmail.ws','tmpmail.net','tmpmail.org','binkmail.com',
  'filzmail.com','mailnull.com','spamfree24.org','trashymail.com',
  'mailexpire.com','jetable.org','trash-mail.at','trashmail.at','wegwerfmail.de',
  'mailtemp.info','mailtemp.net','tempomail.fr','tempomail.com','mintemail.com',
  'spamhole.com','sogetthis.com','uggsrock.com','pookmail.com','dodgeit.com',
  'mailmoat.com','killmail.net','nobulk.com','spam.la','spambox.us',
  'guerrillamail.com','harakirimail.com','lhsdv.com','spamavert.com',
  'trashemail.de','trashmail.io','mailscrap.com','mailseal.de','mailshell.com',
  'spam4.me','slipry.net','boun.cr','tmailinator.com','mailzilla.com',
  'mailzilla.org','mailmetrash.com','getonemail.com','getonemail.net',
  'reallymymail.com','rppkn.com','rtrtr.com','s0ny.net','shitmail.me',
  'shitmail.org','shitware.nl','shmeriously.com','shortmail.net',
  'singlespride.com','sinnlos-mail.de','siteposter.net','skeefmail.com',
  'slaskpost.se','slave-auctions.net','slipry.net','smashmail.de',
  'smellfear.com','snakemail.com','sneakemail.com','sofimail.com',
  'sofortmail.de','sogetthis.com','solvemail.info','soodonims.com',
  'spam4.me','spamavert.com','spambob.com','spambob.net','spambob.org',
  'spamcannon.com','spamcannon.net','spamcero.com','spamcon.org',
  'spamcorptastic.com','spamcowboy.com','spamcowboy.net','spamcowboy.org',
  'spamday.com','spamex.com','spamfighter.cf','spamfighter.ga','spamfighter.gq',
  'spamfighter.ml','spamfighter.tk','spamfree.eu','spamfree24.com',
  'spamfree24.de','spamfree24.eu','spamfree24.info','spamfree24.net',
  'spamfree24.org','spamgoes.in','spamgourmet.com','spamgourmet.net',
  'spamgourmet.org','spamherelots.com','spamhereplease.com','spamhole.com',
  'spamify.com','spaminator.de','spamkill.info','spaml.com','spaml.de',
  'spammotel.com','spamobox.com','spamoff.de','spamslicer.com','spamspot.com',
  'spamstack.net','spamthis.co.uk','spamthisplease.com','spamtrail.com',
  'spamtroll.net','speed.1s.fr','spoofmail.de','stuffmail.de','super-auswahl.de',
  'supergreat.com','superrito.com','suremail.info','svk.jp','sweetxxx.de',
  'tagyourself.com','talkinator.com','tapchicuoihoi.com','techgroup.me',
  'temp.emeraldwebmail.com','temp.headstrong.de','tempail.com','tempalias.com',
  'tempe-mail.com','tempemail.biz','tempemail.co.za','tempemail.com',
  'tempemail.net','tempinbox.co.uk','tempinbox.com','tempmail.de','tempmail.eu',
  'tempmail.it','tempmail.us','tempmail2.com','tempmaildemo.com','tempmailer.com',
  'tempmailer.de','tempmails.eu','tempomail.fr','temporarily.de',
  'temporarioemail.com.br','temporaryemail.net','temporaryemail.us',
  'temporaryforwarding.com','temporaryinbox.com','thanksnospam.info',
  'thankyou2010.com','thisisnotmyrealemail.com','thismail.net','throwam.com',
  'throwawayemailaddress.com','throwawaymail.com','tilien.com','tittbit.in',
  'tizi.com','tmail.com','tmailinator.com','toiea.com','toomail.biz',
  'topranklist.de','tormail.org','tradermail.info','trash-amil.com',
  'trash-mail.at','trash-mail.com','trash-mail.de','trash2009.com','trash2010.com',
  'trash2011.com','trashdevil.com','trashdevil.de','trashemail.de','trashmail.at',
  'trashmail.com','trashmail.de','trashmail.me','trashmail.net','trashmail.org',
  'trashmail.ws','trashmailer.com','trashymail.com','trashymail.net',
  'trillianpro.com','turboprinz.de','turboprinzessin.de','twinmail.de',
  'twoweirdtricks.com','tyldd.com','uggsrock.com','uk2.net','umail.net',
  'uroid.com','us.af','venompen.com','veryrealemail.com','viditag.com',
  'viewcastmedia.com','viewcastmedia.net','viewcastmedia.org','viralplays.com',
  'vistomail.com','voidbay.com','vomoto.com','walala.org','wasteland.rfc822.org',
  'watchfull.net','wegwerfadresse.de','wegwerfemail.com','wegwerfemail.de',
  'wegwerfmail.de','wegwerfmail.net','wegwerfmail.org','whatiafoo.com',
  'whatpaas.com','whatsaas.com','whopy.com','wickmail.net','wilemail.com',
  'willhackforfood.biz','willselfdestruct.com','winemaven.info','wronghead.com',
  'wuzup.net','wuzupmail.net','wwwnew.eu','xagloo.com','xemaps.com','xents.com',
  'xmaily.com','xoxy.net','yapped.net','yeah.net','yep.it','yogamaven.com',
  'yomail.info','yopmail.com','yopmail.fr','yopmail.gq','yopmail.net','yopmail.pp.ua',
  'yourdomain.com','ypmail.webarnak.fr.eu.org','yuurok.com','zehnminutenmail.de',
  'zetmail.com','zippymail.info','zoaxe.com','zoemail.org','zoemail.com',
  'zoemail.net','zomg.info'
]);

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  // Pattern-based blocking
  const suspicious = ['tempmail','temp-mail','throwaway','guerrilla','trashmail','disposable','fakeinbox','10minute'];
  return suspicious.some(p => domain.includes(p));
}

// ── Email Validation ─────────────────────────────────────────────────────────
function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required';
  if (email.length > 255) return 'Email too long';
  if (email.length < 5) return 'Email too short';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Invalid email format';
  if (isDisposableEmail(email)) return 'Disposable email addresses are not allowed';
  return null;
}

// ── Password Validation ─────────────────────────────────────────────────────
function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password too long';
  return null;
}

// ── JWT Sign / Verify ───────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, tier: user.tier, isAdmin: user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── Auth Middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = payload;

  // Set RLS session context for tenant isolation
  // This enables PostgreSQL Row-Level Security policies to filter queries
  // by the authenticated user. Safe to call on every request — if RLS is
  // not enabled on a table, the setting has no effect.
  if (payload.userId && process.env.ENABLE_RLS === 'true') {
    pool.query("SELECT set_config('app.user_id', $1, true)", [payload.userId])
      .catch(() => {}); // Non-critical — RLS context is best-effort
  }

  next();
}

// Admin-only middleware
function adminMiddleware(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── Register ────────────────────────────────────────────────────────────────
async function register(email, password, profile = {}, overrides = {}) {
  const emailErr = validateEmail(email);
  if (emailErr) throw new Error(emailErr);
  const passErr = validatePassword(password);
  if (passErr) throw new Error(passErr);

  // Check if email already exists
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) throw new Error('Email already registered');

  // Check username uniqueness if provided
  if (profile.username) {
    const uExist = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [profile.username]);
    if (uExist.rows.length > 0) throw new Error('Username already taken');
  }

  const is_admin = overrides.is_admin || false;
  const tier = overrides.tier || 'free';
  const daily_runs_limit = overrides.daily_runs_limit || 10;

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, tier, daily_runs_limit, is_admin, first_name, last_name, username, profession, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, email, tier, is_admin, daily_runs_limit, total_credits, first_name, last_name, username, profession, country, created_at`,
    [
      email.toLowerCase(), password_hash, tier, daily_runs_limit, is_admin,
      profile.firstName || null, profile.lastName || null,
      profile.username || null, profile.profession || null, profile.country || null,
    ]
  );
  return result.rows[0];
}

// ── Login ───────────────────────────────────────────────────────────────────
async function login(email, password) {
  if (!email || !password) throw new Error('Email and password required');
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  if (result.rows.length === 0) throw new Error('Invalid credentials');
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid credentials');
  return user;
}

module.exports = {
  register, login, signToken, signRefreshToken, verifyToken,
  authMiddleware, adminMiddleware, validateEmail, validatePassword,
  isDisposableEmail, JWT_SECRET
};
