/**
 * AGENT ORCHESTRATOR — Multi-Agent Cognitive Pipeline
 * 
 * Coordinates specialized agents that work together:
 *   RESEARCH_AGENT  → gathers context (web, memory, calendar)
 *   MEMORY_AGENT    → consolidates, detects patterns, prunes
 *   NUDGE_AGENT     → times notifications by urgency + quiet hours
 *   CALENDAR_AGENT  → tracks deadlines, commitments, schedules
 * 
 * Each agent has its own persistent memory stored in agent_memories table.
 * Agents communicate through the orchestrator's message bus.
 */

'use strict';

const { pool } = require('../src/db');
const { callLLM } = require('../src/llm-provider');
const { liveInfoSystem } = require('../agent-reach-integration');
const { createActivity } = require('../src/routes/activities');

// ── Agent Registry ─────────────────────────────────────────────────────────────
const AGENTS = {
  research: {
    name: 'Research Agent',
    description: 'Gathers web context, reads memory graph, summarizes findings',
    model: 'groq', // fast + cheap
  },
  memory: {
    name: 'Memory Agent',
    description: 'Consolidates related thoughts, detects patterns, prunes stale data',
    model: 'groq',
  },
  nudge: {
    name: 'Nudge Agent',
    description: 'Decides when and how to notify based on urgency, timing, user prefs',
    model: 'groq',
  },
  calendar: {
    name: 'Calendar Agent',
    description: 'Tracks deadlines, detects scheduling conflicts, suggests rescheduling',
    model: 'groq',
  },
};

// ── Agent Memory Table ─────────────────────────────────────────────────────────
const AGENT_MEMORY_TABLE = 'agent_memories';

async function ensureAgentTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${AGENT_MEMORY_TABLE} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        agent_id VARCHAR(50) NOT NULL,
        memory_type VARCHAR(50) NOT NULL,
        content JSONB NOT NULL,
        importance FLOAT DEFAULT 0.5,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_memories_user ON ${AGENT_MEMORY_TABLE}(user_id, agent_id)`);
  } catch { /* already exists */ }
}

// ── Agent Memory Operations ────────────────────────────────────────────────────

async function storeAgentMemory(userId, agentId, memoryType, content, importance = 0.5, ttlHours = null) {
  try {
    const expiresAt = ttlHours ? new Date(Date.now() + ttlHours * 3600000).toISOString() : null;
    await pool.query(
      `INSERT INTO ${AGENT_MEMORY_TABLE} (user_id, agent_id, memory_type, content, importance, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, agentId, memoryType, JSON.stringify(content), importance, expiresAt]
    );
  } catch { /* non-critical */ }
}

async function recallAgentMemory(userId, agentId, memoryType, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT content FROM ${AGENT_MEMORY_TABLE}
       WHERE user_id = $1 AND agent_id = $2 AND memory_type = $3
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY importance DESC, created_at DESC
       LIMIT $4`,
      [userId, agentId, memoryType, limit]
    );
    return result.rows.map(r => r.content);
  } catch { return []; }
}

// ── Agent Base Class ───────────────────────────────────────────────────────────

class CognitiveAgent {
  constructor(id, userId, messenger) {
    this.id = id;
    this.userId = userId;
    this.messenger = messenger;
    this.config = AGENTS[id];
  }

  async remember(type, content, importance = 0.5, ttlHours = 168) {
    await storeAgentMemory(this.userId, this.id, type, content, importance, ttlHours);
  }

  async recall(type, limit = 10) {
    return recallAgentMemory(this.userId, this.id, type, limit);
  }

  async think(systemPrompt, userMessage) {
    const user = { id: this.userId, tier: 'pro', api_keys: {}, data_sharing: true };
    return callLLM(user, userMessage, [], 'agent', [], [], {
      response_style: 'concise',
      bullet_points: true,
      custom_instructions: systemPrompt,
    });
  }

  async notify(message, channel = null) {
    if (this.messenger) {
      await this.messenger.send({ to: this.userId, message, channel, title: `🧠 ${this.config.name}` }).catch(() => {});
    }
    await createActivity(this.userId, 'agent_nudge', this.config.name, message).catch(() => {});
  }
}

// ── Specialized Agents ─────────────────────────────────────────────────────────

class ResearchAgent extends CognitiveAgent {
  constructor(userId, messenger) {
    super('research', userId, messenger);
  }

  async run(query) {
    const context = await liveInfoSystem.searchWeb(query);
    const memories = await recallAgentMemory(this.userId, 'research', 'finding', 5);
    const prevFindings = memories.map(m => `- ${m.summary || m.title || 'Previous finding'}`).join('\n');

    const prompt = `You are a research assistant. Previous findings:\n${prevFindings || 'None yet'}\n\nSummarize what's new or different.`;
    const summary = await this.think(prompt, query);

    await this.remember('finding', { query, summary, timestamp: new Date().toISOString() }, 0.7, 336);
    return summary;
  }
}

