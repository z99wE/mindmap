const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('./server');

test('Thought GPS Core Endpoints', async (t) => {
  await t.test('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.hasOwnProperty('version'));
    assert.ok(res.body.hasOwnProperty('uptime'));
  });

  await t.test('GET /api/billing/tiers returns tier info', async () => {
    const res = await request(app)
      .get('/api/billing/tiers')
      .expect(200);

    assert.ok(res.body.tiers);
    assert.ok(res.body.tiers.free);
    assert.ok(res.body.tiers.premium);
  });

  await t.test('GET /api/channels/platforms returns supported platforms', async () => {
    const res = await request(app)
      .get('/api/channels/platforms')
      .expect(200);

    assert.ok(res.body.platforms);
    assert.ok(Array.isArray(res.body.platforms));
    const names = res.body.platforms.map(p => p.id);
    assert.ok(names.includes('slack'));
    assert.ok(names.includes('telegram'));
  });

  await t.test('Protected routes require auth', async () => {
    await request(app).get('/api/memory').expect(401);
    await request(app).get('/api/notifications').expect(401);
    await request(app).post('/api/process/message').expect(401);
  });
});
