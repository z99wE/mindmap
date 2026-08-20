/**
 * Compliance End-to-End Flow Tests
 * 
 * Tests the complete GDPR/DPDP compliance workflow:
 * 1. Grievance submission and tracking
 * 2. Breach detection and logging
 * 3. Data deletion cron
 * 4. Consent logging
 */
const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { userId: 'test-uuid', isAdmin: true };
    next();
  },
}));

const { pool } = require('../src/db');
const complianceRouter = require('../src/routes/compliance');
const { ensureComplianceTables, logBreach, runDataDeletionCron, logConsent } = require('../src/routes/compliance');

const app = express();
app.use(express.json());
app.use('/api/compliance', complianceRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Compliance Tables Initialization', () => {
  test('ensureComplianceTables runs without error', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await expect(ensureComplianceTables()).resolves.toBeUndefined();
  });

  test('ensureComplianceTables handles DB errors gracefully', async () => {
    pool.query.mockRejectedValue(new Error('DB error'));
    await expect(ensureComplianceTables()).resolves.toBeUndefined();
  });
});

describe('Breach Logging', () => {
  test('logBreach creates a breach record', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'breach-1', created_at: new Date() }],
    });

    const result = await logBreach('test_breach', 'medium', 'Test breach description', 5);
    expect(result).toBeDefined();
    expect(result.id).toBe('breach-1');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO compliance_breaches'),
      expect.arrayContaining(['test_breach', 'medium', 'Test breach description', 5])
    );
  });

  test('logBreach handles errors gracefully', async () => {
    pool.query.mockRejectedValue(new Error('DB error'));
    const result = await logBreach('test', 'low', 'description');
    expect(result).toBeNull();
  });

  test('logBreach accepts all severity levels', async () => {
    const severities = ['low', 'medium', 'high', 'critical'];
    for (const severity of severities) {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'b-1', created_at: new Date() }] });
      const result = await logBreach('test', severity, 'test');
      expect(result).toBeDefined();
    }
  });
});

describe('Consent Logging', () => {
  test('logConsent records consent action', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      logConsent('user-1', 'registration_consent', { consentedTo: ['analytics'] }, '127.0.0.1')
    ).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO compliance_consent_log'),
      expect.any(Array)
    );
  });

  test('logConsent handles errors gracefully', async () => {
    pool.query.mockRejectedValue(new Error('DB error'));
    await expect(logConsent('user-1', 'test', {})).resolves.toBeUndefined();
  });
});

describe('Data Deletion Cron', () => {
  beforeEach(() => {
    // Reset pool query mock for each test in this describe block
    jest.clearAllMocks();
  });

  test('deletes expired accounts and old analytics', async () => {
    // Mock: deleted user accounts
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'del-1' }], rowCount: 1 })  // deleted users
      .mockResolvedValueOnce({ rows: [{ id: 'b-1' }] })                  // breach log
      .mockResolvedValueOnce({ rowCount: 50 })                           // analytics purge
      .mockResolvedValueOnce({});                                         // consent log

    await runDataDeletionCron();

    // Should have called queries for:
    // 1. DELETE users with deleted_ prefix older than 30 days
    // 2. INSERT breach log for data purge
    // 3. DELETE analytics_events older than 90 days
    // 4. DELETE compliance_consent_log older than 3 years
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  test('handles no expired accounts', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // no deleted users found
      .mockResolvedValueOnce({ rowCount: 0 })             // no analytics to purge
      .mockResolvedValueOnce({});                          // consent log

    await runDataDeletionCron();
    expect(pool.query).toHaveBeenCalled();
  });

  test('handles DB errors gracefully', async () => {
    pool.query.mockRejectedValue(new Error('DB connection error'));
    await expect(runDataDeletionCron()).resolves.toBeUndefined();
  });
});

describe('API: Grievance Flow', () => {
  test('grievance lifecycle: submit → list → respond', async () => {
    // 1. Submit grievance
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'g-1', status: 'open', created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ id: 'b-1', created_at: new Date() }] });

    const submitRes = await request(app)
      .post('/api/compliance/grievance')
      .send({ subject: 'Data deletion request', description: 'Please delete all my data under GDPR Art. 17' });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.grievanceId).toBe('g-1');
    expect(submitRes.body.status).toBe('open');
    expect(submitRes.body.message).toContain('30 days');

    // 2. List grievances
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'g-1', subject: 'Data deletion request', description: 'Please delete all my data', status: 'open', response: null, responded_at: null, created_at: new Date() },
      ],
    });

    const listRes = await request(app).get('/api/compliance/grievances');
    expect(listRes.status).toBe(200);
    expect(listRes.body.grievances).toHaveLength(1);
    expect(listRes.body.grievances[0].subject).toBe('Data deletion request');
  });

  test('rejects grievance without subject', async () => {
    const res = await request(app)
      .post('/api/compliance/grievance')
      .send({ description: 'Missing subject' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Subject');
  });

  test('rejects grievance without description', async () => {
    const res = await request(app)
      .post('/api/compliance/grievance')
      .send({ subject: 'No description' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('description');
  });
});

describe('API: Admin Endpoints', () => {
  test('GET /admin/breaches returns breaches list', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'b-1', breach_type: 'test', severity: 'low', description: 'Test', created_at: new Date() },
      ],
    });

    const res = await request(app).get('/api/compliance/admin/breaches');
    expect(res.status).toBe(200);
    expect(res.body.breaches).toBeDefined();
  });

  test('GET /admin/grievances returns all grievances', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'g-1', subject: 'Test', user_email: 'user@test.com', status: 'open' },
      ],
    });

    const res = await request(app).get('/api/compliance/admin/grievances');
    expect(res.status).toBe(200);
    expect(res.body.grievances).toBeDefined();
  });

  test('PUT /admin/grievances/:id/respond updates status', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/compliance/admin/grievances/g-1/respond')
      .send({ response: 'Your request has been processed.', status: 'resolved' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('respond rejects missing response', async () => {
    const res = await request(app)
      .put('/api/compliance/admin/grievances/g-1/respond')
      .send({ status: 'resolved' });

    expect(res.status).toBe(400);
  });
});
