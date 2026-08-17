/**
 * Admin API Route Tests
 * 
 * Tests: GET /health, GET /users, PUT /users/:id/tier,
 * GET /key-pool, GET /stats, GET /backup,
 * GET /channels, GET /channels/stats, POST /channels/:id/deliver
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

// Mock auth middleware — both auth and admin
jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { userId: 'admin-uuid', isAdmin: true };
    next();
  },
  adminMiddleware: (req, _res, next) => {
    if (!req.user?.isAdmin) return _res.status(403).json({ error: 'Admin access required' });
    next();
  },
}));

jest.mock('../src/key-pool', () => ({
  keyPool: {
    getStatus: jest.fn().mockReturnValue({
      totalKeys: 5,
      byProvider: { groq: 2, openai: 2, anthropic: 1 },
      coolingDown: [],
      usage: [],
    }),
  },
}));

jest.mock('../src/middleware', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/crypto', () => ({
  decrypt: jest.fn((s) => {
    try { return JSON.stringify({ bot_token: 'test', chat_id: '123' }); } catch { return s; }
  }),
}));

const { pool } = require('../src/db');
const adminRouter = require('../src/routes/admin');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/admin', adminRouter);

// Mock pulseKit for channel endpoints (use locals, do NOT override app.get)
const mockPulseKit = {
  channels: ['telegram', 'email'],
  isLive: true,
  send: jest.fn().mockResolvedValue({ delivered: true, via: 'global', errors: [] }),
};
app.locals.pulseKit = mockPulseKit;

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/health
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/health', () => {
  test('returns system health', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ ok: 1 }] })        // db check
      .mockResolvedValueOnce({ rows: [{ count: 10 }] })     // user count
      .mockResolvedValueOnce({ rows: [{ count: 250 }] });   // memory count

    const res = await request(app).get('/api/admin/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('healthy');
    expect(res.body.users).toBe(10);
    expect(res.body.memories).toBe(250);
    expect(res.body).toHaveProperty('keyPool');
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/users
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/users', () => {
  test('returns user list', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'u1', email: 'a@b.com', tier: 'free', is_admin: false, daily_runs_used: 3, daily_runs_limit: 10, total_credits: 0, subscription_status: 'none', created_at: new Date() },
        { id: 'u2', email: 'admin@b.com', tier: 'admin', is_admin: true, daily_runs_used: 0, daily_runs_limit: 1000, total_credits: 100, subscription_status: 'active', created_at: new Date() },
      ],
    });

    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0].email).toBe('a@b.com');
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/admin/users/:id/tier
// ═══════════════════════════════════════════════════════════
describe('PUT /api/admin/users/:id/tier', () => {
  test('updates user tier successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE returns empty

    const res = await request(app)
      .put('/api/admin/users/u-123/tier')
      .send({ tier: 'pro' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects invalid tier', async () => {
    const res = await request(app)
      .put('/api/admin/users/u-123/tier')
      .send({ tier: 'superadmin' });

    expect(res.status).toBe(400);
  });

  test('rejects missing tier', async () => {
    const res = await request(app)
      .put('/api/admin/users/u-123/tier')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/key-pool
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/key-pool', () => {
  test('returns key pool status', async () => {
    const res = await request(app).get('/api/admin/key-pool');
    expect(res.status).toBe(200);
    expect(res.body.totalKeys).toBe(5);
    expect(res.body.byProvider).toHaveProperty('groq');
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/stats
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/stats', () => {
  test('returns platform statistics', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: 10, premium: 2 }] })    // users
      .mockResolvedValueOnce({ rows: [{ total: 500 }] })                // memories
      .mockResolvedValueOnce({ rows: [{ total: 50, delivered: 30 }] })  // notifications
      .mockResolvedValueOnce({ rows: [{ total: 8 }] })                  // channels
      .mockResolvedValueOnce({ rows: [{ total: 20, total_runs: 500 }] }); // billing

    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.users.total).toBe(10);
    expect(res.body.memories).toBe(500);
    expect(res.body.activeChannels).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/backup
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/backup', () => {
  test('returns system backup', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [mockUser] })      // users
      .mockResolvedValueOnce({ rows: [] })               // memories
      .mockResolvedValueOnce({ rows: [] })               // keys
      .mockResolvedValueOnce({ rows: [] });              // channels

    const res = await request(app).get('/api/admin/backup');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.text);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('data');
  });
});

const mockUser = {
  id: 'u1', email: 'a@b.com', password_hash: 'hash', tier: 'free',
  is_admin: false, daily_runs_used: 0, daily_runs_limit: 10,
  total_credits: 0, api_keys: {}, notification_prefs: {},
  witness_contacts: [], location: {}, subscription_status: 'none',
  razorpay_customer_id: null, revenuecat_subscriber_id: null,
  last_run_reset: new Date(), created_at: new Date(), updated_at: new Date(),
};

// ═══════════════════════════════════════════════════════════
// GET /api/admin/channels
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/channels', () => {
  test('lists all user channels', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'ch1', user_id: 'u1', platform: 'telegram', display_name: 'TG', is_active: true, webhook_url: null, created_at: new Date(), user_email: 'a@b.com', user_tier: 'free' },
        { id: 'ch2', user_id: 'u2', platform: 'slack', display_name: null, is_active: false, webhook_url: 'https://hooks.slack.com', created_at: new Date(), user_email: 'b@b.com', user_tier: 'pro' },
      ],
    });

    const res = await request(app).get('/api/admin/channels');
    expect(res.status).toBe(200);
    expect(res.body.channels).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/admin/channels/stats
// ═══════════════════════════════════════════════════════════
describe('GET /api/admin/channels/stats', () => {
  test('returns channel statistics with PulseKit status', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: 15 }] })
      .mockResolvedValueOnce({ rows: [{ platform: 'telegram', count: 5 }, { platform: 'slack', count: 3 }] })
      .mockResolvedValueOnce({ rows: [{ active: 8 }] })
      .mockResolvedValueOnce({ rows: [{ platform: 'telegram', active: 4 }, { platform: 'slack', active: 2 }] });

    const res = await request(app).get('/api/admin/channels/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(15);
    expect(res.body.active).toBe(8);
    expect(res.body.pulseKitLive).toBe(true);
    expect(res.body.globalChannels).toContain('telegram');
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/admin/channels/:id/deliver
// ═══════════════════════════════════════════════════════════
describe('POST /api/admin/channels/:id/deliver', () => {
  test('delivers test message via PulseKit', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch1', platform: 'telegram', user_id: 'u1', credentials: 'enc:{}' }],
    });

    const res = await request(app).post('/api/admin/channels/ch1/deliver');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPulseKit.send).toHaveBeenCalled();
  });

  test('returns 404 for nonexistent channel', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/admin/channels/nonexistent/deliver');
    expect(res.status).toBe(404);
  });
});
