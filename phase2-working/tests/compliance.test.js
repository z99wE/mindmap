/**
 * GDPR/DPDP Compliance Tests
 */
const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => { req.user = { userId: 'test-uuid', isAdmin: true }; next(); },
}));

const { pool } = require('../src/db');
const complianceRouter = require('../src/routes/compliance');

const app = express();
app.use(express.json());
app.use('/api/compliance', complianceRouter);

beforeEach(() => jest.clearAllMocks());

describe('POST /api/compliance/grievance', () => {
  test('submits a grievance', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'g-1', status: 'open', created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ id: 'b-1', created_at: new Date() }] });
    const res = await request(app).post('/api/compliance/grievance').send({ subject: 'Data concern', description: 'Please delete my data' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.grievanceId).toBe('g-1');
  });

  test('rejects empty subject', async () => {
    const res = await request(app).post('/api/compliance/grievance').send({ description: 'test' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/compliance/grievances', () => {
  test('lists user grievances', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'g-1', subject: 'Test', status: 'open' }] });
    const res = await request(app).get('/api/compliance/grievances');
    expect(res.status).toBe(200);
    expect(res.body.grievances).toHaveLength(1);
  });
});

describe('GET /api/compliance/admin/breaches', () => {
  test('returns breaches for admin', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'b-1', breach_type: 'test', severity: 'low' }] });
    const res = await request(app).get('/api/compliance/admin/breaches');
    expect(res.status).toBe(200);
  });
});

describe('runDataDeletionCron', () => {
  test('deletes old accounts and analytics', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'del-user-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] }) // breach log
      .mockResolvedValueOnce({ rowCount: 10 }) // analytics purge
      .mockResolvedValueOnce({ rowCount: 0 }); // consent log purge
    const { runDataDeletionCron } = require('../src/routes/compliance');
    await runDataDeletionCron();
    expect(pool.query).toHaveBeenCalled();
  });
});
