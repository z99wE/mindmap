/**
 * PREDICTIVE COGNITIVE LOAD — ML-based overload prediction
 *
 * Analyzes actual user behavior patterns (completion rates, response times,
 * time-of-day patterns, category distribution) to predict cognitive overload
 * before it happens.
 *
 * Instead of keyword-based ("deadline" = urgent), this uses statistical
 * analysis of the user's own history to make personalized predictions.
 *
 * Cost: $0 (math on existing data, no API calls)
 */

'use strict';

const { pool } = require('./db');

// ── Configuration ──────────────────────────────────────────────────────────
const CONFIG = {
  // Number of days of history to analyze
  analysisWindowDays: 30,
  // Minimum thoughts needed for reliable prediction
  minThoughtsForPrediction: 5,
  // Overload thresholds (thoughts per day that historically cause stress)
  overloadPercentile: 85, // top 15% of daily volumes = overload
};

// ── Core Prediction Engine ─────────────────────────────────────────────────

/**
 * Get the full cognitive load prediction for a user.
 * Returns current load, predicted overload, and personalized insights.
 */
async function getPrediction(userId) {
  const [patterns, currentLoad, upcomingDeadlines] = await Promise.all([
    _analyzePatterns(userId),
    _getCurrentLoad(userId),
    _getUpcomingDeadlines(userId),
  ]);

  if (!patterns.sufficientData) {
    return {
      mode: 'insufficient',
      currentLoad: currentLoad,
      prediction: null,
      insights: ['Not enough data yet. Keep using ReMentally and I\'ll learn your patterns.'],
    };
  }

  // Predict overload for today and next 3 days
  const predictions = _predictOverload(patterns, currentLoad, upcomingDeadlines);

  // Generate personalized insights
  const insights = _generateInsights(patterns, currentLoad, predictions);

  return {
    mode: 'predictive',
    currentLoad,
    predictions,
    insights,
    patterns: {
      avgDailyThoughts: patterns.avgDailyThoughts,
      peakHours: patterns.peakHours,
      busiestDays: patterns.busiestDays,
      completionRate: patterns.completionRate,
      avgResponseTime: patterns.avgResponseTime,
      categoryDistribution: patterns.categoryDistribution,
    },
  };
}

/**
 * Get real-time cognitive load score (0-100).
 */
