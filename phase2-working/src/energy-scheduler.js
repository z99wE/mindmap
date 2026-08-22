/**
 * ENERGY-AWARE SCHEDULING
 *
 * Learns from actual completion timestamps when the user is TRULY productive
 * (not just when they think they are):
 *
 * - Maps their personal energy curve throughout the day
 * - Matches thought difficulty to energy level
 * - Suggests optimal times for different task types
 * - Detects energy crashes and suggests recovery
 *
 * Based on chronobiology research:
 * - Most people have 2-3 peak focus windows per day
 * - Post-lunch dip (1-3pm) reduces complex task performance by 30%
 * - Creative tasks peak in late morning, analytical tasks in early morning
 *
 * Cost: $0 — math on completion timestamps
 */

'use strict';

const { pool } = require('./db');

// ── Energy Curve Templates ────────────────────────────────────────────────
// Default energy curve (before personalization)
const DEFAULT_ENERGY_CURVE = {
  0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.2,
  6: 0.3, 7: 0.5, 8: 0.7, 9: 0.9, 10: 1.0, 11: 0.95,
  12: 0.7, 13: 0.5, 14: 0.6, 15: 0.85, 16: 0.9, 17: 0.8,
  18: 0.6, 19: 0.5, 20: 0.4, 21: 0.3, 22: 0.2, 23: 0.1,
};

/**
 * Learn a user's personal energy curve from their completion timestamps.
 * Returns a 24-hour energy profile.
 */
async function learnEnergyCurve(userId) {
  const result = await pool.query(`
    SELECT
      EXTRACT(HOUR FROM updated_at) as hour,
      COUNT(*) as completions,
      AVG(CASE WHEN urgency_tier = 'critical' THEN 3
               WHEN urgency_tier = 'high' THEN 2
               WHEN urgency_tier = 'medium' THEN 1
               ELSE 0 END) as avg_complexity
    FROM memory_graph
    WHERE user_id = $1
      AND status IN ('completed', 'done')
      AND updated_at > created_at
      AND updated_at > NOW() - INTERVAL '90 days'
    GROUP BY EXTRACT(HOUR FROM updated_at)
    ORDER BY hour
  `, [userId]);

  const curve = { ...DEFAULT_ENERGY_CURVE };
  const hasData = {};

  // Normalize completions to 0-1 energy score
  if (result.rows.length > 0) {
    const maxCompletions = Math.max(...result.rows.map(r => parseInt(r.completions)));

    for (const row of result.rows) {
      const hour = parseInt(row.hour);
      const normalized = parseInt(row.completions) / maxCompletions;
      curve[hour] = Math.max(0.1, normalized); // floor at 0.1 (never zero)
      hasData[hour] = true;
    }

    // Smooth the curve (fill gaps between known hours)
    for (let h = 0; h < 24; h++) {
      if (!hasData[h]) {
        const prev = curve[(h - 1 + 24) % 24];
        const next = curve[(h + 1) % 24];
        curve[h] = (prev + next) / 2;
      }
    }
  }

  // Find peak windows
  const peakWindows = findPeakWindows(curve);

  return {
    curve,
    peakWindows,
    hasPersonalData: result.rows.length > 0,
    dataPoints: result.rows.length,
  };
}

/**
 * Find the top 3 peak focus windows in the energy curve.
 */
function findPeakWindows(curve) {
  const windows = [];

  for (let h = 0; h < 24; h++) {
    // Check if this hour starts a window of 2+ consecutive high-energy hours
    let windowLength = 0;
    let windowEnergy = 0;

    for (let j = 0; j < 4; j++) { // max 4-hour window
      const checkHour = (h + j) % 24;
      if (curve[checkHour] >= 0.7) {
        windowLength++;
        windowEnergy += curve[checkHour];
      } else {
        break;
      }
    }

    if (windowLength >= 2) {
      windows.push({
        start: h,
        end: (h + windowLength) % 24,
        length: windowLength,
        avgEnergy: Math.round((windowEnergy / windowLength) * 100) / 100,
      });
    }
  }

  // Sort by energy, return top 3
  return windows
    .sort((a, b) => b.avgEnergy - a.avgEnergy)
    .slice(0, 3);
}

/**
 * Suggest the optimal time to tackle a specific thought.
 */
