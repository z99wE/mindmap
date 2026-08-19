/**
 * Cognitive Insights Engine Tests
 */
const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => { req.user = { userId: 'test-uuid', isAdmin: false }; next(); },
}));

jest.mock('../src/llm-provider', () => ({
  callLLM: jest.fn().mockResolvedValue('Your week was focused on work and health. Notable pattern: you tend to capture more thoughts mid-week.'),
}));

const { pool } = require('../src/db');
const insightsRouter = require('../src/routes/cognitive-insights');

const app = express();
app.use(express.json());
app.use('/api/cognitive', insightsRouter);

beforeEach(() => jest.clearAllMocks());

describe('GET /api/cognitive/forecast', () => {
  test('returns load forecast', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: 5, urgent: 2, due_today: 1 }] })
      .mockResolvedValueOnce({ rows: [{ active: 10, expiring_soon: 3, critical: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: 20, completed: 15 }] })
      .mockResolvedValueOnce({ rows: [] }); // analytics
    const res = await request(app).get('/api/cognitive/forecast');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currentLoad');
    expect(res.body).toHaveProperty('forecast');
    expect(res.body.forecast.length).toBe(7);
    expect(res.body).toHaveProperty('insight');
  });
});

describe('GET /api/cognitive/debt-score', () => {
  test('returns debt score', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 10 }] })
      .mockResolvedValueOnce({ rows: [{ count: 3 }] })
      .mockResolvedValueOnce({ rows: [{ count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });
    const res = await request(app).get('/api/cognitive/debt-score');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
    expect(res.body).toHaveProperty('level');
    expect(res.body).toHaveProperty('recommendation');
  });
});

describe('GET /api/cognitive/narrative', () => {
  test('returns narrative with AI story', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ category: 'work', count: 10 }, { category: 'health', count: 5 }] })
      .mockResolvedValueOnce({ rows: [{ total: 8, completed: 5, missed: 2 }] })
      .mockResolvedValueOnce({ rows: [{ count: 3 }] })
      .mockResolvedValueOnce({ rows: [{ day: 2, hour: 14, count: 15 }] });
    const res = await request(app).get('/api/cognitive/narrative');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('narrative');
    expect(res.body).toHaveProperty('aiStory');
  });
});

describe('GET /api/cognitive/commitment-probability', () => {
  test('returns fulfillment probability', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { day_of_week: 1, urgency_tier: 'high', category: 'work', status: 'completed' },
        { day_of_week: 1, urgency_tier: 'normal', category: 'personal', status: 'pending' },
        { day_of_week: 3, urgency_tier: 'critical', category: 'work', status: 'completed' },
      ],
    });
    const res = await request(app).get('/api/cognitive/commitment-probability');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('overallFulfillmentRate');
    expect(res.body.byDay).toBeDefined();
  });
});
