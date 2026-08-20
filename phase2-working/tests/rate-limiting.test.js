/**
 * Rate Limiter Unit Tests
 */
const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { userId: 'test-uuid', tier: 'free', isAdmin: false };
    next();
  },
}));

const { createUserRateLimiter, createHardRateLimiter, TIER_MULTIPLIERS } = require('../src/rate-limiter');

describe('TIER_MULTIPLIERS', () => {
  test('free tier has multiplier 1', () => {
    expect(TIER_MULTIPLIERS.free).toBe(1);
  });

  test('pro tier has higher multiplier', () => {
    expect(TIER_MULTIPLIERS.pro).toBe(5);
  });

  test('admin tier has highest multiplier', () => {
    expect(TIER_MULTIPLIERS.admin).toBe(50);
  });
});

describe('createUserRateLimiter', () => {
  test('returns a middleware function', () => {
    const middleware = createUserRateLimiter();
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3);
  });

  test('uses default options when none provided', () => {
    const middleware = createUserRateLimiter();
    expect(typeof middleware).toBe('function');
  });

  test('accepts custom options', () => {
    const middleware = createUserRateLimiter({ windowMs: 5000, maxFree: 5, message: 'Custom' });
    expect(typeof middleware).toBe('function');
  });
});

describe('createHardRateLimiter', () => {
  test('returns a middleware function', () => {
    const middleware = createHardRateLimiter();
    expect(typeof middleware).toBe('function');
  });
});

describe('Rate limiter integration with Express', () => {
  test('allows requests under the limit', async () => {
    const app = express();
    const limiter = createUserRateLimiter({ windowMs: 60000, maxFree: 100 });
    app.use('/test', limiter);
    app.get('/test', (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  test('hard rate limiter returns 429 when over limit', async () => {
    const app = express();
    const limiter = createHardRateLimiter({ windowMs: 60000, max: 1, message: 'Over limit' });
    app.use('/test', limiter);
    app.get('/test', (req, res) => res.json({ ok: true }));

    // First request should pass
    const res1 = await request(app).get('/test');
    expect(res1.status).toBe(200);

    // Second request should be rate limited
    const res2 = await request(app).get('/test');
    expect(res2.status).toBe(429);
    expect(res2.body.error).toContain('Over limit');
  });
});

describe('Rate limiter user tier awareness', () => {
  function createAppWithTier(tier, isAdmin = false) {
    const app = express();
    // Simulate auth middleware setting user with specific tier
    app.use((req, _res, next) => {
      req.user = { userId: 'test-uuid', tier, isAdmin };
      next();
    });
    // Hard limiter applies to all tiers
    const limiter = createHardRateLimiter({ windowMs: 60000, max: 1 });
    app.use('/test', limiter);
    app.get('/test', (req, res) => res.json({ ok: true }));
    return app;
  }

  test('user gets rate limited when over threshold', async () => {
    const app = createAppWithTier('free');

    const res1 = await request(app).get('/test');
    expect(res1.status).toBe(200);

    const res2 = await request(app).get('/test');
    expect(res2.status).toBe(429);
  });
});

describe('createUserRateLimiter skips non-free tiers', () => {
  function createAppWithTier(tier) {
    const app = express();
    app.use((req, _res, next) => {
      req.user = { userId: 'test-uuid', tier, isAdmin: tier === 'admin' };
      next();
    });
    // User rate limiter is tier-aware
    const limiter = createUserRateLimiter({ windowMs: 60000, maxFree: 1 });
    app.use('/test', limiter);
    app.get('/test', (req, res) => res.json({ ok: true }));
    return app;
  }

  test('free user gets limited at low threshold', async () => {
    const app = createAppWithTier('free');
    const res1 = await request(app).get('/test');
    expect(res1.status).toBe(200);
    const res2 = await request(app).get('/test');
    expect(res2.status).toBe(429);
  });

  test('pro user is not rate limited by user limiter', async () => {
    const app = createAppWithTier('pro');
    // Pro users should be able to make multiple requests
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  test('admin user is not rate limited', async () => {
    const app = createAppWithTier('admin');
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });
});
