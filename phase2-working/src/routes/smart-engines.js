/**
 * SMART ENGINES API ROUTES
 *
 * Unified API for all 7 zero-cost intelligence engines:
 * 1. Forgetting Curve Calibration
 * 2. Thought Chain Detection
 * 3. Pattern Break Detection
 * 4. Thought Quality Scoring
 * 5. Social Proof Engine
 * 6. Energy-Aware Scheduling
 * 7. Commitment Escalation
 *
 * All endpoints require authentication.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');

// Lazy-load engines to avoid circular dependencies
const getEngines = () => ({
  forgettingCurve: require('../forgetting-curve'),
  thoughtChain: require('../thought-chain'),
  patternBreak: require('../pattern-break'),
  thoughtQuality: require('../thought-quality'),
  socialProof: require('../social-proof'),
  energyScheduler: require('../energy-scheduler'),
  commitmentEscalation: require('../commitment-escalation'),
});

// ── 1. Forgetting Curve ───────────────────────────────────────────────────

/**
 * GET /api/smart/forgetting-curve
 * Get the user's calibrated forgetting curve.
 */
router.get('/forgetting-curve', authMiddleware, async (req, res) => {
  try {
    const { forgettingCurve } = getEngines();
    const curve = await forgettingCurve.learnForgettingCurve(req.userId);
    res.json({ curve });
  } catch (e) {
    res.status(500).json({ error: 'Failed to learn forgetting curve', details: e.message });
  }
});

/**
 * GET /api/smart/forgotten
 * Get thoughts that are likely forgotten (low retention).
 */
