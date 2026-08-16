const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('./server');

test('Unzonk Core Endpoints', async (t) => {
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
    assert.ok(res.body.tiers.pro);
    assert.ok(res.body.tiers.managed);
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

  await t.test('Gated registration in production', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldAllowed = process.env.ALLOWED_ADMIN_EMAILS;
    const oldBeta = process.env.ALLOWED_BETA_EMAILS;
    
    const { pool } = require('./src/db');
    // Pre-cleanup in case previous test runs failed to clean up
    await pool.query('DELETE FROM users WHERE email IN ($1, $2, $3)', ['stranger@example.com', 'viktorechakraborty@gmail.com', 'investor@example.com']);

    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ADMIN_EMAILS = 'viktorechakraborty@gmail.com';
    process.env.ALLOWED_BETA_EMAILS = 'investor@example.com';

    try {
      // 1. Non-whitelisted email should get 403 Forbidden
      const resBlocked = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'stranger@example.com',
          password: 'securepassword123',
          firstName: 'John',
          lastName: 'Doe'
        })
        .expect(403);
      assert.match(resBlocked.body.error, /beta.*restricted/i);

      // 2. Whitelisted admin email should succeed and be admin
      const resAllowed = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'viktorechakraborty@gmail.com',
          password: 'securepassword123',
          firstName: 'Viktor',
          lastName: 'Chakraborty'
        })
        .expect(201);
      assert.strictEqual(resAllowed.body.user.email, 'viktorechakraborty@gmail.com');
      assert.strictEqual(resAllowed.body.user.tier, 'admin');

      // 3. Whitelisted beta email should succeed and be regular/free user
      const resBeta = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'investor@example.com',
          password: 'securepassword123',
          firstName: 'Jane',
          lastName: 'Investor'
        })
        .expect(201);
      assert.strictEqual(resBeta.body.user.email, 'investor@example.com');
      assert.strictEqual(resBeta.body.user.tier, 'free');
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldAllowed) process.env.ALLOWED_ADMIN_EMAILS = oldAllowed;
      else delete process.env.ALLOWED_ADMIN_EMAILS;
      if (oldBeta) process.env.ALLOWED_BETA_EMAILS = oldBeta;
      else delete process.env.ALLOWED_BETA_EMAILS;
      
      // Cleanup registered test users
      await pool.query('DELETE FROM users WHERE email IN ($1, $2, $3)', ['stranger@example.com', 'viktorechakraborty@gmail.com', 'investor@example.com']);
    }
  });

  await t.test('Protected routes require auth', async () => {
    await request(app).get('/api/memory').expect(401);
    await request(app).get('/api/notifications').expect(401);
    await request(app).post('/api/process/message').expect(401);
  });
});

test.after(async () => {
  const { pool } = require('./src/db');
  await pool.end();
});
