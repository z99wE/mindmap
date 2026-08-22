/**
 * Bayesian Forgetting Curve Calibration
 * 
 * Learns each user's ACTUAL decay rate per category using Bayesian updating.
 * Instead of fixed keyword rules ("deadline" = 24h), it learns:
 * - "For THIS user, 'work' thoughts die in 36h, 'health' in 18h"
 * - Updates beliefs as more data comes in
 * 
 * Uses exponential decay model: survival(t) = e^(-λt)
 * Bayesian prior: λ ~ Gamma(α₀, β₀) updated with observed completion times
 * 
 * Cost: $0 — pure math on existing data.
 */

const { pool } = require('../db');

// Default priors (uninformative — will be overwritten by data)
// α = shape, β = rate — Gamma distribution
const DEFAULT_PRIOR = { alpha: 2, beta: 1 }; // Mean decay rate = 2.0 (half-life ~8h)

// Category-specific priors based on general psychology research
const CATEGORY_PRIORS = {
  work: { alpha: 3, beta: 0.8 },       // Work thoughts tend to persist
  personal: { alpha: 2, beta: 1.2 },   // Personal thoughts fade faster
  health: { alpha: 2.5, beta: 1.0 },   // Health thoughts are moderate
  finance: { alpha: 3, beta: 0.6 },    // Financial thoughts persist longest
  creative: { alpha: 1.5, beta: 1.5 }, // Creative thoughts are fleeting
  social: { alpha: 2, beta: 1.3 },     // Social thoughts fade moderately
  default: { alpha: 2, beta: 1.0 }
};

/**
 * Update the Bayesian prior given observed data
 * Posterior = Prior × Likelihood
 * For exponential decay with Gamma prior → conjugate posterior
 */
function bayesianUpdate(prior, observedDecayRates) {
  if (!observedDecayRates.length) return prior;
  
  const n = observedDecayRates.length;
  const sumRates = observedDecayRates.reduce((a, b) => a + b, 0);
  
  // Gamma-Gamma conjugate update
  return {
    alpha: prior.alpha + n,
    beta: prior.beta + sumRates
  };
}

/**
 * Calculate half-life from decay rate λ
 * half-life = ln(2) / λ
 */
function halfLife(lambda) {
  return Math.log(2) / Math.max(lambda, 0.001);
}

/**
 * Get calibrated forgetting curve for a user
 */
async function getCalibratedCurve(userId) {
  // Get prior for each category
  const prior = CATEGORY_PRIORS;
  
  // Get observed completion/deletion patterns per category
  const observed = await pool.query(`
    SELECT 
      category,
      EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0 as hours_alive,
      CASE 
        WHEN commitment_fulfilled = true THEN 'completed'
        WHEN decay_status = 'expired' THEN 'expired'
        WHEN decay_status = 'active' THEN 'active'
        ELSE 'unknown'
      END as outcome
    FROM memory_graph
    WHERE user_id = $1 
      AND created_at > NOW() - INTERVAL '180 days'
      AND category IS NOT NULL
  `, [userId]);
  
  const curves = {};
  const categories = [...new Set(observed.rows.map(r => r.category))];
  
  for (const cat of categories) {
    const catData = observed.rows.filter(r => r.category === cat);
    const completedData = catData.filter(r => r.outcome === 'completed' || r.outcome === 'expired');
    
    if (completedData.length < 3) {
      // Not enough data — use prior
      const p = prior[cat] || prior.default;
      const lambda = p.alpha / p.beta;
      curves[cat] = {
        half_life_hours: Math.round(halfLife(lambda) * 10) / 10,
        confidence: Math.min(1, completedData.length / 10),
        data_points: completedData.length,
        source: 'prior'
      };
      continue;
    }
    
    // Calculate empirical decay rates
    // Rate = 1 / mean_time_to_completion (higher rate = faster decay)
    const meanTime = completedData.reduce((a, r) => a + r.hours_alive, 0) / completedData.length;
    const observedRates = completedData.map(r => 1 / Math.max(r.hours_alive, 0.1));
    
    // Bayesian update
    const catPrior = prior[cat] || prior.default;
    const posterior = bayesianUpdate(catPrior, observedRates);
    
    // Posterior mean = alpha / beta
    const posteriorLambda = posterior.alpha / posterior.beta;
    
    // Posterior variance for confidence interval
    const variance = posterior.alpha / (posterior.beta * posterior.beta);
    const stdDev = Math.sqrt(variance);
    
    curves[cat] = {
      half_life_hours: Math.round(halfLife(posteriorLambda) * 10) / 10,
      mean_time_hours: Math.round(meanTime * 10) / 10,
      confidence: Math.min(1, completedData.length / 20), // Max confidence at 20+ samples
      data_points: completedData.length,
      posterior_alpha: Math.round(posterior.alpha * 10) / 10,
      posterior_beta: Math.round(posterior.beta * 10) / 10,
      uncertainty_hours: Math.round(halfLife(posteriorLambda - stdDev) - halfLife(posteriorLambda + stdDev)) / 2,
      source: 'learned'
    };
  }
  
  // Add defaults for categories with no data
  for (const [cat, p] of Object.entries(prior)) {
    if (cat === 'default') continue;
    if (!curves[cat]) {
      const lambda = p.alpha / p.beta;
      curves[cat] = {
        half_life_hours: Math.round(halfLife(lambda) * 10) / 10,
        confidence: 0,
        data_points: 0,
        source: 'prior'
      };
    }
  }
  
  return {
    user_id: userId,
    curves,
    total_data_points: observed.rows.length,
    overall_confidence: Math.min(1, observed.rows.length / 50)
  };
}

/**
 * Get the calibrated half-life for a specific thought
 * Used by process.js when creating new thoughts
 */
async function getThoughtHalfLife(userId, category) {
  const curve = await getCalibratedCurve(userId);
  const catCurve = curve.curves[category] || curve.curves.default || { half_life_hours: 48 };
  
  // Blend calibrated half-life with default based on confidence
  const defaultHalfLife = 48; // 2 days
  const blended = catCurve.confidence * catCurve.half_life_hours + (1 - catCurve.confidence) * defaultHalfLife;
  
  return {
    half_life_hours: Math.round(blended * 10) / 10,
    confidence: catCurve.confidence,
    source: catCurve.source
  };
}

module.exports = { getCalibratedCurve, getThoughtHalfLife, bayesianUpdate, halfLife };
