/**
 * Deep Features API Routes
 * Mounts all deep-tech feature endpoints:
 *   - GET  /api/rag/status         — RAG pipeline status
 *   - GET  /api/knowledge/graph     — knowledge graph
 *   - GET  /api/knowledge/entities  — search entities
 *   - GET  /api/knowledge/entity/:id — entity details
 *   - GET  /api/cognitive/prediction — predictive cognitive load
 *   - GET  /api/cognitive/realtime   — real-time load score
 *   - POST /api/clusters/run        — run clustering
 *   - GET  /api/clusters            — get clusters
 *   - GET  /api/clusters/stats      — cluster stats
 *   - POST /api/process/stream      — streaming LLM response (SSE)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../db');

// Feature modules
const { getRAGStatus } = require('../rag-pipeline');
const { getKnowledgeGraph, searchEntities, getEntityDetails } = require('../knowledge-graph');
const { getPrediction, getRealtimeLoad } = require('../cognitive-predictor');
const { clusterThoughts, getClusters, getClusterStats } = require('../thought-clustering');
const { streamLLM } = require('../streaming-llm');
const { callLLM } = require('../llm-provider');
const { classifyHalfLife } = require('../../../features/thought-half-life');
const { detectCommitment } = require('../../../features/commitment-witness');
const { detectIntent, detectUnanchored } = require('../../../features/thought-interceptor');
const { buildAgentInstructions } = require('./agent-preferences');

// ── RAG Pipeline ───────────────────────────────────────────────────────────
router.get('/rag/status', authMiddleware, (req, res) => {
  res.json(getRAGStatus());
});

// ── Knowledge Graph ────────────────────────────────────────────────────────
router.get('/knowledge/graph', authMiddleware, asyncHandler(async (req, res) => {
  const graph = await getKnowledgeGraph(req.user.userId, {
    entityType: req.query.type,
    limit: parseInt(req.query.limit) || 100,
  });
  res.json(graph);
}));

router.get('/knowledge/entities', authMiddleware, asyncHandler(async (req, res) => {
  if (!req.query.q) return res.json([]);
  const entities = await searchEntities(req.user.userId, req.query.q);
  res.json(entities);
}));

router.get('/knowledge/entity/:id', authMiddleware, asyncHandler(async (req, res) => {
  const details = await getEntityDetails(req.user.userId, req.params.id);
  if (!details.entity) return res.status(404).json({ error: 'Entity not found' });
  res.json(details);
}));

// ── Predictive Cognitive Load ──────────────────────────────────────────────
router.get('/cognitive/prediction', authMiddleware, asyncHandler(async (req, res) => {
  const prediction = await getPrediction(req.user.userId);
  res.json(prediction);
}));

router.get('/cognitive/realtime', authMiddleware, asyncHandler(async (req, res) => {
  const load = await getRealtimeLoad(req.user.userId);
  res.json(load);
}));

// ── Thought Clustering ─────────────────────────────────────────────────────
router.post('/clusters/run', authMiddleware, asyncHandler(async (req, res) => {
  const result = await clusterThoughts(req.user.userId);
  res.json(result);
}));

router.get('/clusters', authMiddleware, asyncHandler(async (req, res) => {
  const clusters = await getClusters(req.user.userId, {
    includeInactive: req.query.all === 'true',
  });
  res.json({ clusters });
}));

router.get('/clusters/stats', authMiddleware, asyncHandler(async (req, res) => {
  const stats = await getClusterStats(req.user.userId);
  res.json(stats);
}));

// ── Streaming LLM ──────────────────────────────────────────────────────────
router.post('/process/stream', authMiddleware, asyncHandler(async (req, res) => {
  const { message, localMemories } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  // Get user
  const userRes = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [req.user.userId]
  );
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Check daily run limit
  if (user.daily_runs_used >= user.daily_runs_limit) {
    return res.status(429).json({ error: 'Daily run limit reached' });
  }

  // RAG: search for related memories
  const { ragSearch, formatRAGContext } = require('../rag-pipeline');
  const ragMemories = await ragSearch(user.id, message);
  const ragContext = formatRAGContext(ragMemories);

  // Build context strings
  const contextStr = ragContext;
  const liveStr = '';
  const localStr = Array.isArray(localMemories) && localMemories.length > 0
    ? `\n\nAdditional historical memories:\n${localMemories.map(m => `- ${m.content || m}`).join('\n')}`
    : '';

  // Build agent instructions
  const agentPrefs = user.agent_preferences || {};
  const agentInstructions = buildAgentInstructions(agentPrefs);
  const styleGuide = agentInstructions ? `\nUser preferences: ${agentInstructions}` : '';

  const systemPrompt = `You are ReMentally, a cognitive coprocessor for ADHD/neurodiverse users.
You help organize thoughts, track commitments, detect patterns, and navigate cognitive load.
${contextStr}${localStr}${liveStr}
Be concise, empathetic, and action-oriented. Format key items as bullet points.${styleGuide}`;

  // Stream the response
  await streamLLM(user, systemPrompt, message, res);

  // Increment run counter (after streaming completes)
  await pool.query(
    'UPDATE users SET daily_runs_used = daily_runs_used + 1 WHERE id = $1',
    [user.id]
  );

  // Store the thought in memory graph (async, don't block)
  const intent = message.toLowerCase().includes('remind') ? 'commitment' : 'general';
  const halfLife = classifyHalfLife(message);
  const expiresAt = new Date(Date.now() + halfLife.half_life_hours * 60 * 60 * 1000).toISOString();
  const commitment = detectCommitment(message);

  pool.query(
    `INSERT INTO memory_graph (user_id, content, category, source, intent, half_life_hours,
       urgency_tier, action_verb, is_actionable, expires_at, status)
     VALUES ($1, $2, $3, 'user', $4, $5, $6, $7, $8, $9, $10)`,
    [
      user.id, message, halfLife.category, intent,
      halfLife.half_life_hours, halfLife.urgency_tier,
      halfLife.action_verb, halfLife.is_actionable,
      expiresAt, 'pending',
    ]
  ).catch(() => {});

  // Extract knowledge entities (async)
  const { extractKnowledge } = require('../knowledge-graph');
  extractKnowledge(user.id, null, message, user).catch(() => {});
}));

module.exports = router;
