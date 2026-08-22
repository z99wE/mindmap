/**
 * Auth API Route Tests
 * 
 * Tests: POST /register, POST /login, GET /me, POST /refresh,
 * PUT /profile, PUT /notification-prefs, PUT /data-sharing,
 * PUT /web-search, PUT /witness-contacts, DELETE /account
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

const mockBcrypt = { hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'), compare: jest.fn() };
jest.mock('bcryptjs', () => mockBcrypt);

const mockJwt = { sign: jest.fn().mockReturnValue('test-jwt-token'), verify: jest.fn() };
jest.mock('jsonwebtoken', () => mockJwt);

// Mock mailer to prevent real email sends
jest.mock('../src/mailer', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/dev-admin', () => ({
  getDevAdminCredentials: jest.fn().mockReturnValue(null),
}));

// Replace authMiddleware with a test-friendly one that sets req.user
// We do this by re-mocking only the authMiddleware export
jest.mock('../src/auth', () => {
  const actual = jest.requireActual('../src/auth');
  return {
    ...actual,
    authMiddleware: (req, _res, next) => {
      req.user = { userId: 'test-user-uuid', email: 'test@example.com', tier: 'free', isAdmin: false };
      next();
    },
  };
});

// Now require the REAL auth module — bcrypt and jwt are already mocked
const { pool } = require('../src/db');
const authRouter = require('../src/routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// Test users that will be "created" by mock queries
const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  tier: 'free',
  is_admin: false,
  daily_runs_used: 0,
  daily_runs_limit: 10,
  total_credits: 0,
  notification_prefs: {},
  witness_contacts: [],
  data_sharing: true,
  web_search: true,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  profession: 'developer',
  country: 'US',
  created_at: new Date(),
  password_hash: '$2a$12$hashedpassword',
  subscription_status: 'none',
  api_keys: {},
  razorpay_customer_id: null,
  revenuecat_subscriber_id: null,
  last_run_reset: new Date(),
  updated_at: new Date(),
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  beforeEach(() => {
    pool.query.mockReset();
    mockBcrypt.hash.mockReset().mockResolvedValue('$2a$12$hashedpassword');
    mockJwt.sign.mockReset().mockReturnValue('test-jwt-token');
  });

  test('registers a new user successfully', async () => {
    // Email not taken
    pool.query.mockResolvedValueOnce({ rows: [] });
    // Insert succeeds
    pool.query.mockResolvedValueOnce({ rows: [mockUser] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.token).toBe('test-jwt-token');
  });

  test('rejects duplicate email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@test.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  test('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'notanemail', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  test('rejects invalid username format', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [mockUser] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'password123',
        username: 'ab', // too short
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    pool.query.mockReset();
    mockBcrypt.compare.mockReset();
    mockJwt.sign.mockReset().mockReturnValue('test-jwt-token');
  });

  test('logs in with valid credentials', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockUser] });
    mockBcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });

  test('rejects invalid password', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockUser] });
    mockBcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' }); // 12 chars, passes validation

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test('rejects nonexistent email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test('validates email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'password123' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════════
describe('GET /api/auth/me', () => {
  test('returns current user profile', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockUser] });

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.tier).toBe('free');
  });

  test('returns 404 for deleted user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/refresh
// ═══════════════════════════════════════════════════════════
describe('POST /api/auth/refresh', () => {
  test('refreshes token with valid refresh token', async () => {
    mockJwt.verify.mockReturnValueOnce({ userId: 'user-uuid-1', type: 'refresh' });
    pool.query.mockResolvedValueOnce({ rows: [mockUser] });
    mockJwt.sign.mockReturnValueOnce('new-token').mockReturnValueOnce('new-refresh');

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('new-token');
  });

  test('rejects missing refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  test('rejects invalid refresh token', async () => {
    mockJwt.verify.mockReturnValueOnce(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid' });

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/auth/profile
// ═══════════════════════════════════════════════════════════
describe('PUT /api/auth/profile', () => {
  test('updates profile fields', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // username not taken
    pool.query.mockResolvedValueOnce({
      rows: [{ first_name: 'New', last_name: 'Name', username: 'newname', profession: 'designer', country: 'UK' }],
    });

    const res = await request(app)
      .put('/api/auth/profile')
      .send({
        firstName: 'New',
        lastName: 'Name',
        username: 'newname',
        profession: 'designer',
        country: 'UK',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects username shorter than 3 chars', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ username: 'ab' });

    expect(res.status).toBe(400);
  });

  test('rejects duplicate username', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'other-user' }] });

    const res = await request(app)
      .put('/api/auth/profile')
      .send({ username: 'taken' });

    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/auth/notification-prefs
// ═══════════════════════════════════════════════════════════
describe('PUT /api/auth/notification-prefs', () => {
  test('saves notification preferences', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/auth/notification-prefs')
      .send({ prefs: { channel_routing_mode: 'broadcast', quiet_hours: true } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET notification_prefs'),
      expect.any(Array)
    );
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/auth/data-sharing
// ═══════════════════════════════════════════════════════════
describe('PUT /api/auth/data-sharing', () => {
  test('updates data sharing preference', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/auth/data-sharing')
      .send({ dataSharing: false });

    expect(res.status).toBe(200);
  });

  test('rejects non-boolean value', async () => {
    const res = await request(app)
      .put('/api/auth/data-sharing')
      .send({ dataSharing: 'yes' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/auth/web-search
// ═══════════════════════════════════════════════════════════
describe('PUT /api/auth/web-search', () => {
  test('updates web search preference', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/auth/web-search')
      .send({ webSearch: false });

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/auth/witness-contacts
// ═══════════════════════════════════════════════════════════
describe('PUT /api/auth/witness-contacts', () => {
  test('saves witness contacts array', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/auth/witness-contacts')
      .send({ contacts: ['+15551234567', 'friend@test.com'] });

    expect(res.status).toBe(200);
  });

  test('rejects non-array contacts', async () => {
    const res = await request(app)
      .put('/api/auth/witness-contacts')
      .send({ contacts: 'not-an-array' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/dev-admin-hint
// ═══════════════════════════════════════════════════════════
describe('GET /api/auth/dev-admin-hint', () => {
  test('returns 404 (endpoint removed for security)', async () => {
    const res = await request(app).get('/api/auth/dev-admin-hint');
    expect(res.status).toBe(404);
  });
});
