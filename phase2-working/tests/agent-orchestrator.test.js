/**
 * Multi-Agent System Tests
 */
const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../src/auth', () => ({
  authMiddleware: (req, _res, next) => { req.user = { userId: 'test-user-uuid', isAdmin: false }; next(); },
}));

jest.mock('../src/llm-provider', () => ({
  callLLM: jest.fn().mockResolvedValue('Test agent response'),
}));

jest.mock('../agent-reach-integration', () => ({
  liveInfoSystem: { searchWeb: jest.fn().mockResolvedValue({ results: [{ title: 'Test', content: 'Test content' }] }) },
}));

jest.mock('../src/routes/activities', () => ({
  createActivity: jest.fn().mockResolvedValue(undefined),
}));

const { pool } = require('../src/db');
const { 
  AgentOrchestrator, ResearchAgent, MemoryAgent, NudgeAgent, CalendarAgent,
  storeAgentMemory, recallAgentMemory 
} = require('../features/agent-orchestrator');

const mockMessenger = { send: jest.fn().mockResolvedValue({ delivered: true }) };

describe('Multi-Agent System', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Agent Memory', () => {
    test('storeAgentMemory inserts into pool', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      await storeAgentMemory('user-1', 'research', 'finding', { summary: 'test' }, 0.7, 168);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_memories'),
        expect.arrayContaining(['user-1', 'research', 'finding'])
      );
    });

    test('recallAgentMemory returns memories', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ content: { summary: 'test' } }] });
      const result = await recallAgentMemory('user-1', 'research', 'finding');
      expect(result).toHaveLength(1);
    });
  });

  describe('ResearchAgent', () => {
    test('run calls search and returns summary', async () => {
      const agent = new ResearchAgent('user-1', mockMessenger);
      pool.query.mockResolvedValue({ rows: [] });
      const result = await agent.run('test query');
      expect(result).toBeTruthy();
    });
  });

  describe('MemoryAgent', () => {
    test('consolidate returns message when few thoughts', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: '1', content: 'test', category: 'work', created_at: new Date() }] });
      const agent = new MemoryAgent('user-1', mockMessenger);
      const result = await agent.consolidate();
      expect(result).toMatch(/enough/);
    });
  });

  describe('CalendarAgent', () => {
    test('detectOvercommitment warns at threshold', async () => {
      pool.query.mockResolvedValue({ rows: [{ total: 6 }] });
      const agent = new CalendarAgent('user-1', mockMessenger);
      const result = await agent.detectOvercommitment();
      expect(result).toMatch(/commitments this week/);
    });

    test('detectOvercommitment is fine under threshold', async () => {
      pool.query.mockResolvedValue({ rows: [{ total: 3 }] });
      const agent = new CalendarAgent('user-1', mockMessenger);
      const result = await agent.detectOvercommitment();
      expect(result).toMatch(/manageable/);
    });
  });

  describe('AgentOrchestrator', () => {
    test('runFullCycle runs all agents without crashing', async () => {
      pool.query.mockResolvedValue({ rows: [] }); // all DB calls return empty
      const orch = new AgentOrchestrator(mockMessenger);
      const results = await orch.runFullCycle('user-1');
      expect(results).toHaveProperty('memory');
      expect(results).toHaveProperty('calendar');
      expect(results).toHaveProperty('nudge');
    });
  });
});

describe('Agent API Endpoints', () => {
  const { createAgentOrchestratorEndpoints } = require('../features/agent-orchestrator');
  const app = express();
  app.use(express.json());
  const orch = createAgentOrchestratorEndpoints(app, mockMessenger);
  app.post('/api/agents/cycle', async (req, res) => {
    const results = await orch.runFullCycle(req.user.userId);
    res.json({ success: true, results });
  });

  test('POST /api/agents/cycle returns results', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/agents/cycle');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
