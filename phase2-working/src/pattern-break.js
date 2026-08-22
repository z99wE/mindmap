/**
 * PATTERN BREAK DETECTION
 *
 * Monitors user behavior and detects when they deviate from their norm:
 *
 * - "You usually complete 5 thoughts/day but only completed 1 today"
 * - "You haven't captured any thoughts in 3 days"
 * - "You typically think about work on weekdays — this is unusual for Saturday"
 * - "Your completion rate dropped 40% this week"
 *
 * These aren't just stats — they're PROACTIVE check-ins that show the app
 * is paying attention and cares about the user's wellbeing.
 *
 * Cost: $0 — math on existing data
 */

'use strict';

const { pool } = require('./db');

// ── Detection Thresholds ──────────────────────────────────────────────────
const THRESHOLDS = {
  // Activity deviation (standard deviations from mean)
  activityDeviation: 1.5,
  // Completion rate change
  completionRateDrop: 0.3, // 30% drop
  // Streak break (days)
  streakBreakDays: 2,
  // Time-of-day pattern break
  hourDeviation: 3, // hours
  // Category pattern break
  categoryDeviation: 0.5, // 50% change in distribution
};

/**
 * Detect all pattern breaks for a user.
 * Returns an array of detected breaks with context.
 */
async function detectPatternBreaks(userId) {
  const breaks = [];

  // Run all detectors in parallel
  const [activityBreak, completionBreak, streakBreak, hourBreak, categoryBreak] = await Promise.all([
    detectActivityBreak(userId),
    detectCompletionBreak(userId),
    detectStreakBreak(userId),
    detectHourPatternBreak(userId),
    detectCategoryPatternBreak(userId),
  ]);

  if (activityBreak) breaks.push(activityBreak);
  if (completionBreak) breaks.push(completionBreak);
  if (streakBreak) breaks.push(streakBreak);
  if (hourBreak) breaks.push(hourBreak);
  if (categoryBreak) breaks.push(categoryBreak);

  // Sort by severity
  breaks.sort((a, b) => b.severity - a.severity);

  return {
    breaks,
    overallStatus: breaks.length === 0 ? 'normal' :
                   breaks.some(b => b.severity >= 0.8) ? 'alert' :
                   breaks.some(b => b.severity >= 0.5) ? 'watch' : 'normal',
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Detect if today's activity is significantly different from the norm.
 */
async function detectActivityBreak(userId) {
  // Get daily thought counts for last 30 days
  const result = await pool.query(`
    SELECT
      DATE(created_at) as day,
      COUNT(*) as thoughts,
      COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
    FROM memory_graph
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY day
  `, [userId]);

  const days = result.rows;
  if (days.length < 5) return null;

  const dailyThoughts = days.map(d => parseInt(d.thoughts));
  const mean = dailyThoughts.reduce((a, b) => a + b, 0) / dailyThoughts.length;
  const stdDev = Math.sqrt(
    dailyThoughts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / dailyThoughts.length
  );

  const today = days[days.length - 1];
  const todayCount = parseInt(today.thoughts);
  const deviation = stdDev > 0 ? (todayCount - mean) / stdDev : 0;

  if (Math.abs(deviation) >= THRESHOLDS.activityDeviation) {
    const isLower = deviation < 0;
    return {
      type: 'activity',
      severity: Math.min(Math.abs(deviation) / 3, 1),
      message: isLower
        ? `You usually capture ${Math.round(mean)} thoughts/day, but today only ${todayCount}. Everything OK?`
        : `You've been on fire today — ${todayCount} thoughts vs your usual ${Math.round(mean)}!`,
      data: { today: todayCount, average: Math.round(mean), stdDev: Math.round(stdDev) },
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Detect if completion rate has dropped significantly.
 */
async function detectCompletionBreak(userId) {
  // Compare last 7 days vs previous 7 days
  const result = await pool.query(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days' THEN 'this_week'
        WHEN created_at > NOW() - INTERVAL '14 days' THEN 'last_week'
      END AS period,
      COUNT(*) as total,
      COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
    FROM memory_graph
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '14 days'
    GROUP BY period
  `, [userId]);

  const periods = {};
  for (const row of result.rows) {
    periods[row.period] = {
      total: parseInt(row.total),
      completed: parseInt(row.completed),
      rate: parseInt(row.total) > 0 ? parseInt(row.completed) / parseInt(row.total) : 0,
    };
  }

  const thisWeek = periods.this_week;
  const lastWeek = periods.last_week;

  if (!thisWeek || !lastWeek || thisWeek.total < 3 || lastWeek.total < 3) return null;

  const drop = lastWeek.rate - thisWeek.rate;

  if (drop >= THRESHOLDS.completionRateDrop) {
    return {
      type: 'completion',
      severity: Math.min(drop * 2, 1),
      message: `Your completion rate dropped from ${Math.round(lastWeek.rate * 100)}% to ${Math.round(thisWeek.rate * 100)}% this week. Consider tackling a few easy wins to rebuild momentum.`,
      data: {
        thisWeek: { total: thisWeek.total, completed: thisWeek.completed, rate: Math.round(thisWeek.rate * 100) },
        lastWeek: { total: lastWeek.total, completed: lastWeek.completed, rate: Math.round(lastWeek.rate * 100) },
        drop: Math.round(drop * 100),
      },
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Detect if the user's streak has been broken.
 */
async function detectStreakBreak(userId) {
  // Get days with at least one thought
  const result = await pool.query(`
    SELECT DISTINCT DATE(created_at) as day
    FROM memory_graph
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '14 days'
    ORDER BY day DESC
  `, [userId]);

  const days = result.rows.map(r => new Date(r.day));
  if (days.length < 3) return null;

  // Calculate current streak (from today backwards)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const hasThought = days.some(d => {
      const dayDate = new Date(d);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === checkDate.getTime();
    });

    if (hasThought) {
      streak++;
    } else if (i > 0) {
      // Gap found
      const gapDays = i;
      if (gapDays >= THRESHOLDS.streakBreakDays) {
        return {
          type: 'streak',
          severity: Math.min(gapDays / 7, 1),
          message: gapDays >= 7
            ? `It's been ${gapDays} days since your last thought. Your memory graph misses you!`
            : `You've been quiet for ${gapDays} days. Even one quick thought keeps your streak alive.`,
          data: { currentStreak: streak, gapDays },
          detectedAt: new Date().toISOString(),
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Detect if the user is thinking at unusual hours.
 */
async function detectHourPatternBreak(userId) {
  // Get typical thinking hours (last 30 days)
  const result = await pool.query(`
    SELECT
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as count
    FROM memory_graph
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY count DESC
  `, [userId]);

  if (result.rows.length < 3) return null;

  // Find the top 3 peak hours
  const peakHours = result.rows.slice(0, 3).map(r => parseInt(r.hour));
  const currentHour = new Date().getHours();

  // Check if current hour is very far from any peak hour
  const minDistance = Math.min(...peakHours.map(h => {
    const diff = Math.abs(h - currentHour);
    return Math.min(diff, 24 - diff); // handle wrap-around
  }));

  if (minDistance >= THRESHOLDS.hourDeviation) {
    return {
      type: 'hour_pattern',
      severity: Math.min(minDistance / 8, 1),
      message: `You usually think between ${peakHours.map(h => `${h}:00`).join(', ')}. It's ${currentHour}:00 — different for you!`,
      data: { peakHours, currentHour, distance: minDistance },
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Detect if the user's thought categories have shifted.
 */
async function detectCategoryPatternBreak(userId) {
  // Compare last 7 days vs previous 7 days category distribution
  const result = await pool.query(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days' THEN 'this_week'
        WHEN created_at > NOW() - INTERVAL '14 days' THEN 'last_week'
      END AS period,
      category,
      COUNT(*) as count
    FROM memory_graph
    WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '14 days'
    GROUP BY period, category
  `, [userId]);

  const periods = { this_week: {}, last_week: {} };
  for (const row of result.rows) {
    const period = row.period;
    if (!periods[period]) periods[period] = {};
    periods[period][row.category || 'general'] = parseInt(row.count);
  }

  const thisWeek = periods.this_week;
  const lastWeek = periods.last_week;

  // Calculate total thoughts per period
  const thisWeekTotal = Object.values(thisWeek).reduce((a, b) => a + b, 0);
  const lastWeekTotal = Object.values(lastWeek).reduce((a, b) => a + b, 0);

  if (thisWeekTotal < 3 || lastWeekTotal < 3) return null;

  // Compare distributions
  const allCategories = new Set([...Object.keys(thisWeek), ...Object.keys(lastWeek)]);
  let maxShift = 0;
  let shiftedCategory = null;

  for (const cat of allCategories) {
    const thisRate = (thisWeek[cat] || 0) / thisWeekTotal;
    const lastRate = (lastWeek[cat] || 0) / lastWeekTotal;
    const shift = Math.abs(thisRate - lastRate);

    if (shift > maxShift) {
      maxShift = shift;
      shiftedCategory = cat;
    }
  }

  if (maxShift >= THRESHOLDS.categoryDeviation && shiftedCategory) {
    const thisCount = thisWeek[shiftedCategory] || 0;
    const lastCount = lastWeek[shiftedCategory] || 0;
    const direction = thisCount > lastCount ? 'more' : 'less';

    return {
      type: 'category',
      severity: Math.min(maxShift * 2, 1),
      message: `Your thinking has shifted — ${direction} focus on "${shiftedCategory}" this week (${thisCount} vs ${lastCount} last week).`,
      data: { category: shiftedCategory, thisWeek: thisCount, lastWeek: lastCount, shift: Math.round(maxShift * 100) },
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

module.exports = {
  detectPatternBreaks,
  THRESHOLDS,
};