class MemoryAgent extends CognitiveAgent {
  constructor(userId, messenger) {
    super('memory', userId, messenger);
  }

  async consolidate() {
    // Find related unconsolidated thoughts
    const thoughts = await pool.query(
      `SELECT id, content, category, created_at FROM memory_graph
       WHERE user_id = $1 AND (archived = false OR archived IS NULL)
       ORDER BY created_at DESC LIMIT 20`,
      [this.userId]
    ).catch(() => ({ rows: [] }));

    if (thoughts.rows.length < 3) return 'Not enough thoughts to consolidate';

    const contentList = thoughts.rows.map(t => `[${t.category || 'general'}] ${t.content}`).join('\n');
    const prompt = `Group these thoughts into 2-4 themes. For each theme, suggest a summary label and list the thought IDs that belong to it.`;
    const result = await this.think(prompt, contentList);

    await this.remember('consolidation', { summary: result, thoughtCount: thoughts.rows.length }, 0.5, 720);
    return result;
  }

  async detectPatterns() {
    const recent = await recallAgentMemory(this.userId, 'memory', 'consolidation', 5);
    const prevPatterns = await recallAgentMemory(this.userId, 'memory', 'pattern', 5);
    const context = [...recent, ...prevPatterns].map(m => JSON.stringify(m)).join('\n');
    
    const prompt = `Based on these cognitive patterns, identify recurring themes or concerns. If you spot the same theme appearing 3+ times, flag it as a pattern.`;
    const result = await this.think(prompt, context || 'No patterns yet, begin observing.');
    await this.remember('pattern', { pattern: result, detectedAt: new Date().toISOString() }, 0.6, 720);
    return result;
  }
}

class NudgeAgent extends CognitiveAgent {
  constructor(userId, messenger) {
    super('nudge', userId, messenger);
  }

  async shouldNudge() {
    // Check quiet hours from user preferences
    try {
      const prefs = await pool.query(
        "SELECT agent_preferences FROM users WHERE id = $1",
        [this.userId]
      ).catch(() => ({ rows: [{ agent_preferences: {} }] }));
      const p = prefs.rows[0]?.agent_preferences || {};
      if (p.quiet_hours_enabled) {
        const start = (p.quiet_hours_start || '22:00').split(':').map(Number);
        const end = (p.quiet_hours_end || '08:00').split(':').map(Number);
        const now = new Date();
        const min = now.getHours() * 60 + now.getMinutes();
        const sMin = start[0] * 60 + (start[1] || 0);
        const eMin = end[0] * 60 + (end[1] || 0);
        if (sMin <= eMin ? (min >= sMin && min < eMin) : (min >= sMin || min < eMin)) {
          return false; // quiet hours active
        }
      }
      if (p.nudge_frequency === 'low') return Math.random() < 0.3; // 30% chance
      if (p.nudge_frequency === 'high') return Math.random() < 0.8;
      return Math.random() < 0.5; // normal: 50%
    } catch { return true; }
  }

  async processUrgentThoughts() {
    if (!(await this.shouldNudge())) return 'Quiet hours — skipped';

    const urgent = await pool.query(
      `SELECT id, content, category, urgency_tier, expires_at FROM memory_graph
       WHERE user_id = $1 AND status = 'pending' AND urgency_tier IN ('critical', 'high')
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY urgency_tier DESC LIMIT 3`,
      [this.userId]
    ).catch(() => ({ rows: [] }));

    if (urgent.rows.length === 0) return 'No urgent items';

    const prompt = `The user has these urgent items. For each, suggest ONE specific action they can take right now (under 10 words):`;
    const suggestions = await this.think(prompt, urgent.rows.map(t => `[${t.urgency_tier}] ${t.content}${t.expires_at ? ` (due: ${new Date(t.expires_at).toLocaleDateString()})` : ''}`).join('\n'));

    await this.notify(`⚡ ${urgent.rows.length} urgent item(s) need attention\n${suggestions}`);
    return suggestions;
  }
}

class CalendarAgent extends CognitiveAgent {
  constructor(userId, messenger) {
    super('calendar', userId, messenger);
  }

