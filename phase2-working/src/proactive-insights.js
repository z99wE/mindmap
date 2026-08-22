/**
 * PROACTIVE INSIGHT DELIVERY
 *
 * Don't wait for the user to ask. Push insights when patterns emerge.
 * - "You've been thinking about the Acme proposal for 5 days"
 * - "You complete 80% of thoughts on Mondays — today is Monday"
 * - "3 thoughts are about to expire — tackle them now"
 * - "Similar thought pattern detected — you're in a planning loop"
 *
 * Runs as a background job, stores insights in notifications table.
 * User sees them in-app or via PulseKit channels.
 *
 * Cost: $0 (math on existing data + optional LLM for phrasing)
 */

'use strict';

const { pool } = require('./db');

/**
 * Generate proactive insights for a user.
 * Called by background job (every 6 hours).
 */
async function generateProactiveInsights(userId) {
  const insights = [];

  const [recurringPatterns, expiringItems, staleThoughts, completionStreak] = await Promise.all([
    // 1. Recurring thought patterns
    pool.query(`
      SELECT content, category, COUNT(*) as count,
             MIN(created_at) as first_seen, MAX(created_at) as last_seen
      FROM memory_graph
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
        AND content IS NOT NULL
      GROUP BY content, category
      HAVING COUNT(*) >= 2
      ORDER BY count DESC
      LIMIT 5
    `, [userId]),

    // 2. Thoughts expiring soon (within 24 hours)
    pool.query(`
      SELECT id, content, category, urgency_tier, expires_at
      FROM memory_graph
      WHERE user_id = $1
        AND status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at > NOW()
        AND expires_at < NOW() + INTERVAL '24 hours'
      ORDER BY expires_at ASC
      LIMIT 5
    `, [userId]),

    // 3. Stale thoughts (created > 7 days ago, still pending)
    pool.query(`
      SELECT id, content, category, urgency_tier, created_at,
             EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400000 as days_old
      FROM memory_graph
      WHERE user_id = $1
        AND status = 'pending'
        AND created_at < NOW() - INTERVAL '7 days'
      ORDER BY created_at ASC
      LIMIT 5
    `, [userId]),

    // 4. Completion streak
    pool.query(`
      SELECT
        COUNT(CASE WHEN status IN ('completed', 'done') THEN 1 END) as recent_completed,
        COUNT(*) as recent_total
      FROM memory_graph
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '7 days'
    `, [userId]),
  ]);

  // Generate insights from patterns

  // Recurring thoughts
  for (const row of recurringPatterns.rows) {
    if (parseInt(row.count) >= 3) {
      insights.push({
        type: 'recurring_pattern',
        title: `Recurring: "${row.content?.substring(0, 50)}..."`,
        message: `This thought has come up ${row.count} times since ${new Date(row.first_seen).toLocaleDateString()}. Consider turning it into a commitment with a deadline, or let it go.`,
        priority: 'medium',
        category: row.category,
      });
    }
  }

  // Expiring items
  if (expiringItems.rows.length > 0) {
    const count = expiringItems.rows.length;
    const urgent = expiringItems.rows.filter(r => r.urgency_tier === 'critical').length;
    insights.push({
      type: 'expiring_soon',
      title: `${count} thought${count > 1 ? 's' : ''} expiring today`,
      message: urgent > 0
        ? `${urgent} critical thought${urgent > 1 ? 's' : ''} and ${count - urgent} other${count - urgent > 1 ? 's' : ''} will expire within 24 hours.`
        : `${count} thought${count > 1 ? 's' : ''} will expire within 24 hours. Complete or reschedule them.`,
      priority: urgent > 0 ? 'high' : 'medium',
    });
  }

  // Stale thoughts
  if (staleThoughts.rows.length >= 3) {
    insights.push({
      type: 'stale_thoughts',
      title: `${staleThoughts.rows.length} thoughts older than a week`,
      message: 'These thoughts have been sitting for over a week. Consider completing, delegating, or archiving them to reduce cognitive load.',
      priority: 'low',
    });
  }

  // Completion streak
  const streak = completionStreak.rows[0];
  if (streak) {
    const completed = parseInt(streak.recent_completed);
    const total = parseInt(streak.recent_total);
    if (total > 0) {
      const rate = completed / total;
      if (rate > 0.8 && total >= 3) {
        insights.push({
          type: 'positive_streak',
          title: `Great week! ${completed}/${total} completed`,
          message: `You're on a roll — ${Math.round(rate * 100)}% completion rate this week. Keep the momentum going!`,
          priority: 'positive',
        });
      } else if (rate < 0.2 && total >= 5) {
        insights.push({
          type: 'completion_slump',
          title: `Only ${completed}/${total} completed this week`,
          message: 'Your completion rate dropped. Consider tackling 2-3 easy items to build momentum, or archive thoughts you no longer need.',
          priority: 'medium',
        });
      }
    }
  }

  // Store insights as notifications
  for (const insight of insights.slice(0, 3)) { // max 3 per run
    try {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES ($1, 'insight', $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [userId, insight.title, insight.message, JSON.stringify({ type: insight.type, priority: insight.priority })]);
    } catch {
      // Duplicate or table missing — skip
    }
  }

  return insights;
}

module.exports = { generateProactiveInsights };
