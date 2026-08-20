/**
 * Billing & Tier System Tests
 */
const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => { req.user = { userId: 'test-uuid', tier: 'free', isAdmin: false }; next(); },
}));

const { pool } = require('../src/db');
const billingRouter = require('../src/routes/billing');

const app = express();
app.use(express.json());
app.use('/api/billing', billingRouter);

beforeEach(() => jest.clearAllMocks());

describe('GET /api/billing/tiers', () => {
  test('returns tier list', async () => {
    const res = await request(app).get('/api/billing/tiers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tiers');
    // tiers endpoint returns { tiers: { free: ..., pro: ..., managed: ... } }
    // it does NOT return currentTier (that's on /status)
  });
});

describe('GET /api/billing/status', () => {
  test('returns user credit info', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        tier: 'free',
        daily_runs_used: 3,
        daily_runs_limit: 10,
        total_credits: 100,
        subscription_status: 'none',
        razorpay_customer_id: null,
      }],
    });

    const res = await request(app).get('/api/billing/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dailyRunsUsed');
    expect(res.body).toHaveProperty('dailyRunsLimit');
    expect(res.body).toHaveProperty('totalCredits');
    expect(res.body).toHaveProperty('tier');
  });

  test('handles DB error gracefully', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/billing/status');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/billing/boosters', () => {
  test('returns boosters list', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 'b1', bundle_name: 'starter', total_runs: 500, runs_used: 50, created_at: new Date(), expires_at: new Date(Date.now() + 86400000) },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app).get('/api/billing/boosters');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('boostersList');
  });
});

describe('GET /api/billing/history', () => {
  test('returns transaction history', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/billing/history');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/billing/waitlist', () => {
  test('adds to waitlist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'w-1', email_sent: false }] });
    const res = await request(app).post('/api/billing/waitlist').send({ email: 'test@test.com', name: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects missing email', async () => {
    const res = await request(app).post('/api/billing/waitlist').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });
});