  async checkDeadlines() {
    const upcoming = await pool.query(
      `SELECT id, content, category, expires_at, urgency_tier FROM memory_graph
       WHERE user_id = $1 AND status = 'pending' AND expires_at IS NOT NULL
       AND expires_at > NOW() AND expires_at < NOW() + INTERVAL '48 hours'
       ORDER BY expires_at ASC`,
      [this.userId]
    ).catch(() => ({ rows: [] }));

    if (upcoming.rows.length === 0) return 'No upcoming deadlines';

    const prompt = `The user has these deadlines in the next 48 hours. Prioritize them and suggest a simple plan:`;
    const plan = await this.think(prompt, upcoming.rows.map(t =>
      `[${t.urgency_tier}] ${t.content} — due ${new Date(t.expires_at).toLocaleString()}`
    ).join('\n'));

    await this.notify(`📅 ${upcoming.rows.length} deadline(s) approaching\n${plan}`);
    return plan;
  }

  async detectOvercommitment() {
    const thisWeek = await pool.query(
      `SELECT COUNT(*) as total FROM memory_graph
       WHERE user_id = $1 AND category = 'commitment' AND status = 'pending'
       AND expires_at > NOW() AND expires_at < NOW() + INTERVAL '7 days'`,
      [this.userId]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    const count = parseInt(thisWeek.rows[0]?.total || 0);
    if (count > 5) {
      const msg = `⚠️ You have ${count} commitments this week. Consider delegating or rescheduling some.`;
      await this.notify(msg);
      return msg;
    }
    return `Commitment load: ${count} this week — manageable`;
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────────────

class AgentOrchestrator {
  constructor(messenger) {
    this.messenger = messenger;
    this.agents = {};
  }

  getAgent(userId) {
    if (!this.agents[userId]) {
      this.agents[userId] = {
        research: new ResearchAgent(userId, this.messenger),
        memory: new MemoryAgent(userId, this.messenger),
        nudge: new NudgeAgent(userId, this.messenger),
        calendar: new CalendarAgent(userId, this.messenger),
      };
    }
    return this.agents[userId];
  }

  async runFullCycle(userId) {
    const agents = this.getAgent(userId);
    const results = {};
    
    // Phase 1: Research + Memory (gather + consolidate)
    try { results.memory = await agents.memory.consolidate(); } catch (e) { results.memory = `Memory agent: ${e.message}`; }
    
    // Phase 2: Calendar (deadlines + overcommitment)
    try { results.calendar = await agents.calendar.checkDeadlines(); } catch (e) { results.calendar = `Calendar agent: ${e.message}`; }
    try { results.overcommit = await agents.calendar.detectOvercommitment(); } catch (e) { /* skip */ }
    
    // Phase 3: Nudge (urgent items + timing)
    try { results.nudge = await agents.nudge.processUrgentThoughts(); } catch (e) { results.nudge = `Nudge agent: ${e.message}`; }
    
    // Phase 4: Memory pattern detection (weekly)
    try {
      const patterns = await recallAgentMemory(userId, 'memory', 'pattern', 1);
      const lastPattern = patterns[0]?.detectedAt ? new Date(patterns[0].detectedAt) : null;
      if (!lastPattern || (Date.now() - lastPattern.getTime()) > 86400000) {
        results.patterns = await agents.memory.detectPatterns();
      }
    } catch { /* skip */ }

    return results;
  }

  async handleInboundThought(userId, message) {
    // When a user sends a thought, run the research agent to enrich it
    const agents = this.getAgent(userId);
    let enrichment = null;
    if (message.length > 20) {
      try { enrichment = await agents.research.run(message); } catch { /* optional */ }
    }
    return enrichment;
  }
}

// ── API Endpoints ──────────────────────────────────────────────────────────────

function createAgentOrchestratorEndpoints(app, messenger) {
  const orchestrator = new AgentOrchestrator(messenger);
  const { authMiddleware } = require('../src/auth');

  // POST /api/agents/cycle — run full agent cycle for current user
  app.post('/api/agents/cycle', authMiddleware, async (req, res) => {
    try {
      const results = await orchestrator.runFullCycle(req.user.userId);
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agents/status — agent activity for this user
  app.get('/api/agents/status', authMiddleware, async (req, res) => {
    try {
      const memories = await pool.query(
        `SELECT agent_id, memory_type, content, importance, created_at
         FROM ${AGENT_MEMORY_TABLE}
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [req.user.userId]
      ).catch(() => ({ rows: [] }));
      res.json({ agents: AGENTS, recentActivity: memories.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/agents/enrich — run research agent on a specific query
  app.post('/api/agents/enrich', authMiddleware, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: 'Query required' });
      const research = new ResearchAgent(req.user.userId, messenger);
      const result = await research.run(query);
      res.json({ success: true, enrichment: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return orchestrator;
}

module.exports = {
  AgentOrchestrator,
  ResearchAgent, MemoryAgent, NudgeAgent, CalendarAgent,
  createAgentOrchestratorEndpoints,
  ensureAgentTable,
  storeAgentMemory,
  recallAgentMemory,
};