async function getRealtimeLoad(userId) {
  const now = new Date();
  const hourOfDay = now.getHours();
  const dayOfWeek = now.getDay();

  // Get today's thought count so far
  const todayResult = await pool.query(
    `SELECT COUNT(*) as count FROM memory_graph
     WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
    [userId]
  );
  const todayCount = parseInt(todayResult.rows[0]?.count || '0');

  // Get pending/actionable items
  const pendingResult = await pool.query(
    `SELECT COUNT(*) as count FROM memory_graph
     WHERE user_id = $1 AND status = 'pending' AND is_actionable = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  const pendingCount = parseInt(pendingResult.rows[0]?.count || '0');

  // Get overdue items
  const overdueResult = await pool.query(
    `SELECT COUNT(*) as count FROM memory_graph
     WHERE user_id = $1 AND expires_at < NOW() AND status = 'pending'`,
    [userId]
  );
  const overdueCount = parseInt(overdueResult.rows[0]?.count || '0');

  // Calculate load score (0-100)
  let score = 0;
  score += Math.min(todayCount * 5, 40); // today's thoughts (max 40)
  score += Math.min(pendingCount * 3, 30); // pending items (max 30)
  score += Math.min(overdueCount * 10, 30); // overdue items (max 30, weighted heavily)
  score = Math.min(score, 100);

  let level = 'low';
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'moderate';

  return {
    score,
    level,
    todayCount,
    pendingCount,
    overdueCount,
    hourOfDay,
    dayOfWeek,
  };
}

// ── Pattern Analysis ───────────────────────────────────────────────────────

async function _analyzePatterns(userId) {
  const windowStart = new Date(Date.now() - CONFIG.analysisWindowDays * 86400000).toISOString();

  const [dailyVolumes, hourlyDistribution, dayDistribution, categoryDist, completionStats] = await Promise.all([
    // Daily thought volumes
    pool.query(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM memory_graph
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [userId, windowStart]
    ),
    // Hour-of-day distribution
    pool.query(
      `SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
       FROM memory_graph
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [userId, windowStart]
    ),
    // Day-of-week distribution
    pool.query(
      `SELECT EXTRACT(DOW FROM created_at) as dow, COUNT(*) as count
       FROM memory_graph
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY EXTRACT(DOW FROM created_at)
       ORDER BY dow`,
      [userId, windowStart]
    ),
    // Category distribution
    pool.query(
      `SELECT category, COUNT(*) as count
       FROM memory_graph
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY category
       ORDER BY count DESC`,
      [userId, windowStart]
    ),
    // Completion stats
    pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed,
         COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as overdue,
         AVG(CASE WHEN status IN ('completed', 'done')
               THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
             END) as avg_completion_hours
       FROM memory_graph
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, windowStart]
    ),
  ]);

  const dailyCounts = dailyVolumes.rows.map(r => parseInt(r.count));
  const avgDailyThoughts = dailyCounts.length > 0
    ? dailyCounts.reduce((s, c) => s + c, 0) / dailyCounts.length
    : 0;

  // Calculate overload threshold (85th percentile of daily volumes)
  const sorted = [...dailyCounts].sort((a, b) => a - b);
  const overloadThreshold = sorted[Math.floor(sorted.length * CONFIG.overloadPercentile / 100)] || avgDailyThoughts * 1.5;

  // Peak hours (top 3)
  const peakHours = hourlyDistribution.rows
    .sort((a, b) => parseInt(b.count) - parseInt(a.count))
    .slice(0, 3)
    .map(r => parseInt(r.hour));

  // Busiest days
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiestDays = dayDistribution.rows
    .sort((a, b) => parseInt(b.count) - parseInt(a.count))
    .slice(0, 2)
    .map(r => dayNames[parseInt(r.dow)]);

  // Category distribution
  const categoryDistribution = {};
  for (const r of categoryDist.rows) {
    categoryDistribution[r.category] = parseInt(r.count);
  }

  // Completion rate
  const total = parseInt(completionStats.rows[0]?.total || '0');
  const completed = parseInt(completionStats.rows[0]?.completed || '0');
  const overdue = parseInt(completionStats.rows[0]?.overdue || '0');
  const completionRate = total > 0 ? completed / total : 0;
  const avgResponseTime = parseFloat(completionStats.rows[0]?.avg_completion_hours || 0);

  return {
    sufficientData: dailyCounts.length >= CONFIG.minThoughtsForPrediction,
    dailyCounts,
    avgDailyThoughts,
    overloadThreshold,
    peakHours,
    busiestDays,
    categoryDistribution,
    completionRate,
    overdue,
    avgResponseTime,
  };
}

async function _getCurrentLoad(userId) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT
       COUNT(CASE WHEN DATE(created_at) = $2 THEN 1 END) as today_count,
       COUNT(CASE WHEN status = 'pending' AND is_actionable = true THEN 1 END) as pending_actionable,
       COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as overdue
     FROM memory_graph
     WHERE user_id = $1`,
    [userId, today]
  );

  const row = result.rows[0];
  return {
    todayThoughts: parseInt(row?.today_count || '0'),
    pendingActionable: parseInt(row?.pending_actionable || '0'),
    overdue: parseInt(row?.overdue || '0'),
  };
}

async function _getUpcomingDeadlines(userId) {
  const result = await pool.query(
    `SELECT id, content, expires_at, urgency_tier
     FROM memory_graph
     WHERE user_id = $1
       AND expires_at > NOW()
       AND expires_at < NOW() + INTERVAL '7 days'
       AND status = 'pending'
     ORDER BY expires_at ASC
     LIMIT 10`,
    [userId]
  );
  return result.rows;
}

// ── Prediction Logic ───────────────────────────────────────────────────────

function _predictOverload(patterns, currentLoad, upcomingDeadlines) {
  const now = new Date();
  const predictions = [];

  for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dayOfWeek = date.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Base prediction from historical average
    let predictedVolume = patterns.avgDailyThoughts;

    // Adjust for day of week
    const isBusiestDay = patterns.busiestDays.includes(dayNames[dayOfWeek]);
    if (isBusiestDay) predictedVolume *= 1.3;

    // Adjust for upcoming deadlines
    const dayDeadlines = upcomingDeadlines.filter(d => {
      const dDate = new Date(d.expires_at);
      return dDate.toDateString() === date.toDateString();
    });
    predictedVolume += dayDeadlines.length * 2; // each deadline adds ~2 thoughts

    // Calculate overload probability
    const overloadProbability = Math.min(
      (predictedVolume / patterns.overloadThreshold) * 100,
      100
    );

    predictions.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[dayOfWeek],
      predictedVolume: Math.round(predictedVolume),
      overloadProbability: Math.round(overloadProbability),
      isOverload: overloadProbability >= 80,
      deadlines: dayDeadlines.length,
    });
  }

  return predictions;
}

function _generateInsights(patterns, currentLoad, predictions) {
  const insights = [];

  // Overload warning
  const todayPrediction = predictions[0];
  if (todayPrediction?.isOverload) {
    insights.push(`⚠️ High cognitive load expected today (${todayPrediction.predictedThoughts} thoughts predicted). Consider tackling the ${currentLoad.pendingActionable} pending items first.`);
  }

  // Overdue warning
  if (currentLoad.overdue > 0) {
    insights.push(`🔴 You have ${currentLoad.overdue} overdue item${currentLoad.overdue > 1 ? 's' : ''}. These are contributing to cognitive debt.`);
  }

  // Completion rate insight
  if (patterns.completionRate < 0.3 && patterns.dailyCounts.length > 7) {
    insights.push(`📊 Your completion rate is ${Math.round(patterns.completionRate * 100)}%. Try marking thoughts as done to keep your load manageable.`);
  } else if (patterns.completionRate > 0.7) {
    insights.push(`✅ Great job! ${Math.round(patterns.completionRate * 100)}% completion rate. You're staying on top of things.`);
  }

  // Peak hours insight
  if (patterns.peakHours.length > 0) {
    const peakStr = patterns.peakHours.map(h => `${h}:00`).join(', ');
    insights.push(`⏰ Your peak thinking hours: ${peakStr}. Schedule important tasks then.`);
  }

  // Busiest days
  if (patterns.busiestDays.length > 0) {
    insights.push(`📅 Busiest days: ${patterns.busiestDays.join(' and ')}. Lighten your load on those days.`);
  }

  // Upcoming overload
  const nextOverload = predictions.find(p => p.isOverload && p.date !== todayPrediction?.date);
  if (nextOverload) {
    insights.push(`🔮 Overload predicted for ${nextOverload.dayName} (${nextOverload.date}). Consider pre-processing some thoughts now.`);
  }

  if (insights.length === 0) {
    insights.push('✨ Your cognitive load looks balanced. Keep it up!');
  }

  return insights;
}

module.exports = {
  getPrediction,
  getRealtimeLoad,
  CONFIG,
};
