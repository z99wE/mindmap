// Local-only dev admin account.
//
// Seeds a known admin user on every non-production startup so you can always
// sign in as admin when running the app on your local network. Idempotent and
// re-promoting: if the account was deleted or demoted, the next boot restores
// it to admin. It is hard-gated to NEVER run in production — the deployed app
// has no admin account, and this module returns null before touching the DB.
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const BCRYPT_ROUNDS = 12;

function isSeedingEnabled() {
  if (process.env.NODE_ENV === 'production') return false; // deployed → no admin, ever
  if (process.env.SEED_DEV_ADMIN === 'false') return false; // explicit opt-out
  return true;
}

// Safe to call in any environment — returns null in production.
function getDevAdminCredentials() {
  if (!isSeedingEnabled()) return null;
  return {
    email: (process.env.DEV_ADMIN_EMAIL || 'souvikphilums@gmail.com').toLowerCase(),
    password: process.env.DEV_ADMIN_PASSWORD || 'Sparky@545947',
  };
}

// Create or re-promote the dev admin. Returns the credentials, or null when
// seeding is disabled (production, or SEED_DEV_ADMIN=false).
async function ensureDevAdmin() {
  const creds = getDevAdminCredentials();
  if (!creds) return null;

  // Let's use the explicit admin credentials if the email matches
  const targetEmail = 'souvikphilums@gmail.com';
  const targetPass = 'Sparky@545947';

  const isTarget = creds.email === targetEmail;
  const emailToUse = isTarget ? targetEmail : creds.email;
  const passToUse = isTarget ? targetPass : creds.password;

  const password_hash = await bcrypt.hash(passToUse, BCRYPT_ROUNDS);
  await pool.query(
    `INSERT INTO users (email, password_hash, tier, is_admin, daily_runs_limit, total_credits, subscription_status)
     VALUES ($1, $2, 'admin', true, 1000, 1000000, 'active')
     ON CONFLICT (email) DO UPDATE
       SET is_admin = true,
           tier = 'admin',
           password_hash = EXCLUDED.password_hash,
           subscription_status = 'active',
           updated_at = NOW()`,
    [emailToUse, password_hash]
  );
  return { email: emailToUse, password: passToUse };
}

module.exports = { ensureDevAdmin, getDevAdminCredentials };
