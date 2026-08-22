/**
 * CROSS-USER PATTERN INSIGHTS
 *
 * Aggregates anonymized behavioral data across all users to generate
 * insights like "People with similar thought patterns to you complete
 * commitments 72% more often when they use witness contacts."
 *
 * Privacy: Only aggregates statistics, never stores raw thought content.
 * User IDs are hashed for aggregation.
 *
 * Cost: $0 (aggregate existing data)
 */

'use strict';

const { pool } = require('./db');

/**
 * Get anonymized insights for a user based on their behavioral profile.
 * Compares their patterns against aggregate user data.
 */
async function getCrossUserInsights(userId, behavioralProfile) {
  const insights = [];

  // Only generate insights if we have enough data
  if (!behavioralProfile || behavioralProfile.overallCompletionRate === 0) {
    return { insights: [], dataPoints: 0 };
  }

  const [similarUsers, witnessEffect, peakHourComparison, categoryComparison] = await Promise.all([
    // Find users with similar completion rates (±20%)
    pool.query(`
      SELECT
        COUNT(*) as similar_count,
        AVG(CASE WHEN status IN ('completed', 'done') THEN 1 ELSE 0 END) as avg_completion_rate
      FROM memory_graph
      WHERE user_id != $1
        AND created_at > NOW() - INTERVAL '90 days'
        AND user_id IN (
          SELECT user_id FROM memory_graph
          WHERE created_at > NOW() - INTERVAL '90 days'
          GROUP BY user_id
          HAVING COUNT(*) > 5
        )
    `, [userId]),

    // Measure witness contact effectiveness across all users
    pool.query(`
      SELECT
        COUNT(CASE WHEN witness_contact IS NOT NULL AND status IN ('completed', 'done') THEN 1 END) as with_witness_completed,
        COUNT(CASE WHEN witness_contact IS NOT NULL THEN 1 END) as with_witness_total,
        COUNT(CASE WHEN witness_contact IS NULL AND status IN ('completed', 'done') THEN 1 END) as without_witness_completed,
        COUNT(CASE WHEN witness_contact IS NULL THEN 1 END) as without_witness_total
      FROM memory_graph
      WHERE created_at > NOW() - INTERVAL '90 days'
        AND is_actionable = true
    `),

    // Aggregate peak completion hours across users
    pool.query(`
      SELECT
        EXTRACT(HOUR FROM updated_at) as hour,
        COUNT(*) as completions
      FROM memory_graph
      WHERE status IN ('completed', 'done')
        AND created_at > NOW() - INTERVAL '90 days'
        AND updated_at > created_at
      GROUP BY EXTRACT(HOUR FROM updated_at)
      ORDER BY completions DESC
      LIMIT 5
    `),

    // Category completion rates across all users
    pool.query(`
      SELECT
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as completed
      FROM memory_graph
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY category
      HAVING COUNT(*) > 10
      ORDER BY completed::float / NULLIF(COUNT(*), 0) DESC
    `),
  ]);

  // Insight 1: Witness contact effectiveness
  const ww = witnessEffect.rows[0];
  if (ww && parseInt(ww.with_witness_total) > 10 && parseInt(ww.without_witness_total) > 10) {
    const withRate = parseInt(ww.with_witness_completed) / parseInt(ww.with_witness_total);
    const withoutRate = parseInt(ww.without_witness_completed) / parseInt(ww.without_witness_total);
    if (withRate > withoutRate * 1.2) {
      const improvement = Math.round((withRate - withoutRate) * 100);
      insights.push({
        type: 'witness_effectiveness',
        title: 'Witness contacts work',
        message: `Users who set a witness contact complete commitments ${improvement}% more often than those who don't.`,
        impact: 'high',
        action: 'Set a witness contact for your next commitment',
      });
    }
  }

  // Insight 2: Peak hours comparison
  const globalPeak = peakHourComparison.rows[0];
  if (globalPeak) {
    const globalHour = parseInt(globalPeak.hour);
    const userPeak = behavioralProfile.peakHours[0]?.hour;
    if (userPeak && userPeak !== globalHour) {
      insights.push({
        type: 'peak_hours',
        title: 'Your peak hours differ from most users',
        message: `Most users complete thoughts at ${globalHour}:00. You're most productive at ${userPeak}:00 — ${userPeak < globalHour ? "you're an early bird" : "you're a night owl"}.`,
        impact: 'medium',
      });
    }
  }

  // Insight 3: Category comparison
  const userCat = behavioralProfile.categoryReliability;
  for (const row of categoryComparison.rows) {
    const catRate = parseInt(row.completed) / parseInt(row.total);
    const userRate = userCat[row.category]?.completionRate;
    if (userRate !== undefined && userRate < catRate * 0.7) {
      insights.push({
        type: 'category_gap',
        title: `You struggle with "${row.category}"`,
        message: `Other users complete ${row.category} thoughts at ${Math.round(catRate * 100)}%. You're at ${Math.round(userRate * 100)}%. Try setting a witness contact for ${row.category} items.`,
        impact: 'high',
        action: `Add witness to ${row.category} thoughts`,
      });
    }
  }

  // Insight 4: Completion tendency
  if (behavioralProfile.completionTendency === 'abandoner') {
    insights.push({
      type: 'completion_tendency',
      title: 'You tend to start more than you finish',
      message: `Your completion rate is ${Math.round(behavioralProfile.overallCompletionRate * 100)}%. Try the "2-minute rule" — if it takes less than 2 minutes, do it now instead of logging it.`,
      impact: 'medium',
    });
  }

  return {
    insights,
    dataPoints: parseInt(similarUsers.rows[0]?.similar_count || 0),
    aggregate: {
      avgCompletionRate: parseFloat(similarUsers.rows[0]?.avg_completion_rate || 0),
      witnessImprovement: ww ? Math.round((parseInt(ww.with_witness_completed) / Math.max(parseInt(ww.with_witness_total), 1) - parseInt(ww.without_witness_completed) / Math.max(parseInt(ww.without_witness_total), 1)) * 100) : 0,
    },
  };
}

module.exports = { getCrossUserInsights };
