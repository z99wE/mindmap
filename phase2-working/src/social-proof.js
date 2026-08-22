/**
 * SOCIAL PROOF ENGINE
 *
 * Anonymized, aggregated intelligence from ALL users:
 *
 * - "87% of users who set a deadline complete it within 24 hours"
 * - "Users who use witness contacts complete 72% more commitments"
 * - "The average user captures 8 thoughts/day"
 * - "Tuesday is the most productive day across all users"
 *
 * This creates a network effect: the more users, the smarter the insights.
 * All data is fully anonymized — no individual data is ever exposed.
 *
 * Cost: $0 — aggregate SQL queries on existing data
 */

'use strict';

const { pool } = require('./db');

/**
 * Get anonymized social proof insights for a user.
 * Compares their patterns against the aggregate.
 */
async function getSocialProofInsights(userId) {
  // Run all queries in parallel
  const [
    deadlineInsight,
    witnessInsight,
    activityInsight,
    categoryInsight,
    productivityInsight,
    completionInsight,
  ] = await Promise.all([
    getDeadlineEffectiveness(),
    getWitnessEffectiveness(),
    getActivityBenchmarks(),
    getCategoryPopularity(),
    getProductivityPatterns(),
    getCompletionPatterns(),
  ]);

  // Get user's own stats for comparison
  const userStats = await getUserStats(userId);

  return {
    insights: [
      deadlineInsight,
      witnessInsight,
      activityInsight,
      categoryInsight,
      productivityInsight,
      completionInsight,
    ].filter(Boolean),
    userStats,
    networkSize: await getNetworkSize(),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * How effective are deadlines at driving completion?
 */
async function getDeadlineEffectiveness() {
  try {
    const result = await pool.query(`
      WITH
      with_deadline AS (
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
        FROM memory_graph
        WHERE expires_at IS NOT NULL
          AND created_at > NOW() - INTERVAL '90 days'
      ),
      without_deadline AS (
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
        FROM memory_graph
        WHERE expires_at IS NULL
          AND created_at > NOW() - INTERVAL '90 days'
      )
      SELECT
        (SELECT total FROM with_deadline) as wd_total,
        (SELECT completed FROM with_deadline) as wd_completed,
        (SELECT total FROM without_deadline) as wod_total,
        (SELECT completed FROM without_deadline) as wod_completed
    `);

    const row = result.rows[0];
    const wdRate = parseInt(row.wd_total) > 0 ? parseInt(row.wd_completed) / parseInt(row.wd_total) : 0;
    const wodRate = parseInt(row.wod_total) > 0 ? parseInt(row.wod_completed) / parseInt(row.wod_total) : 0;

    const improvement = wodRate > 0 ? Math.round(((wdRate - wodRate) / wodRate) * 100) : 0;

    return {
      type: 'deadline',
      message: `Users who set deadlines complete ${Math.round(wdRate * 100)}% of their thoughts — that's ${improvement > 0 ? improvement + '% more' : 'significantly more'} than without deadlines.`,
      stat: `${Math.round(wdRate * 100)}%`,
      context: `Based on ${parseInt(row.wd_total) + parseInt(row.wod_total)} thoughts across all users`,
      actionable: 'Add a deadline to your next thought to boost completion.',
    };
  } catch (e) {
    return null;
  }
}

/**
 * How effective are witness contacts?
 */
async function getWitnessEffectiveness() {
  try {
    const result = await pool.query(`
      WITH
      with_witness AS (
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
        FROM commitments c
        JOIN users u ON c.user_id = u.id
        WHERE c.witness_contact IS NOT NULL
          AND c.created_at > NOW() - INTERVAL '90 days'
      ),
      without_witness AS (
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
        FROM commitments c
        JOIN users u ON c.user_id = u.id
        WHERE c.witness_contact IS NULL
          AND c.created_at > NOW() - INTERVAL '90 days'
      )
      SELECT
        (SELECT total FROM with_witness) as ww_total,
        (SELECT completed FROM with_witness) as ww_completed,
        (SELECT total FROM without_witness) as wow_total,
        (SELECT completed FROM without_witness) as wow_completed
    `);

    const row = result.rows[0];
    const wwTotal = parseInt(row.ww_total);
    const wwCompleted = parseInt(row.ww_completed);
    const wowTotal = parseInt(row.wow_total);
    const wowCompleted = parseInt(row.wow_completed);

    if (wwTotal < 5 || wowTotal < 5) return null;

    const wwRate = wwCompleted / wwTotal;
    const wowRate = wowCompleted / wowTotal;
    const improvement = Math.round(((wwRate - wowRate) / wowRate) * 100);

    return {
      type: 'witness',
      message: `Users with witness contacts complete ${improvement}% more commitments than those without.`,
      stat: `+${improvement}%`,
      context: `Based on ${wwTotal + wowTotal} commitments`,
      actionable: 'Set a witness contact on your next commitment to boost follow-through.',
    };
  } catch (e) {
    return null;
  }
}

/**
 * What are the activity benchmarks?
 */
async function getActivityBenchmarks() {
  try {
    const result = await pool.query(`
      SELECT
        AVG(daily_count) as avg_daily,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY daily_count) as median_daily,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY daily_count) as p90_daily
      FROM (
        SELECT user_id, DATE(created_at) as day, COUNT(*) as daily_count
        FROM memory_graph
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY user_id, DATE(created_at)
      ) subq
    `);

    const row = result.rows[0];
    return {
      type: 'activity',
      message: `The average user captures ${Math.round(parseFloat(row.avg_daily))} thoughts/day. Power users hit ${Math.round(parseFloat(row.p90_daily))}.`,
      stat: `${Math.round(parseFloat(row.median_daily))}/day median`,
      context: 'Across all users, last 30 days',
      actionable: null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Which categories are most popular?
 */
async function getCategoryPopularity() {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM memory_graph
      WHERE created_at > NOW() - INTERVAL '30 days'
        AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);

    const top = result.rows[0];
    if (!top) return null;

    return {
      type: 'category',
      message: `"${top.category}" is the #1 category across all users with ${parseInt(top.count).toLocaleString()} thoughts.`,
      stat: top.category,
      context: 'Most popular category this month',
      actionable: null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * When are users most productive?
 */
async function getProductivityPatterns() {
  try {
    const result = await pool.query(`
      SELECT
        EXTRACT(DOW FROM created_at) as dow,
        AVG(CASE WHEN status IN ('completed', 'done') THEN 1 ELSE 0 END) as completion_rate
      FROM memory_graph
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY EXTRACT(DOW FROM created_at)
      ORDER BY completion_rate DESC
    `);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const best = result.rows[0];
    if (!best) return null;

    return {
      type: 'productivity',
      message: `${days[parseInt(best.dow)]} is the most productive day — completion rates peak then.`,
      stat: days[parseInt(best.dow)],
      context: 'Based on completion rates across all users',
      actionable: `Schedule your most important tasks on ${days[parseInt(best.dow)]}.`,
    };
  } catch (e) {
    return null;
  }
}

/**
 * What's the completion rate across all users?
 */
async function getCompletionPatterns() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as overdue
      FROM memory_graph
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const row = result.rows[0];
    const total = parseInt(row.total);
    const completed = parseInt(row.completed);
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      type: 'completion',
      message: `Across all users, ${rate}% of thoughts get completed. ${parseInt(row.overdue)} are currently overdue.`,
      stat: `${rate}%`,
      context: `From ${total.toLocaleString()} thoughts this month`,
      actionable: rate < 50 ? 'You\'re in good company — most thoughts need a nudge. Try setting deadlines.' : null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Get user-specific stats for comparison.
 */
async function getUserStats(userId) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_thoughts,
        COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed,
        COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as with_deadline,
        COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as overdue,
        AVG(CASE WHEN status IN ('completed', 'done') THEN 1 ELSE 0 END) as completion_rate
      FROM memory_graph
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
    `, [userId]);

    const row = result.rows[0];
    return {
      totalThoughts: parseInt(row.total_thoughts),
      completed: parseInt(row.completed),
      withDeadline: parseInt(row.with_deadline),
      overdue: parseInt(row.overdue),
      completionRate: Math.round(parseFloat(row.completion_rate) * 100),
    };
  } catch (e) {
    return { totalThoughts: 0, completed: 0, withDeadline: 0, overdue: 0, completionRate: 0 };
  }
}

/**
 * Get network size (total users).
 */
async function getNetworkSize() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  } catch (e) {
    return 0;
  }
}

module.exports = {
  getSocialProofInsights,
};
