/**
 * BEHAVIORAL LEARNING ENGINE
 *
 * Learns from actual user behavior to make personalized predictions:
 * - Which thoughts get completed vs abandoned
 * - Peak productivity hours (from actual completions, not just creation)
 * - Which categories/types the user follows through on
 * - Time-to-completion patterns
 * - Stress indicators (rapid thought creation = overwhelm)
 *
 * All math on existing data. Zero API calls. Zero cost.
 */

'use strict';

const { pool } = require('./db');

// ── Learning Window ────────────────────────────────────────────────────────
const LEARNING_WINDOW_DAYS = 90; // look back 90 days
const MIN_DATAPOINTS = 5;        // need at least 5 data points for predictions

/**
 * Learn a user's behavioral profile from their historical data.
 * Returns a profile object used by all other prediction systems.
 */
async function learnBehavioralProfile(userId) {
  const windowStart = new Date(Date.now() - LEARNING_WINDOW_DAYS * 86400000).toISOString();

  const [completionPatterns, hourlyPatterns, categoryPatterns, stressPatterns, timeToComplete] = await Promise.all([
    // 1. Completion patterns: what gets done vs what doesn't
    pool.query(`
      SELECT
        status,
        category,
        urgency_tier,
        is_actionable,
        EXTRACT(HOUR FROM created_at) as hour_created,
        EXTRACT(DOW FROM created_at) as dow_created,
        EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at)) / 3600 as hours_to_update
      FROM memory_graph
      WHERE user_id = $1 AND created_at >= $2
    `, [userId, windowStart]),

    // 2. Hourly productivity: when do thoughts get COMPLETED (not just created)
    pool.query(`
      SELECT
        EXTRACT(HOUR FROM updated_at) as hour_completed,
        COUNT(*) as count
      FROM memory_graph
      WHERE user_id = $1
        AND created_at >= $2
        AND status IN ('completed', 'done')
      GROUP BY EXTRACT(HOUR FROM updated_at)
      ORDER BY count DESC
    `, [userId, windowStart]),

    // 3. Category follow-through rates
    pool.query(`
      SELECT
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed,
        COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as overdue
      FROM memory_graph
      WHERE user_id = $1 AND created_at >= $2
      GROUP BY category
    `, [userId, windowStart]),

    // 4. Stress patterns: rapid thought creation = overwhelm
    pool.query(`
      SELECT
        DATE(created_at) as day,
        COUNT(*) as thoughts_per_day,
        COUNT(CASE WHEN urgency_tier = 'critical' THEN 1 END) as critical_count
      FROM memory_graph
      WHERE user_id = $1 AND created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY day
    `, [userId, windowStart]),

    // 5. Time-to-completion distribution
    pool.query(`
      SELECT
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 as hours,
        category
      FROM memory_graph
      WHERE user_id = $1
        AND created_at >= $2
        AND status IN ('completed', 'done')
        AND updated_at > created_at
    `, [userId, windowStart]),
  ]);

  // Build the behavioral profile
  const profile = {
    // Peak completion hours (sorted by frequency)
    peakHours: hourlyPatterns.rows.map(r => ({
      hour: parseInt(r.hour_completed),
      count: parseInt(r.count),
    })).sort((a, b) => b.count - a.count),

    // Category reliability scores
    categoryReliability: {},
    // Stress threshold (avg daily thoughts before overwhelm)
    stressThreshold: 15,
    // Average time to completion by category
    avgTimeToComplete: {},
    // Completion rate overall
    overallCompletionRate: 0,
    // Day-of-week completion patterns
    dowPatterns: {},
    // Whether user tends to complete or abandon
    completionTendency: 'neutral',
  };

  // Calculate category reliability
  let totalCompleted = 0, totalThoughts = 0;
  for (const row of categoryPatterns.rows) {
    const cat = row.category || 'general';
    const total = parseInt(row.total);
    const completed = parseInt(row.completed);
    const overdue = parseInt(row.overdue);
    totalCompleted += completed;
    totalThoughts += total;

    profile.categoryReliability[cat] = {
      total,
      completed,
      overdue,
      completionRate: total > 0 ? completed / total : 0,
      stressScore: overdue > 0 ? Math.min(overdue * 2, 10) : 0,
    };
  }

  profile.overallCompletionRate = totalThoughts > 0 ? totalCompleted / totalThoughts : 0;
  profile.completionTendency = profile.overallCompletionRate > 0.6 ? 'completer' :
    profile.overallCompletionRate < 0.3 ? 'abandoner' : 'neutral';

  // Calculate stress threshold from daily thought volumes
  const dailyVolumes = stressPatterns.rows.map(r => parseInt(r.thoughts_per_day));
  if (dailyVolumes.length > 0) {
    const sorted = [...dailyVolumes].sort((a, b) => a - b);
    // 80th percentile = stress threshold
    profile.stressThreshold = sorted[Math.floor(sorted.length * 0.8)] || 15;
  }

  // Calculate avg time to completion
  for (const row of timeToComplete.rows) {
    const cat = row.category || 'general';
    const hours = parseFloat(row.hours);
    if (!profile.avgTimeToComplete[cat]) profile.avgTimeToComplete[cat] = [];
    profile.avgTimeToComplete[cat].push(hours);
  }
  for (const [cat, hours] of Object.entries(profile.avgTimeToComplete)) {
    const sorted = hours.sort((a, b) => a - b);
    profile.avgTimeToComplete[cat] = sorted[Math.floor(sorted.length / 2)] || 0; // median
  }

  // Day-of-week patterns
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const row of completionPatterns.rows) {
    const dow = parseInt(row.dow_created);
    if (!profile.dowPatterns[dowNames[dow]]) {
      profile.dowPatterns[dowNames[dow]] = { created: 0, completed: 0 };
    }
    profile.dowPatterns[dowNames[dow]].created++;
    if (row.status === 'completed' || row.status === 'done') {
      profile.dowPatterns[dowNames[dow]].completed++;
    }
  }

  return profile;
}