async function suggestOptimalTime(userId, thought) {
  const energyProfile = await learnEnergyCurve(userId);
  const currentHour = new Date().getHours();

  // Determine thought complexity
  const complexity = getThoughtComplexity(thought);

  // Find the best upcoming window for this complexity
  const bestWindow = findBestWindow(energyProfile.curve, complexity);

  // Check if we're currently in a good window
  const currentEnergy = energyProfile.curve[currentHour];
  const isGoodNow = currentEnergy >= 0.7 && complexity !== 'high';
  const isOptimalNow = currentEnergy >= 0.85;

  return {
    isOptimalNow,
    isGoodNow,
    currentEnergy: Math.round(currentEnergy * 100),
    bestWindow,
    complexity,
    energyProfile: energyProfile.curve,
    peakWindows: energyProfile.peakWindows,
    recommendation: isOptimalNow
      ? 'Great time to tackle this — you\'re in a peak window'
      : isGoodNow
        ? 'Good time for this — your energy is decent'
        : `Consider waiting until ${bestWindow.start}:00-${bestWindow.end}:00 (${bestWindow.label})`,
  };
}

/**
 * Determine a thought's complexity based on its characteristics.
 */
function getThoughtComplexity(thought) {
  const content = (thought.content || '').toLowerCase();
  const wordCount = content.split(/\s+/).length;

  let complexityScore = 0;

  // Length factor
  if (wordCount > 20) complexityScore += 2;
  else if (wordCount > 10) complexityScore += 1;

  // Urgency factor
  if (thought.urgency_tier === 'critical') complexityScore += 3;
  else if (thought.urgency_tier === 'high') complexityScore += 2;
  else if (thought.urgency_tier === 'medium') complexityScore += 1;

  // Action verb complexity
  const complexVerbs = ['analyze', 'design', 'architect', 'research', 'write', 'create', 'build', 'plan'];
  const simpleVerbs = ['send', 'email', 'call', 'buy', 'check', 'read', 'update', 'fix'];

  if (complexVerbs.some(v => content.includes(v))) complexityScore += 2;
  if (simpleVerbs.some(v => content.includes(v))) complexityScore -= 1;

  // Map to level
  if (complexityScore >= 4) return 'high';
  if (complexityScore >= 2) return 'medium';
  return 'low';
}

/**
 * Find the best upcoming energy window for a given complexity level.
 */
function findBestWindow(curve, complexity) {
  const currentHour = new Date().getHours();

  // Minimum energy thresholds by complexity
  const thresholds = { high: 0.85, medium: 0.65, low: 0.4 };
  const threshold = thresholds[complexity] || 0.65;

  // Scan next 12 hours for the best window
  const candidates = [];
  for (let i = 1; i <= 12; i++) {
    const hour = (currentHour + i) % 24;
    const energy = curve[hour];
    if (energy >= threshold) {
      candidates.push({ hour, energy });
    }
  }

  if (candidates.length === 0) {
    // Fallback: find any high-energy hour
    const bestHour = Object.entries(curve).sort((a, b) => b[1] - a[1])[0];
    return {
      start: parseInt(bestHour[0]),
      end: (parseInt(bestHour[0]) + 2) % 24,
      energy: Math.round(bestHour[1] * 100),
      label: `${complexity} energy window`,
    };
  }

  // Find the best consecutive window
  const best = candidates[0];
  return {
    start: best.hour,
    end: (best.hour + 2) % 24,
    energy: Math.round(best.energy * 100),
    label: `${complexity} energy window`,
  };
}

/**
 * Detect energy crashes (unusual low-energy periods).
 */
async function detectEnergyCrashes(userId) {
  const energyProfile = await learnEnergyCurve(userId);

  const crashes = [];
  const currentHour = new Date().getHours();

  // Check if current energy is significantly lower than usual
  const currentEnergy = energyProfile.curve[currentHour];
  const historicalAverage = Object.values(energyProfile.curve).reduce((a, b) => a + b, 0) / 24;

  if (currentEnergy < historicalAverage * 0.5) {
    crashes.push({
      type: 'current',
      severity: 'high',
      message: `Your energy is unusually low right now (${Math.round(currentEnergy * 100)}% vs normal ${Math.round(historicalAverage * 100)}%). Consider a break or easy tasks.`,
      currentEnergy: Math.round(currentEnergy * 100),
      normalEnergy: Math.round(historicalAverage * 100),
    });
  }

  // Check for post-lunch dip
  if (currentHour >= 13 && currentHour <= 14) {
    const lunchEnergy = energyProfile.curve[13];
    if (lunchEnergy < 0.5) {
      crashes.push({
        type: 'post_lunch',
        severity: 'medium',
        message: 'Post-lunch energy dip detected. Perfect time for quick, easy tasks — save complex work for later.',
        currentEnergy: Math.round(lunchEnergy * 100),
      });
    }
  }

  return crashes;
}

module.exports = {
  learnEnergyCurve,
  suggestOptimalTime,
  detectEnergyCrashes,
  DEFAULT_ENERGY_CURVE,
};
