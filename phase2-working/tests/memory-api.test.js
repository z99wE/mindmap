/**
 * Memory API Route Tests
 * 
 * Tests: GET /, POST /, DELETE /:id, PUT /:id/complete,
 * GET /stats, GET /search, GET /export, GET /knowledge-graph,
 * GET /export-all, POST /account/delete-request, DELETE /account,
 * GET /:id/traces
 */

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { userId: 'test-user-uuid', isAdmin: false };
    next();
  },
}));

jest.mock('../src/middleware', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

const { pool } = require('../src/db');
const memoryRouter = require('../src/routes/memory');

const app = express();
app.use(express.json());
app.use('/api/memory', memoryRouter);

// Sample memory row factory
function makeMemory(overrides = {}) {
  return {
    id: 'mem-' + Math.random().toString(36).slice(2, 8),
    user_id: 'test-user-uuid',
    content: 'Test memory content',
    source: 'user',
    category: 'general',
    importance: 0.5,
    half_life_hours: 24,
    urgency_tier: 'normal',
    status: 'pending',
    archived: false,
    intent: 'general',
    action_verb: null,
    is_actionable: false,
    brain_area: null,
    emotional_tone: null,
    decay_status: 'active',
    expires_at: new Date(Date.now() + 86400000),
    witness_contact: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory', () => {
  test('returns paginated memories', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [makeMemory(), makeMemory()] })
      .mockResolvedValueOnce({ rows: [{ total: 2 }] });

    const res = await request(app).get('/api/memory');
    expect(res.status).toBe(200);
    expect(res.body.memories).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  test('filters by category', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [makeMemory({ category: 'work' })] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const res = await request(app).get('/api/memory?category=work');
    expect(res.status).toBe(200);
    expect(res.body.memories[0].category).toBe('work');
  });

  test('returns empty list when no memories', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    const res = await request(app).get('/api/memory');
    expect(res.status).toBe(200);
    expect(res.body.memories).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory/stats
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory/stats', () => {
  test('returns memory statistics', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 100 }] })
      .mockResolvedValueOnce({ rows: [{ category: 'work', count: 40 }, { category: 'general', count: 60 }] })
      .mockResolvedValueOnce({ rows: [{ status: 'pending', count: 30 }, { status: 'completed', count: 70 }] })
      .mockResolvedValueOnce({ rows: [{ count: 30 }] });

    const res = await request(app).get('/api/memory/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(100);
    expect(res.body.active).toBe(30);
    expect(res.body.byCategory).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory/search
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory/search', () => {
  test('searches memories by keyword', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makeMemory({ content: 'Important project deadline' })] });

    const res = await request(app).get('/api/memory/search?q=project');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });

  test('requires query parameter', async () => {
    const res = await request(app).get('/api/memory/search');
    expect(res.status).toBe(400);
  });

  test('returns empty for no matches', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/memory/search?q=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/memory
// ═══════════════════════════════════════════════════════════
describe('POST /api/memory', () => {
  test('creates a new memory', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makeMemory()] });

    const res = await request(app)
      .post('/api/memory')
      .send({ content: 'New thought', category: 'work' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Test memory content');
  });

  test('rejects missing content', async () => {
    const res = await request(app)
      .post('/api/memory')
      .send({ category: 'work' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content is required/i);
  });
});

// ═══════════════════════════════════════════════════════════
// DELETE /api/memory/:id
// ═══════════════════════════════════════════════════════════
describe('DELETE /api/memory/:id', () => {
  test('deletes a memory', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete('/api/memory/mem-123');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// PUT /api/memory/:id/complete
// ═══════════════════════════════════════════════════════════
describe('PUT /api/memory/:id/complete', () => {
  test('marks memory as complete', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).put('/api/memory/mem-123/complete');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      expect.any(Array)
    );
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory/export
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory/export', () => {
  test('exports memories as JSON', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makeMemory(), makeMemory()] });

    const res = await request(app).get('/api/memory/export');
    expect(res.status).toBe(200);
    expect(res.body.memories).toHaveLength(2);
    expect(res.body).toHaveProperty('exportedAt');
  });

  test('exports as CSV', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makeMemory()] });

    const res = await request(app).get('/api/memory/export?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  test('exports as Markdown', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makeMemory()] });

    const res = await request(app).get('/api/memory/export?format=markdown');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
  });

  test('exports as Vortex map format', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makeMemory()] });

    const res = await request(app).get('/api/memory/export?format=vortex');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('ThoughtVortexMap');
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory/knowledge-graph
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory/knowledge-graph', () => {
  test('returns graph nodes and edges', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        makeMemory({ id: 'm1', category: 'work' }),
        makeMemory({ id: 'm2', category: 'work' }),
        makeMemory({ id: 'm3', category: 'personal' }),
      ],
    });

    const res = await request(app).get('/api/memory/knowledge-graph');
    expect(res.status).toBe(200);
    expect(res.body.nodes).toHaveLength(3);
    expect(res.body.edges.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory/:id/traces
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory/:id/traces', () => {
  test('returns thought traces', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { span_name: 'parse_input', input: '{}', output: '{}', status: 'success', created_at: new Date(), ended_at: new Date() },
      ],
    });

    const res = await request(app).get('/api/memory/mem-123/traces');
    expect(res.status).toBe(200);
    expect(res.body.traces).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/memory/export-all (GDPR)
// ═══════════════════════════════════════════════════════════
describe('GET /api/memory/export-all', () => {
  test('exports all user data', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [makeMemory()] })  // memories
      .mockResolvedValueOnce({ rows: [] })               // channels
      .mockResolvedValueOnce({ rows: [] })               // notifications
      .mockResolvedValueOnce({ rows: [] })               // billing
      .mockResolvedValueOnce({ rows: [{ id: 'test-user-uuid', tier: 'free', daily_runs_limit: 10, total_credits: 0, notification_prefs: {}, witness_contacts: [], subscription_status: 'none', created_at: new Date() }] }); // user

    const res = await request(app).get('/api/memory/export-all');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exportedAt');
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('memories');
  });
});

// ═══════════════════════════════════════════════════════════
// POST /api/memory/account/delete-request
// ═══════════════════════════════════════════════════════════
describe('POST /api/memory/account/delete-request', () => {
  test('returns confirmation token', async () => {
    const res = await request(app).post('/api/memory/account/delete-request');
    expect(res.status).toBe(200);
    expect(res.body.confirmationToken).toBeDefined();
    expect(res.body.expiresIn).toBe(300);
  });
});

// ═══════════════════════════════════════════════════════════
// DELETE /api/memory/account
// ═══════════════════════════════════════════════════════════
describe('DELETE /api/memory/account', () => {
  test('requires confirmation token', async () => {
    const res = await request(app).delete('/api/memory/account').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/confirmation token/i);
  });

  test('rejects invalid token', async () => {
    const res = await request(app)
      .delete('/api/memory/account')
      .send({ confirmationToken: 'invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/confirmation token/i);
  });
});
