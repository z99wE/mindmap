/**
 * FORGETTING CURVE CALIBRATION
 *
 * Instead of using keyword-based half-life rules ("deadline" = 24h),
 * this learns from ACTUAL user behavior:
 *
 * - When does this user actually complete thoughts?
 * - How long do abandoned thoughts sit before being abandoned?
 * - What's the actual decay rate per category?
 * - Calibrates half-life hours to each user's real patterns
 *
 * Based on Ebbinghaus forgetting curve: R = e^(-t/S)
 * where S = stability (learned from user behavior)
 *
 * Cost: $0 — math on existing data
 */

'use strict';

const { pool } = require('./db');

// ── Constants ──────────────────────────────────────────────────────────────
const MIN_DATAPOINTS = 3;
const DEFAULT_HALF_LIFE = 48; // hours
const LEARNING_WINDOW_DAYS = 120;

/**
 * Learn the actual forgetting curve parameters for a user.
 * Returns per-category stability scores and an overall decay model.
 */
async function learnForgettingCurve(userId) {
  const windowStart = new Date(Date.now() - LEARNING_WINDOW_DAYS * 86400000).toISOString();

  // Get all thoughts with their lifecycle data
  const result = await pool.query(`
    SELECT
      id,
      category,
      urgency_tier,
      is_actionable,
      status,
      half_life_hours,
      created_at,
      updated_at,
      expires_at,
      CASE
        WHEN status IN ('completed', 'done') THEN
          EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
        WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN
          EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600
        ELSE NULL
      END AS lifecycle_hours,
      CASE
        WHEN status IN ('completed', 'done') THEN true
        ELSE false
      END AS was_completed
    FROM memory_graph
    WHERE user_id = $1 AND created_at >= $2
  `, [userId, windowStart]);

  const thoughts = result.rows;
  if (thoughts.length < MIN_DATAPOINTS) {
    return getDefaultCurve();
  }

  // Calculate per-category stability
  const categoryStats = {};
  for (const t of thoughts) {
    const cat = t.category || 'general';
    if (!categoryStats[cat]) {
      categoryStats[cat] = {
        completed: [],
        abandoned: [],
        total: 0,
      };
    }
    categoryStats[cat].total++;

    if (t.was_completed && t.lifecycle_hours !== null) {
      categoryStats[cat].completed.push(t.lifecycle_hours);
    } else if (!t.was_completed && t.lifecycle_hours !== null) {
      categoryStats[cat].abandoned.push(t.lifecycle_hours);
    }
  }

  // For each category, calculate stability (S) from Ebbinghaus curve
  // S = median time-to-completion for completed thoughts
  // Abandoned thoughts help us understand when thoughts "die"
  const curves = {};
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const completedMedian = median(stats.completed);
    const abandonedMedian = median(stats.abandoned);

    // Stability = how long thoughts survive in this category
    // Higher stability = slower decay = longer half-life
    let stability;
    if (completedMedian !== null && abandonedMedian !== null) {
      // Use weighted average: completed thoughts are "alive" longer
      stability = completedMedian * 0.6 + abandonedMedian * 0.4;
    } else if (completedMedian !== null) {
      stability = completedMedian;
    } else if (abandonedMedian !== null) {
      stability = abandonedMedian * 0.5; // abandoned = shorter
    } else {
      stability = DEFAULT_HALF_LIFE;
    }

    // Convert stability to half-life (hours)
    // Ebbinghaus: half-life ≈ S * ln(2) ≈ S * 0.693
    const calibratedHalfLife = Math.max(4, Math.round(stability * 0.693));

    curves[cat] = {
      stability: Math.round(stability),
      halfLifeHours: calibratedHalfLife,
      completedCount: stats.completed.length,
      abandonedCount: stats.abandoned.length,
      avgTimeToComplete: completedMedian ? Math.round(completedMedian) : null,
      confidence: stats.total >= MIN_DATAPOINTS ? 'high' : 'low',
    };
  }

  // Overall curve (all categories combined)
  const allCompleted = thoughts.filter(t => t.was_completed && t.lifecycle_hours !== null).map(t => t.lifecycle_hours);
  const allAbandoned = thoughts.filter(t => !t.was_completed && t.lifecycle_hours !== null).map(t => t.lifecycle_hours);
  const overallStability = median(allCompleted) || DEFAULT_HALF_LIFE;

  return {
    overall: {
      stability: Math.round(overallStability),
      halfLifeHours: Math.max(4, Math.round(overallStability * 0.693)),
      totalThoughts: thoughts.length,
      completionRate: allCompleted.length / thoughts.length,
    },
    byCategory: curves,
    learnedAt: new Date().toISOString(),
  };
}

/**
 * Predict the retention probability of a thought at a given age (hours).
 * Uses the calibrated Ebbinghaus curve.
 */
function predictRetention(thought, curve, ageHours) {
  const cat = thought.category || 'general';
  const catCurve = curve.byCategory?.[cat];
  const stability = catCurve?.stability || curve.overall?.stability || DEFAULT_HALF_LIFE;

  // Ebbinghaus: R = e^(-t/S)
  const retention = Math.exp(-ageHours / stability);

  return {
    retention: Math.round(retention * 100) / 100,
    stability,
    ageHours: Math.round(ageHours),
    recommendation: retention > 0.7 ? 'still_fresh' :
                    retention > 0.3 ? 'fading' :
                    retention > 0.1 ? 'nearly_forgotten' : 'likely_forgotten',
  };
}

/**
 * Suggest the optimal half-life for a new thought based on learned curves.
 */
function suggestHalfLife(thought, curve) {
  const cat = thought.category || 'general';
  const catCurve = curve.byCategory?.[cat];

  if (catCurve && catCurve.confidence === 'high') {
    return catCurve.halfLifeHours;
  }

  // Fall back to overall curve
  return curve.overall?.halfLifeHours || DEFAULT_HALF_LIFE;
}

/**
 * Get thoughts that are likely forgotten (low retention) but not expired.
 */
async function getForgottenThoughts(userId, curve) {
  const result = await pool.query(`
    SELECT id, content, category, urgency_tier, created_at, half_life_hours,
           EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
    FROM memory_graph
    WHERE user_id = $1
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 50
  `, [userId]);

  const forgotten = [];
  for (const thought of result.rows) {
    const prediction = predictRetention(thought, curve, thought.age_hours);
    if (prediction.retention < 0.2) {
      forgotten.push({
        ...thought,
        retention: prediction.retention,
        ageHours: Math.round(thought.age_hours),
        recommendation: prediction.recommendation,
      });
    }
  }

  return forgotten;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function median(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getDefaultCurve() {
  return {
    overall: { stability: DEFAULT_HALF_LIFE, halfLifeHours: 33, totalThoughts: 0, completionRate: 0 },
    byCategory: {},
    learnedAt: new Date().toISOString(),
    note: 'Insufficient data — using default curve',
  };
}

module.exports = {
  learnForgettingCurve,
  predictRetention,
  suggestHalfLife,
  getForgottenThoughts,
  DEFAULT_HALF_LIFE,
  LEARNING_WINDOW_DAYS,
};