/**
 * Predict whether a thought will be completed based on behavioral profile.
 */
function predictCompletion(thought, profile) {
  if (!profile || profile.peakHours.length === 0) {
    return { probability: 0.5, factors: ['insufficient data'] };
  }

  let probability = profile.overallCompletionRate;
  const factors = [];

  // Factor 1: Category reliability
  const catReliability = profile.categoryReliability[thought.category];
  if (catReliability) {
    const catRate = catReliability.completionRate;
    probability = (probability + catRate) / 2;
    factors.push(`${thought.category}: ${Math.round(catRate * 100)}% historically`);
  }

  // Factor 2: Time of day (is it during peak hours?)
  const hour = new Date().getHours();
  const isPeakHour = profile.peakHours.some(p => Math.abs(p.hour - hour) <= 1);
  if (isPeakHour) {
    probability = Math.min(probability + 0.1, 1);
    factors.push('Peak productivity hour');
  } else {
    probability = Math.max(probability - 0.05, 0);
    factors.push('Off-peak hour');
  }

  // Factor 3: Urgency tier
  if (thought.urgency_tier === 'critical') {
    probability = Math.min(probability + 0.15, 1);
    factors.push('Critical urgency boosts completion');
  } else if (thought.urgency_tier === 'low') {
    probability = Math.max(probability - 0.1, 0);
    factors.push('Low urgency reduces completion likelihood');
  }

  // Factor 4: Current stress level
  const currentStress = profile.stressThreshold;
  // If we're above stress threshold, completion probability drops
  // (user is overwhelmed, less likely to follow through)

  return {
    probability: Math.round(probability * 100) / 100,
    factors,
    recommendation: probability > 0.6 ? 'high' : probability > 0.3 ? 'medium' : 'low',
  };
}

/**
 * Suggest optimal time to tackle a thought based on user patterns.
 */
function suggestOptimalTime(thought, profile) {
  if (!profile || profile.peakHours.length === 0) {
    return { hour: 9, reason: 'default (no data)' };
  }

  const cat = thought.category || 'general';
  const reliability = profile.categoryReliability[cat];

  // If this is a low-reliability category, suggest during peak hours
  if (reliability && reliability.completionRate < 0.4) {
    const peakHour = profile.peakHours[0];
    return {
      hour: peakHour.hour,
      reason: `${cat} has ${Math.round(reliability.completionRate * 100)}% completion rate — tackle during your peak hour (${peakHour.hour}:00)`,
    };
  }

  // Default: suggest the peak hour
  return {
    hour: profile.peakHours[0].hour,
    reason: `Your most productive hour is ${profile.peakHours[0].hour}:00`,
  };
}

/**
 * Detect stress/overload from recent thought patterns.
 */
function detectStress(dailyThoughtsToday, profile) {
  if (!profile) return { level: 'unknown', score: 0 };

  const threshold = profile.stressThreshold;
  const ratio = dailyThoughtsToday / threshold;

  let level = 'normal';
  let score = Math.min(Math.round(ratio * 50), 100);

  if (ratio > 1.5) { level = 'overwhelmed'; score = Math.min(score + 20, 100); }
  else if (ratio > 1.0) { level = 'stressed'; score = Math.min(score + 10, 100); }
  else if (ratio < 0.3) { level = 'underengaged'; score = Math.max(score - 20, 0); }

  return { level, score, threshold, current: dailyThoughtsToday };
}

module.exports = {
  learnBehavioralProfile,
  predictCompletion,
  suggestOptimalTime,
  detectStress,
  LEARNING_WINDOW_DAYS,
  MIN_DATAPOINTS,
};