router.get('/forgotten', authMiddleware, async (req, res) => {
  try {
    const { forgettingCurve } = getEngines();
    const curve = await forgettingCurve.learnForgettingCurve(req.userId);
    const forgotten = await forgettingCurve.getForgottenThoughts(req.userId, curve);
    res.json({ forgotten, count: forgotten.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to find forgotten thoughts', details: e.message });
  }
});

// ── 2. Thought Chain Detection ────────────────────────────────────────────

/**
 * GET /api/smart/chains
 * Get all active thought chains.
 */
router.get('/chains', authMiddleware, async (req, res) => {
  try {
    const { thoughtChain } = getEngines();
    const chains = await thoughtChain.getActiveChains(req.userId);
    res.json({ chains, count: chains.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to detect chains', details: e.message });
  }
});

/**
 * POST /api/smart/analyze-chain
 * Analyze a specific thought for chain potential.
 */
router.post('/analyze-chain', authMiddleware, async (req, res) => {
  try {
    const { thoughtChain } = getEngines();
    const { content, thoughtId } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const analysis = await thoughtChain.detectChain(req.userId, content, thoughtId);
    res.json({ analysis });
  } catch (e) {
    res.status(500).json({ error: 'Failed to analyze chain', details: e.message });
  }
});

// ── 3. Pattern Break Detection ────────────────────────────────────────────

/**
 * GET /api/smart/pattern-breaks
 * Detect all pattern breaks for the user.
 */
router.get('/pattern-breaks', authMiddleware, async (req, res) => {
  try {
    const { patternBreak } = getEngines();
    const breaks = await patternBreak.detectPatternBreaks(req.userId);
    res.json(breaks);
  } catch (e) {
    res.status(500).json({ error: 'Failed to detect pattern breaks', details: e.message });
  }
});

// ── 4. Thought Quality Scoring ────────────────────────────────────────────

/**
 * GET /api/smart/quality
 * Score quality of recent thoughts.
 */
router.get('/quality', authMiddleware, async (req, res) => {
  try {
    const { thoughtQuality, pool } = getEngines();
    const result = await pool.query(`
      SELECT id, content, category, urgency_tier, status
      FROM memory_graph
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.userId]);

    const scored = thoughtQuality.scoreBatchQuality(result.rows);
    res.json(scored);
  } catch (e) {
    res.status(500).json({ error: 'Failed to score quality', details: e.message });
  }
});

/**
 * POST /api/smart/score
 * Score a single thought's quality.
 */
router.post('/score', authMiddleware, async (req, res) => {
  try {
    const { thoughtQuality } = getEngines();
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const score = thoughtQuality.scoreThoughtQuality(content);
    res.json({ score });
  } catch (e) {
    res.status(500).json({ error: 'Failed to score thought', details: e.message });
  }
});

// ── 5. Social Proof ───────────────────────────────────────────────────────

/**
 * GET /api/smart/social-proof
 * Get anonymized social proof insights.
 */
router.get('/social-proof', authMiddleware, async (req, res) => {
  try {
    const { socialProof } = getEngines();
    const insights = await socialProof.getSocialProofInsights(req.userId);
    res.json(insights);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get social proof', details: e.message });
  }
});

// ── 6. Energy-Aware Scheduling ────────────────────────────────────────────

/**
 * GET /api/smart/energy
 * Get the user's energy curve and current status.
 */
router.get('/energy', authMiddleware, async (req, res) => {
  try {
    const { energyScheduler } = getEngines();
    const curve = await energyScheduler.learnEnergyCurve(req.userId);
    const crashes = await energyScheduler.detectEnergyCrashes(req.userId);
    res.json({ curve, crashes });
  } catch (e) {
    res.status(500).json({ error: 'Failed to learn energy curve', details: e.message });
  }
});

/**
 * POST /api/smart/energy/suggest
 * Suggest optimal time for a specific thought.
 */
router.post('/energy/suggest', authMiddleware, async (req, res) => {
  try {
    const { energyScheduler } = getEngines();
    const { thought } = req.body;
    if (!thought) return res.status(400).json({ error: 'thought required' });

    const suggestion = await energyScheduler.suggestOptimalTime(req.userId, thought);
    res.json({ suggestion });
  } catch (e) {
    res.status(500).json({ error: 'Failed to suggest time', details: e.message });
  }
});

// ── 7. Commitment Escalation ──────────────────────────────────────────────

/**
 * GET /api/smart/escalations
 * Get escalation suggestions for stale thoughts.
 */
router.get('/escalations', authMiddleware, async (req, res) => {
  try {
    const { commitmentEscalation } = getEngines();
    const escalations = await commitmentEscalation.getEscalations(req.userId);
    res.json(escalations);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get escalations', details: e.message });
  }
});

/**
 * POST /api/smart/escalations/act
 * Handle an escalation action.
 */
router.post('/escalations/act', authMiddleware, async (req, res) => {
  try {
    const { commitmentEscalation } = getEngines();
    const { thoughtId, action } = req.body;
    if (!thoughtId || !action) return res.status(400).json({ error: 'thoughtId and action required' });

    const result = await commitmentEscalation.handleEscalationAction(req.userId, thoughtId, action);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to handle escalation', details: e.message });
  }
});

// ── 8. All-in-One Dashboard ───────────────────────────────────────────────

/**
 * GET /api/smart/dashboard
 * Get all smart engine data in one call (for the dashboard page).
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const engines = getEngines();

    const [curve, chains, breaks, quality, social, energy, escalations] = await Promise.all([
      engines.forgettingCurve.learnForgettingCurve(req.userId).catch(() => null),
      engines.thoughtChain.getActiveChains(req.userId).catch(() => []),
      engines.patternBreak.detectPatternBreaks(req.userId).catch(() => ({ breaks: [] })),
      (async () => {
        const { pool } = require('../db');
        const result = await pool.query(`
          SELECT id, content, category, urgency_tier, status
          FROM memory_graph WHERE user_id = $1 AND status = 'pending'
          ORDER BY created_at DESC LIMIT 20
        `, [req.userId]);
        return engines.thoughtQuality.scoreBatchQuality(result.rows);
      })().catch(() => ({ scores: [], aggregate: {} })),
      engines.socialProof.getSocialProofInsights(req.userId).catch(() => ({ insights: [] })),
      engines.energyScheduler.learnEnergyCurve(req.userId).catch(() => ({ curve: {} })),
      engines.commitmentEscalation.getEscalations(req.userId).catch(() => ({ escalations: [] })),
    ]);

    res.json({
      forgettingCurve: curve,
      chains,
      patternBreaks: breaks,
      quality,
      socialProof: social,
      energy,
      escalations,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to build dashboard', details: e.message });
  }
});

module.exports = router;
