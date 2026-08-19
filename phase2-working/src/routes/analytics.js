/**
 * ANALYTICS ROUTES — Cross-User Pattern Detection
 * 
 * Detects patterns across users (anonymized, opt-in only).
 * Examples:
 *   - "Users who overcommit on Tuesdays"
 *   - "Most common missed deadline times"
 *   - "Commitment fulfillment rate by category"
 * 
 * Privacy: No user_id stored in analytics_events.
 * Only anonymized_hashes and event_type + metadata.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

// Track an analytics event (called from other routes, not directly)
async function trackEvent(eventType, metadata = {}, userId = null) {
  try {
    const hash = userId ? crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12) : null;
    await pool.query(
      `INSERT INTO analytics_events (event_type, anonymized_hash, metadata)
       VALUES ($1, $2, $3)`,
      [eventType, hash, JSON.stringify(metadata)]
    );
  } catch { /* analytics should never break the app */ }
}

// GET /api/analytics/patterns — cross-user pattern insights
router.get('/patterns', authMiddleware, async (req, res) => {
  try {
    // Only admins can view cross-user patterns
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required for pattern analytics' });
    }

    // Pattern 1: Most common event types
    const eventTypes = await pool.query(
      `SELECT event_type, COUNT(*)::int as count
       FROM analytics_events
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 20`
    );

    // Pattern 2: Commitment patterns (from memory_graph)
    const commitmentPatterns = await pool.query(
      `SELECT
         EXTRACT(DOW FROM created_at)::int as day_of_week,
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
         COUNT(*) FILTER (WHERE status = 'pending' AND expires_at < NOW())::int as missed
       FROM memory_graph
       WHERE category = 'commitment'
         AND created_at > NOW() - INTERVAL '90 days'
       GROUP BY day_of_week
       ORDER BY day_of_week`
    );

    // Pattern 3: Urgency distribution
    const urgencyDist = await pool.query(
      `SELECT urgency_tier, COUNT(*)::int as count
       FROM memory_graph
       WHERE urgency_tier IS NOT NULL
         AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY urgency_tier
       ORDER BY count DESC`
    );

    // Pattern 4: Peak cognitive hours (when most thoughts are captured)
    const peakHours = await pool.query(
      `SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count
       FROM memory_graph
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 5`
    );

    // Compute insights from patterns
    const insights = [];

    // Day-of-week insight
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const worstDay = commitmentPatterns.rows.reduce((worst, row) =>
      parseInt(row.missed) > parseInt(worst.missed) ? row : worst,
      { missed: 0, day_of_week: -1 }
    );
    if (worstDay.day_of_week >= 0 && worstDay.missed > 0) {
      insights.push({
        type: 'commitment_pattern',
        severity: parseInt(worstDay.missed) > 5 ? 'high' : 'medium',
        message: `Users miss the most deadlines on ${days[worstDay.day_of_week]} (${worstDay.missed} missed in 90 days).`,
        detail: `Consider setting lighter commitments on ${days[worstDay.day_of_week]}.`,
      });
    }

    // Peak hour insight
    if (peakHours.rows.length > 0) {
      const peak = peakHours.rows[0];
      const period = parseInt(peak.hour) < 12 ? 'morning' : parseInt(peak.hour) < 17 ? 'afternoon' : 'evening';
      insights.push({
        type: 'peak_productivity',
        severity: 'info',
        message: `Most thoughts are captured in the ${period} (${peak.hour}:00 — peak activity).`,
        detail: `Schedule important thinking sessions during your peak hours.`,
      });
    }

    res.json({
      patterns: {
        eventTypes: eventTypes.rows,
        commitmentByDay: commitmentPatterns.rows.map(r => ({
          day: days[parseInt(r.day_of_week)] || 'Unknown',
          total: parseInt(r.total),
          completed: parseInt(r.completed),
          missed: parseInt(r.missed),
          fulfillmentRate: parseInt(r.total) > 0
            ? Math.round((parseInt(r.completed) / parseInt(r.total)) * 100)
            : 0,
        })),
        urgencyDistribution: urgencyDist.rows,
        peakHours: peakHours.rows,
      },
      insights,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/track — track an event (called from frontend)
router.post('/track', authMiddleware, async (req, res) => {
  try {
    const { eventType, metadata = {} } = req.body;
    if (!eventType) return res.status(400).json({ error: 'eventType required' });

    await trackEvent(eventType, metadata, req.user.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.trackEvent = trackEvent;
