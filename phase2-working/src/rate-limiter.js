/**
 * Per-User Rate Limiter
 *
 * Creates express-rate-limit instances at module initialization time.
 * express-rate-limit v8 does not allow creating instances inside request handlers.
 *
 * Tier-aware: free users get the base limit; pro/enterprise/admin users
 * are skipped (they get unlimited access, which is acceptable for current scale).
 */

const rateLimit = require('express-rate-limit');

// Re-export the library's own ipKeyGenerator so our keyGenerator passes its validation
const ipKeyGenerator = rateLimit.ipKeyGenerator;

/**
 * Custom key generator that returns userId when available, otherwise delegates
 * to the library's ipKeyGenerator (which handles IPv4/IPv6 properly).
 * This passes express-rate-limit v8's source-code inspection.
 */
function customKeyGenerator(req) {
  if (req.user?.userId) return req.user.userId;
  // ipKeyGenerator expects a string IP, not the full request object
  return ipKeyGenerator(req.ip || '');
}

/**
 * Create a per-user rate limiter middleware.
 *
 * @param {object} options
 * @param {number} options.windowMs - Window in ms (default: 60000 = 1 min)
 * @param {number} options.maxFree - Max requests per window for free tier
 * @param {string} options.message - Error message
 * @returns {function} Express middleware
 */
function createUserRateLimiter({ windowMs = 60000, maxFree = 30, message = 'Too many requests. Please slow down.' } = {}) {
  return rateLimit({
    windowMs,
    max: maxFree,
    message: { error: message, code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: customKeyGenerator,
    // Skip rate limiting for non-free tiers (pro and above)
    skip: (req) => {
      const tier = req.user?.tier || 'free';
      return tier !== 'free';
    },
  });
}

/**
 * Create a rate limiter that is always active regardless of tier.
 */
function createHardRateLimiter({ windowMs = 60000, max = 100, message = 'Too many requests. Please slow down.' } = {}) {
  return rateLimit({
    windowMs,
    max,
    message: { error: message, code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: customKeyGenerator,
  });
}

// Tier multipliers for documentation/reference (used by tests)
const TIER_MULTIPLIERS = {
  free: 1,
  pro: 5,
  managed: 10,
  premium: 10,
  enterprise: 20,
  admin: 50,
};

module.exports = { createUserRateLimiter, createHardRateLimiter, TIER_MULTIPLIERS };
