/**
 * Channel API Route Tests
 * 
 * Tests: GET /platforms, GET /, POST /connect, PUT /:id/toggle,
 * DELETE /:id, POST /:id/test, POST /digest
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies BEFORE requiring the router
jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { userId: 'test-user-uuid', isAdmin: false };
    next();
  },
}));

jest.mock('../src/crypto', () => ({
  encrypt: jest.fn((s) => `encrypted:${s}`),
  decrypt: jest.fn((s) => {
    // Strip 'encrypted:' prefix if present, else return as-is
    return s.startsWith('encrypted:') ? s.slice(10) : s;
  }),
  ENCRYPTION_KEY: 'test-key',
}));

const { pool } = require('../src/db');
const channelsRouter = require('../src/routes/channels');

const app = express();
app.use(express.json());
app.use('/api/channels', channelsRouter);

// Mock app.get('pulseKit') used in test+digest routes
const mockPulseKit = {
  send: jest.fn().mockResolvedValue({ delivered: true, channel: 'telegram', via: 'global', errors: [] }),
  invalidateUserDriver: jest.fn().mockResolvedValue(undefined),
};
app.get = jest.fn((key) => {
  if (key === 'pulseKit') return mockPulseKit;
  return undefined;
});
// Also set via set()
app.set = jest.fn((key, val) => {
  if (key === 'pulseKit') mockPulseKit;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// GET /api/channels/platforms
// ═══════════════════════════════════════════════════════════
describe('GET /api/channels/platforms', () => {
  test('returns supported platforms list', async () => {
    const res = await request(app).get('/api/channels/platforms');
    expect(res.status).toBe(200);
    expect(res.body.platforms).toBeDefined();
    expect(Array.isArray(res.body.platforms)).toBe(true);
    
    const ids = res.body.platforms.map(p => p.id);
    expect(ids).toContain('telegram');
    expect(ids).toContain('slack');
    expect(ids).toContain('discord');
    expect(ids).toContain('email');
    expect(ids).toContain('whatsapp');
    expect(ids).toContain('signal');
    expect(ids).toContain('sms');
    expect(ids).toContain('twitter');
    expect(ids).toContain('bluesky');
  });

  test('each platform has required fields', async () => {
    const res = await request(app).get('/api/channels/platforms');
    for (const p of res.body.platforms) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(Array.isArray(p.fields)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/channels (user's channels)
// ═══════════════════════════════════════════════════════════
describe('GET /api/channels', () => {
  test('returns empty list when user has no channels', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/channels');
    expect(res.status).toBe(200);
    expect(res.body.channels).toEqual([]);
  });

  test('returns user channels ordered by creation date', async () => {
    const mockChannels = [
      { id: 'ch-1', platform: 'telegram', display_name: 'My TG', is_active: true, created_at: new Date() },
      { id: 'ch-2', platform: 'slack', display_name: 'Work', is_active: false, created_at: new Date() },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockChannels });
    
    const res = await request(app).get('/api/channels');
    expect(res.status).toBe(200);
    expect(res.body.channels).toHaveLength(2);
    expect(res.body.channels[0].platform).toBe('telegram');
  });

  test('queries only the authenticated user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/channels');
    
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['test-user-uuid']
    );
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/channels/connect
// ═══════════════════════════════════════════════════════════
describe('POST /api/channels/connect', () => {
  test('connects a new channel successfully', async () => {
    // Mock user tier check
    pool.query.mockResolvedValueOnce({ rows: [{ tier: 'pro' }] });
    // Mock insert
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'new-ch', platform: 'telegram', display_name: 'My Bot', is_active: true, created_at: new Date() }],
    });

    const res = await request(app)
      .post('/api/channels/connect')
      .send({
        platform: 'telegram',
        displayName: 'My Bot',
        credentials: { bot_token: '123:abc', chat_id: '999' },
      });

    expect(res.status).toBe(201);
    expect(res.body.channel.platform).toBe('telegram');
  });

  test('rejects missing credentials', async () => {
    const res = await request(app)
      .post('/api/channels/connect')
      .send({ platform: 'telegram' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/platform and credentials/i);
  });

  test('rejects unsupported platform', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ tier: 'pro' }] });
    
    const res = await request(app)
      .post('/api/channels/connect')
      .send({
        platform: 'nonexistent',
        credentials: { key: 'val' },
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported platform/i);
  });

  test('free tier users limited to 2 channels', async () => {
    // Free tier
    pool.query.mockResolvedValueOnce({ rows: [{ tier: 'free' }] });
    // Already has 2 active channels
    pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
    
    const res = await request(app)
      .post('/api/channels/connect')
      .send({
        platform: 'telegram',
        credentials: { bot_token: 'tok', chat_id: '123' },
      });
    
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/density limit/i);
  });

  test('encrypts credentials before storing', async () => {
    const { encrypt } = require('../src/crypto');
    
    pool.query.mockResolvedValueOnce({ rows: [{ tier: 'pro' }] });
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch-1', platform: 'signal', display_name: null, is_active: true, created_at: new Date() }],
    });

    await request(app)
      .post('/api/channels/connect')
      .send({
        platform: 'signal',
        credentials: { phone_number: '+15551234567', api_key: 'secret-key' },
      });

    expect(encrypt).toHaveBeenCalled();
  });

  test('invalidates PulseKit driver cache on connect', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ tier: 'pro' }] });
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch-1', platform: 'slack', display_name: 'S', is_active: true, created_at: new Date() }],
    });

    await request(app)
      .post('/api/channels/connect')
      .send({ platform: 'slack', credentials: { bot_token: 'xoxb-tok', channel_id: 'C123' } });

    expect(mockPulseKit.invalidateUserDriver).toHaveBeenCalledWith('test-user-uuid', 'slack');
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/channels/:id/toggle
// ═══════════════════════════════════════════════════════════
describe('PUT /api/channels/:id/toggle', () => {
  test('toggles channel active state', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'ch-1', is_active: false }] });
    
    const res = await request(app).put('/api/channels/ch-1/toggle');
    expect(res.status).toBe(200);
    expect(res.body.channel.is_active).toBe(false);
  });

  test('returns 404 for nonexistent channel', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/channels/nonexistent/toggle');
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════
// DELETE /api/channels/:id
// ═══════════════════════════════════════════════════════════
describe('DELETE /api/channels/:id', () => {
  test('deletes channel and invalidates driver', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ platform: 'telegram' }] });
    
    const res = await request(app).delete('/api/channels/ch-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPulseKit.invalidateUserDriver).toHaveBeenCalledWith('test-user-uuid', 'telegram');
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/channels/:id/test
// ═══════════════════════════════════════════════════════════
describe('POST /api/channels/:id/test', () => {
  test('sends test message via PulseKit', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch-1', platform: 'telegram', credentials: 'encrypted:{"bot_token":"tok","chat_id":"123"}' }],
    });
    
    const res = await request(app).post('/api/channels/ch-1/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPulseKit.send).toHaveBeenCalled();
  });

  test('returns error when delivered=false', async () => {
    mockPulseKit.send.mockResolvedValueOnce({ delivered: false, errors: ['Unauthorized'] });
    
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch-1', platform: 'telegram', credentials: 'encrypted:{}' }],
    });
    
    const res = await request(app).post('/api/channels/ch-1/test');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/delivery failed/i);
  });

  test('returns error when channel rerouted', async () => {
    mockPulseKit.send.mockResolvedValueOnce({ delivered: true, channel: 'slack', errors: [] });
    
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch-1', platform: 'telegram', credentials: 'encrypted:{}' }],
    });
    
    const res = await request(app).post('/api/channels/ch-1/test');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/routed to slack/i);
  });

  test('returns error for corrupt credentials', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'ch-1', platform: 'telegram', credentials: 'corrupt-data' }],
    });
    
    const res = await request(app).post('/api/channels/ch-1/test');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/failed to decrypt/i);
  });

  test('returns 404 for nonexistent channel', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/channels/nonexistent/test');
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/channels/digest
// ═══════════════════════════════════════════════════════════
describe('POST /api/channels/digest', () => {
  test('sends digest of pending thoughts', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { content: 'Buy groceries' },
        { content: 'Finish project' },
      ],
    });
    
    const res = await request(app).post('/api/channels/digest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPulseKit.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test-user-uuid',
        title: 'UnZonko Digest',
      })
    );
  });

  test('returns early when no pending thoughts', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    
    const res = await request(app).post('/api/channels/digest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/no active thoughts/i);
    expect(mockPulseKit.send).not.toHaveBeenCalled();
  });
});
