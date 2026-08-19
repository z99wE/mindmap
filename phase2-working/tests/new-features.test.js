/**
 * Tests for Collaborative Sharing, Agent Preferences, Analytics, Activities
 */

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { userId: 'test-user-uuid', isAdmin: true };
    next();
  },
}));

const { pool } = require('../src/db');

// ── Sharing Routes ──
describe('GET /api/sharing', () => {
  const sharingRouter = require('../src/routes/sharing');
  const app = express();
  app.use(express.json());
  app.use('/api/sharing', sharingRouter);

  test('returns memories shared with me', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 's1', shared_at: new Date(), memory_id: 'm1', content: 'Shared thought', category: 'work', owner_email: 'a@b.com' }] });
    const res = await request(app).get('/api/sharing');
    expect(res.status).toBe(200);
    expect(res.body.shared).toHaveLength(1);
  });

  test('share memory requires memoryId and email', async () => {
    const res = await request(app).post('/api/sharing/share').send({});
    expect(res.status).toBe(400);
  });

  test('share memory finds target user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // target user not found
    const res = await request(app).post('/api/sharing/share').send({ memoryId: 'm1', email: 'nobody@test.com' });
    expect(res.status).toBe(404);
  });

  test('share memory succeeds', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'target-uuid' }] }) // target found
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })          // memory owned by user
      .mockResolvedValueOnce({ rows: [{ id: 'share-1' }] })     // insert succeeds
      .mockResolvedValueOnce({ rows: [] });                      // analytics (fire-and-forget)
    const res = await request(app).post('/api/sharing/share').send({ memoryId: 'm1', email: 'friend@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('prevents sharing with self', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'test-user-uuid' }] });
    const res = await request(app).post('/api/sharing/share').send({ memoryId: 'm1', email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });
});

// ── Agent Preferences Routes ──
describe('Agent Preferences', () => {
  const prefsRouter = require('../src/routes/agent-preferences');
  const app = express();
  app.use(express.json());
  app.use('/api/agent', prefsRouter);

  test('GET returns default preferences when none stored', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ agent_preferences: null }] });
    const res = await request(app).get('/api/agent/preferences');
    expect(res.status).toBe(200);
    expect(res.body.preferences.response_style).toBe('concise');
    expect(res.body.preferences.bullet_points).toBe(true);
  });

  test('PUT updates preferences', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ agent_preferences: {} }] }) // existing
      .mockResolvedValueOnce({ rows: [] });                          // update
    const res = await request(app).put('/api/agent/preferences').send({ response_style: 'detailed' });
    expect(res.status).toBe(200);
  });

  test('PUT rejects invalid response_style', async () => {
    const res = await request(app).put('/api/agent/preferences').send({ response_style: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('buildAgentInstructions generates correct prompt', () => {
    const { buildAgentInstructions } = require('../src/routes/agent-preferences');
    const prompt = buildAgentInstructions({ response_style: 'concise', bullet_points: true, custom_instructions: 'Be friendly' });
    expect(prompt).toMatch(/brief/);
    expect(prompt).toMatch(/bullet/);
    expect(prompt).toMatch(/friendly/);
  });

  test('areNudgesAllowed respects quiet hours', () => {
    const { areNudgesAllowed } = require('../src/routes/agent-preferences');
    expect(areNudgesAllowed({ quiet_hours_enabled: false })).toBe(true);
  });
});

// ── Analytics Routes ──
describe('Analytics', () => {
  const analyticsRouter = require('../src/routes/analytics');
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);

  test('patterns require admin and return insights', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ event_type: 'thought_captured', count: 50 }] })   // event types
      .mockResolvedValueOnce({ rows: [{ day_of_week: 1, total: 10, completed: 5, missed: 2 }] }) // commitment patterns
      .mockResolvedValueOnce({ rows: [{ urgency_tier: 'normal', count: 100 }] })            // urgency dist
      .mockResolvedValueOnce({ rows: [{ hour: 14, count: 200 }] });                          // peak hours
    const res = await request(app).get('/api/analytics/patterns');
    expect(res.status).toBe(200);
    expect(res.body.patterns).toBeDefined();
    expect(res.body.insights).toBeDefined();
  });
});

// ── Activities Routes ──
describe('Activities', () => {
  const activitiesRouter = require('../src/routes/activities');
  const app = express();
  app.use(express.json());
  app.use('/api/activities', activitiesRouter);

  test('GET returns activities', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'a1', activity_type: 'thought_captured', title: 'New thought', summary: '...', is_read: false, created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });
    const res = await request(app).get('/api/activities');
    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.unreadCount).toBe(1);
  });

  test('mark all as read', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 3 });
    const res = await request(app).put('/api/activities/read').send({});
    expect(res.status).toBe(200);
  });

  test('unread-count returns count', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: 5 }] });
    const res = await request(app).get('/api/activities/unread-count');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
  });
});
