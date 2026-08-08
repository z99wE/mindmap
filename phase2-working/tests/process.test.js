const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring the router
jest.mock('../src/db', () => ({
  pool: {
    connect: jest.fn(),
  }
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { userId: 1 };
    next();
  }
}));

jest.mock('../src/llm-provider', () => ({
  callLLM: jest.fn(),
}));

jest.mock('../src/thought-tracer', () => ({
  createTrace: () => ({ updateThoughtId: jest.fn() }),
  createSpan: () => ({}),
  endSpan: () => {},
}));

const { pool } = require('../src/db');
const { callLLM } = require('../src/llm-provider');
const processRouter = require('../src/routes/process');
const { asyncHandler, globalErrorHandler } = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/process', processRouter);
app.use(globalErrorHandler);

describe('Process Route Transaction & Billing', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);
    
    mockClient.query.mockImplementation((query) => {
      // Mock user lookup
      if (query.includes('SELECT daily_runs_used')) {
        return Promise.resolve({ rows: [{ daily_runs_used: 1, daily_runs_limit: 10, tier: 'pro', data_sharing: true }] });
      }
      // Mock memory save returning ID
      if (query.includes('INSERT INTO memory_graph')) {
        return Promise.resolve({ rows: [{ id: 100 }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should COMMIT transaction on successful thought processing', async () => {
    callLLM.mockResolvedValueOnce('AI Response');

    const response = await request(app)
      .post('/api/process/message')
      .send({ message: 'Hello world' });

    expect(response.status).toBe(200);
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET daily_runs_used = daily_runs_used + 1'),
      expect.any(Array)
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should ROLLBACK transaction if LLM or downstream fails (atomic billing protection)', async () => {
    callLLM.mockRejectedValueOnce(new Error('rate limit exceeded by LLM provider'));

    const response = await request(app)
      .post('/api/process/message')
      .send({ message: 'Hello world' });

    expect(response.status).toBe(503);
    // Should start tx
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    // Should NOT increment runs
    expect(mockClient.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET daily_runs_used = daily_runs_used + 1'),
      expect.any(Array)
    );
    // Should issue a ROLLBACK
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
    
    // Masked error handled by globalErrorHandler
    expect(response.body.error).toMatch(/high load/i);
  });
});
