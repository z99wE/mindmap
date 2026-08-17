/**
 * Middleware Tests
 * 
 * Tests: sanitizeInput, sanitizeBody, auditMiddleware, logAudit,
 * asyncHandler, globalErrorHandler
 */

const express = require('express');
const request = require('supertest');

// We test sanitizeInput and sanitizeBody directly (pure functions)
const { sanitizeInput, sanitizeBody } = require('../src/middleware');

// For error handler, we need to create a small express app
const { asyncHandler, globalErrorHandler } = require('../src/middleware/errorHandler');

// ═══════════════════════════════════════════════════════════
// sanitizeInput
// ═══════════════════════════════════════════════════════════
describe('sanitizeInput()', () => {
  test('removes script tags', () => {
    const result = sanitizeInput('<script>alert("xss")</script>Hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello');
  });

  test('removes event handlers from HTML tags', () => {
    const result = sanitizeInput('<div onclick="evil()">Click me</div>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  test('removes javascript: protocol', () => {
    const result = sanitizeInput('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain('javascript:');
  });

  test('removes iframe tags', () => {
    const result = sanitizeInput('<iframe src="http://evil.com"></iframe>content');
    expect(result).not.toContain('iframe');
    expect(result).toContain('content');
  });

  test('removes object tags', () => {
    const result = sanitizeInput('<object data="evil.swf"></object>');
    expect(result).not.toContain('object');
  });

  test('removes embed tags', () => {
    const result = sanitizeInput('<embed src="evil.swf">');
    expect(result).not.toContain('embed');
  });

  test('returns non-string values unchanged', () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(null)).toBe(null);
    expect(sanitizeInput(undefined)).toBe(undefined);
    expect(sanitizeInput({ a: 1 })).toEqual({ a: 1 });
  });

  test('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  test('handles nested script variations', () => {
    const result = sanitizeInput('<SCRIPT>alert(1)</SCRIPT>');
    expect(result).not.toContain('SCRIPT');
  });
});

// ═══════════════════════════════════════════════════════════
// sanitizeBody (Express middleware)
// ═══════════════════════════════════════════════════════════
describe('sanitizeBody middleware', () => {
  function mockReqRes(body) {
    const req = { body };
    const res = {};
    const next = jest.fn();
    return { req, res, next };
  }

  test('sanitizes string fields in body', () => {
    const { req, res, next } = mockReqRes({
      name: '<script>alert(1)</script>John',
      email: 'john@test.com',
      age: 30,
    });
    
    sanitizeBody(req, res, next);
    
    expect(req.body.name).not.toContain('<script>');
    expect(req.body.name).toContain('John');
    expect(req.body.email).toBe('john@test.com');
    expect(req.body.age).toBe(30); // non-string unchanged
    expect(next).toHaveBeenCalled();
  });

  test('handles empty body', () => {
    const { req, res, next } = mockReqRes(null);
    sanitizeBody(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('handles body with no string fields', () => {
    const { req, res, next } = mockReqRes({ count: 5, active: true });
    sanitizeBody(req, res, next);
    expect(req.body.count).toBe(5);
    expect(req.body.active).toBe(true);
    expect(next).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// asyncHandler
// ═══════════════════════════════════════════════════════════
describe('asyncHandler', () => {
  test('catches async errors and forwards to next', async () => {
    const error = new Error('Test error');
    const fn = asyncHandler(async () => { throw error; });
    
    const next = jest.fn();
    await fn(null, null, next);
    
    expect(next).toHaveBeenCalledWith(error);
  });

  test('passes through successful handlers', async () => {
    const handler = jest.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(handler);
    
    const next = jest.fn();
    const req = {};
    const res = {};
    await wrapped(req, res, next);
    
    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// globalErrorHandler
// ═══════════════════════════════════════════════════════════
describe('globalErrorHandler', () => {
  /**
   * Creates a fresh Express app for each test.
   * Routes MUST be added before app.use(globalErrorHandler).
   * The returned app gives us a function to add more routes,
   * after which we call .finalize() to mount the error handler.
   */
  function createTestApp() {
    const router = express.Router();
    const app = express();
    // Add default error-throwing route
    router.get('/error', (req, res, next) => {
      next(new Error(req.query.msg || 'Generic error'));
    });
    app.use(router);
    // Return builder with finalize()
    return {
      router,
      app,
      finalize() {
        app.use(globalErrorHandler);
        return app;
      },
    };
  }

  test('masks rate limit errors with cognitive load message', async () => {
    const { app, finalize } = createTestApp();
    const res = await request(finalize()).get('/error?msg=rate%20limit%20exceeded');
    expect(res.status).toBe(503);
    // The actual error message sent to client
    expect(res.body.error).toMatch(/high load/i);
  });

  test('masks quota errors', async () => {
    const { app, finalize } = createTestApp();
    const res = await request(finalize()).get('/error?msg=quota%20exceeded');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/high load/i);
  });

  test('masks timeout errors', async () => {
    const { finalize } = createTestApp();
    const res = await request(finalize()).get('/error?msg=timeout');
    expect(res.status).toBe(503);
  });

  test('masks billing errors', async () => {
    const { finalize } = createTestApp();
    const res = await request(finalize()).get('/error?msg=billing%20error');
    expect(res.status).toBe(503);
  });

  test('masks OpenAI errors', async () => {
    const { finalize } = createTestApp();
    const res = await request(finalize()).get('/error?msg=openai%20api%20error');
    expect(res.status).toBe(503);
  });

  test('masks Stripe errors', async () => {
    const { finalize } = createTestApp();
    const res = await request(finalize()).get('/error?msg=stripe%20error');
    expect(res.status).toBe(503);
  });

  test('handles 429 status codes', async () => {
    const b = createTestApp();
    b.router.get('/429', (req, res, next) => {
      const err = new Error('Too many');
      err.status = 429;
      next(err);
    });
    const res = await request(b.finalize()).get('/429');
    expect(res.status).toBe(503);
  });

  test('handles DB errors with generic message', async () => {
    const b = createTestApp();
    b.router.get('/db-error', (req, res, next) => {
      const err = new Error('DB error');
      err.code = '42P01';
      next(err);
    });
    const res = await request(b.finalize()).get('/db-error');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/synthesizing/i);
  });

  test('returns raw error message in dev mode', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const { finalize } = createTestApp();
    
    const res = await request(finalize()).get('/error?msg=Something%20broke');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something broke');
    
    process.env.NODE_ENV = oldEnv;
  });

  test('returns generic message in production', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { finalize } = createTestApp();
    
    const res = await request(finalize()).get('/error?msg=Something%20broke');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/unexpected ripple/i);
    
    process.env.NODE_ENV = oldEnv;
  });
});
