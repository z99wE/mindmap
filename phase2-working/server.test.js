const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('./server');

test('Thought GPS Core Endpoints', async (t) => {
  await t.test('GET /health returns 200 and online status', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    assert.strictEqual(res.body.status, 'healthy');
    assert.ok(res.body.hasOwnProperty('features'));
  });

  await t.test('GET /api/process/status lists available features', async () => {
    const res = await request(app)
      .get('/api/process/status')
      .expect(200);

    assert.strictEqual(res.body.status, 'active');
    assert.ok(res.body.availableFeatures.includes('Memory management'));
  });
});
