/**
 * Brain Features API Routes
 * Mounts all deep-tech behavioral/ML features:
 *   - GET  /api/brain/profile         — behavioral profile
 *   - GET  /api/brain/predict/:id     — predict completion for a thought
 *   - GET  /api/brain/suggest-time    — optimal time suggestion
 *   - GET  /api/brain/stress          — current stress level
 *   - GET  /api/brain/cross-user      — anonymized cross-user insights
 *   - GET  /api/brain/similar/:id     — find similar historical thoughts
 *   - GET  /api/brain/recurrence      — recurring thought map
 *   - GET  /api/brain/proactive       — proactive insights
 *   - GET  /api/brain/priority-queue  — adaptive priority queue
 *   - GET  /api/brain/energy-match    — thought-energy matching
 *   - GET  /api/brain/vc-metrics      — VC-ready metrics
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../db');

const { learnBehavioralProfile, predictCompletion, suggestOptimalTime, detectStress } = require('../behavioral-learner');
const { getCrossUserInsights } = require('../cross-user-insights');
const { findSimilarHistorical, getRecurrenceMap } = require('../thought-similarity');
const { generateProactiveInsights } = require('../proactive-insights');
const { getAdaptivePriorityQueue, matchThoughtToEnergyLevel } = require('../adaptive-prioritizer');

// ── Behavioral Profile ─────────────────────────────────────────────────────
router.get('/brain/profile', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await learnBehavioralProfile(req.user.userId);
  res.json(profile);
}));

// ── Predict Completion ─────────────────────────────────────────────────────
router.get('/brain/predict/:id', authMiddleware, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM memory_graph WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Thought not found' });

  const profile = await learnBehavioralProfile(req.user.userId);
  const prediction = predictCompletion(result.rows[0], profile);
  res.json(prediction);
}));

// ── Suggest Optimal Time ───────────────────────────────────────────────────
router.get('/brain/suggest-time', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await learnBehavioralProfile(req.user.userId);
  const suggestion = suggestOptimalTime({ category: req.query.category || 'general' }, profile);
  res.json(suggestion);
}));

// ── Stress Level ───────────────────────────────────────────────────────────
router.get('/brain/stress', authMiddleware, asyncHandler(async (req, res) => {
  const todayResult = await pool.query(
    `SELECT COUNT(*) as count FROM memory_graph
     WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
    [req.user.userId]
  );
  const todayCount = parseInt(todayResult.rows[0]?.count || '0');
  const profile = await learnBehavioralProfile(req.user.userId);
  const stress = detectStress(todayCount, profile);
  res.json(stress);
}));

// ── Cross-User Insights ────────────────────────────────────────────────────
router.get('/brain/cross-user', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await learnBehavioralProfile(req.user.userId);
  const insights = await getCrossUserInsights(req.user.userId, profile);
  res.json(insights);
}));

// ── Similar Historical Thoughts ────────────────────────────────────────────
router.get('/brain/similar/:id', authMiddleware, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT content FROM memory_graph WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Thought not found' });

  const similar = await findSimilarHistorical(req.user.userId, result.rows[0].content, parseInt(req.params.id));
  res.json(similar);
}));

// ── Recurrence Map ─────────────────────────────────────────────────────────
router.get('/brain/recurrence', authMiddleware, asyncHandler(async (req, res) => {
  const map = await getRecurrenceMap(req.user.userId);
  res.json(map);
}));

// ── Proactive Insights ─────────────────────────────────────────────────────
router.get('/brain/proactive', authMiddleware, asyncHandler(async (req, res) => {
  const insights = await generateProactiveInsights(req.user.userId);
  res.json({ insights });
}));

// ── Adaptive Priority Queue ────────────────────────────────────────────────
router.get('/brain/priority-queue', authMiddleware, asyncHandler(async (req, res) => {
  const queue = await getAdaptivePriorityQueue(req.user.userId);
  res.json(queue);
}));

// ── Energy Match ───────────────────────────────────────────────────────────
router.get('/brain/energy-match', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await learnBehavioralProfile(req.user.userId);
  const match = matchThoughtToEnergyLevel(
    { urgency_tier: req.query.urgency || 'medium', is_actionable: true },
    new Date().getHours(),
    profile
  );
  res.json(match);
}));

// ── VC Metrics ─────────────────────────────────────────────────────────────
router.get('/brain/vc-metrics', authMiddleware, asyncHandler(async (req, res) => {
  const [userStats, retentionData, engagementData] = await Promise.all([
    // Core metrics
    pool.query(`
      SELECT
        COUNT(*) as total_thoughts,
        COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as overdue,
        COUNT(CASE WHEN witness_contact IS NOT NULL THEN 1 END) as with_witness,
        COUNT(CASE WHEN witness_contact IS NOT NULL AND status IN ('completed', 'done') THEN 1 END) as witness_completed,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        MIN(created_at) as first_thought,
        MAX(created_at) as last_thought
      FROM memory_graph WHERE user_id = $1
    `, [req.user.userId]),

    // Retention: days active in last 30/60/90 days
    pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN DATE(created_at) END) as d30,
        COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '60 days' THEN DATE(created_at) END) as d60,
        COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN DATE(created_at) END) as d90
      FROM memory_graph WHERE user_id = $1
    `, [req.user.userId]),

    // Daily engagement trend (last 14 days)
    pool.query(`
      SELECT DATE(created_at) as day, COUNT(*) as thoughts,
             COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
      FROM memory_graph
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at) ORDER BY day
    `, [req.user.userId]),
  ]);

  const stats = userStats.rows[0];
  const retention = retentionData.rows[0];
  const total = parseInt(stats.total_thoughts) || 0;
  const completed = parseInt(stats.completed) || 0;

  res.json({
    // Proof of value
    completionRate: total > 0 ? Math.round(completed / total * 100) : 0,
    witnessEffectiveness: parseInt(stats.with_witness) > 0
      ? Math.round(parseInt(stats.witness_completed) / parseInt(stats.with_witness) * 100)
      : null,
    // Engagement
    totalThoughts: total,
    activeDays: parseInt(stats.active_days) || 0,
    avgThoughtsPerDay: parseInt(stats.active_days) > 0
      ? Math.round(total / parseInt(stats.active_days) * 10) / 10
      : 0,
    // Retention
    retention: {
      d30: parseInt(retention.d30) || 0,
      d60: parseInt(retention.d60) || 0,
      d90: parseInt(retention.d90) || 0,
    },
    // Trend
    dailyTrend: engagementData.rows.map(r => ({
      date: r.day,
      thoughts: parseInt(r.thoughts),
      completed: parseInt(r.completed),
    })),
    // Staleness
    overdue: parseInt(stats.overdue) || 0,
    pending: parseInt(stats.pending) || 0,
  });
}));

module.exports = router;
