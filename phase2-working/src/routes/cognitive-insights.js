/**
 * COGNITIVE INSIGHTS ENGINE
 * 
 * Proprietary cognitive models that no competitor has:
 * 
 * 1. Cognitive Load Forecast - Predicts when you'll be overwhelmed
 *    Based on: upcoming deadlines × current half-life states × historical patterns
 * 
 * 2. Attention Debt Score - Gamified feedback loop (0-100)
 *    Score = f(missed commitments, expired thoughts, drift events, overdue items)
 *    Higher = worse. Thresholds trigger automated interventions.
 * 
 * 3. Narrative Memory - AI-weaves thoughts into a weekly story
 *    "This week you focused on: Project X (60%), Health (20%). You completed 3/7 commitments."
 * 
 * 4. Commitment Fulfillment Probability
 *    Based on: day of week, category, past fulfillment rate, urgency tier
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { callLLM } = require('../llm-provider');

// ── 1. Cognitive Load Forecast ───────────────────────────────────────────────

router.get('/forecast', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get upcoming commitments (next 7 days)
    const commitments = await pool.query(
      `SELECT COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE urgency_tier IN ('critical', 'high'))::int as urgent,
              COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '24 hours')::int as due_today
       FROM memory_graph
       WHERE user_id = $1 AND status = 'pending'
       AND expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '7 days'`,
      [userId]
    );

    // Get active half-life states
    const halfLife = await pool.query(
      `SELECT COUNT(*)::int as active,
              COUNT(*) FILTER (WHERE half_life_hours < 24)::int as expiring_soon,
              COUNT(*) FILTER (WHERE urgency_tier = 'critical')::int as critical
       FROM memory_graph
       WHERE user_id = $1 AND status = 'pending'
       AND half_life_hours IS NOT NULL`,
      [userId]
    );

    // Get recent completion rate (last 30 days)
    const completion = await pool.query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed
       FROM memory_graph
       WHERE user_id = $1 AND category = 'commitment'
       AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const c = commitments.rows[0] || { total: 0, urgent: 0, due_today: 0 };
    const h = halfLife.rows[0] || { active: 0, expiring_soon: 0, critical: 0 };
    const comp = completion.rows[0] || { total: 0, completed: 0 };

    // Compute load score (0-100)
    const commitmentScore = Math.min(30, c.urgent * 5 + c.due_today * 3);
    const halfLifeScore = Math.min(40, h.expiring_soon * 4 + h.critical * 6);
    const completionRate = comp.total > 0 ? (comp.completed / comp.total) * 100 : 50;
    const completionScore = Math.max(0, 30 - (completionRate / 100) * 30);
    const loadScore = Math.min(100, Math.round(commitmentScore + halfLifeScore + completionScore));

    // Forecast for next 7 days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const dayIdx = (today + i) % 7;
      // Historical bias: more deadlines early week, drift late week
      const dayBias = dayIdx <= 2 ? 1.2 : dayIdx >= 5 ? 0.8 : 1.0;
      const dayLoad = Math.min(100, Math.round(loadScore * dayBias));
      forecast.push({
        day: dayNames[dayIdx],
        load: dayLoad,
        severity: dayLoad < 30 ? 'low' : dayLoad < 60 ? 'medium' : dayLoad < 80 ? 'high' : 'critical',
      });
    }

    // Generate insight
    let insight = '';
    if (loadScore < 30) insight = 'Your cognitive load is light. Good time to tackle backlog items.';
    else if (loadScore < 60) insight = `You have ${c.urgent} urgent items and ${h.expiring_soon} expiring soon. Pace yourself.`;
    else if (loadScore < 80) insight = `High load detected. ${c.urgent} urgent commitments + ${h.expiring_soon} expiring thoughts. Consider deferring non-critical items.`;
    else insight = `⚠️ Critical load. ${c.urgent} urgent, ${h.expiring_soon} expiring, ${c.due_today} due today. Your system recommends immediate pruning.`;

    // Log analytics event (anonymized)
    await pool.query(
      `INSERT INTO analytics_events (event_type, metadata) VALUES ('load_forecast', $1)`,
      [JSON.stringify({ score: loadScore })]
    ).catch(() => {});

    res.json({
      currentLoad: loadScore,
      severity: loadScore < 30 ? 'low' : loadScore < 60 ? 'medium' : loadScore < 80 ? 'high' : 'critical',
      forecast,
      breakdown: {
        commitments: { total: c.total, urgent: c.urgent, dueToday: c.due_today },
        halfLife: { active: h.active, expiringSoon: h.expiring_soon, critical: h.critical },
        completionRate: Math.round(completionRate),
      },
      insight,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 2. Attention Debt Score ──────────────────────────────────────────────────

router.get('/debt-score', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [missedRes, expiredRes, overdueRes, driftRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int as count FROM memory_graph
         WHERE user_id = $1 AND status = 'completed' AND archived = true
         AND created_at > NOW() - INTERVAL '30 days'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count FROM memory_graph
         WHERE user_id = $1 AND status = 'pending' AND expires_at < NOW()
         AND archived = false`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count FROM memory_graph
         WHERE user_id = $1 AND category = 'commitment' AND status = 'pending'
         AND expires_at < NOW()`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count FROM memory_graph
         WHERE user_id = $1 AND cognitive_load = 'drift'
         AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      ),
    ]);

    const completed = parseInt(missedRes.rows[0]?.count || 0);
    const expired = parseInt(expiredRes.rows[0]?.count || 0);
    const overdue = parseInt(overdueRes.rows[0]?.count || 0);
    const drifts = parseInt(driftRes.rows[0]?.count || 0);

    // Score: 0 (perfect) to 100 (critical). Each factor adds to debt.
    const debtFromExpired = Math.min(30, expired * 5);
    const debtFromOverdue = Math.min(40, overdue * 8);
    const debtFromDrift = Math.min(20, drifts * 4);
    const debtFromIncomplete = Math.min(30, Math.max(0, 30 - completed));

    const totalDebt = Math.min(100, debtFromExpired + debtFromOverdue + debtFromDrift + debtFromIncomplete);

    // Determine level
    let level, color, recommendation;
    if (totalDebt === 0) {
      level = 'clear'; color = '#22c55e';
      recommendation = 'Your attention accounts are balanced. Keep capturing and completing.';
    } else if (totalDebt < 25) {
      level = 'low'; color = '#84cc16';
      recommendation = 'Minor debt. Review your expired items — some may still be salvageable.';
    } else if (totalDebt < 50) {
      level = 'moderate'; color = '#f59e0b';
      recommendation = `You have ${overdue} overdue commitments. Consider rescheduling or setting a witness.`;
    } else if (totalDebt < 75) {
      level = 'high'; color = '#f97316';
      recommendation = `High attention debt. ${overdue} overdue, ${expired} expired. Your system recommends a pruning session.`;
    } else {
      level = 'critical'; color = '#ef4444';
      recommendation = `⚠️ Critical debt. Immediate attention needed. Clear expired items and reset commitments.`;
    }

    res.json({
      score: totalDebt,
      level,
      color,
      breakdown: { expired, overdue, drifts, completed },
      recommendation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. Narrative Memory ──────────────────────────────────────────────────────

router.get('/narrative', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = 'week' } = req.query;
    const interval = period === 'week' ? '7 days' : '30 days';

    // Get thought summary by category
    const categories = await pool.query(
      `SELECT category, COUNT(*)::int as count
       FROM memory_graph
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY category ORDER BY count DESC`,
      [userId]
    );

    // Get commitment stats
    const commitments = await pool.query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'pending' AND expires_at < NOW())::int as missed
       FROM memory_graph
       WHERE user_id = $1 AND category = 'commitment'
       AND created_at > NOW() - INTERVAL '${interval}'`,
      [userId]
    );

    // Get drift events
    const drifts = await pool.query(
      `SELECT COUNT(*)::int as count FROM memory_graph
       WHERE user_id = $1 AND cognitive_load = 'drift'
       AND created_at > NOW() - INTERVAL '${interval}'`,
      [userId]
    );

    // Get peak activity times
    const peaks = await pool.query(
      `SELECT EXTRACT(DOW FROM created_at)::int as day,
              EXTRACT(HOUR FROM created_at)::int as hour,
              COUNT(*)::int as count
       FROM memory_graph
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY day, hour ORDER BY count DESC LIMIT 3`,
      [userId]
    );

    const cats = categories.rows || [];
    const total = cats.reduce((s, r) => s + parseInt(r.count), 0);
    const com = commitments.rows[0] || { total: 0, completed: 0, missed: 0 };
    const peakTimes = [];

    // Format peak times
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const p of peaks.rows) {
      const hour = parseInt(p.hour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      peakTimes.push(`${dayNames[parseInt(p.day)] || 'Day'} ${h12}${ampm}`);
    }

    const narrative = {
      period: period === 'week' ? 'this week' : 'this month',
      totalThoughts: total,
      topCategories: cats.slice(0, 3).map(c => ({
        name: c.category || 'general',
        percentage: total > 0 ? Math.round((parseInt(c.count) / total) * 100) : 0,
      })),
      commitments: {
        total: parseInt(com.total),
        completed: parseInt(com.completed),
        missed: parseInt(com.missed),
        fulfillmentRate: parseInt(com.total) > 0
          ? Math.round((parseInt(com.completed) / parseInt(com.total)) * 100)
          : 0,
      },
      driftEvents: parseInt(drifts.rows[0]?.count || 0),
      peakTimes,
    };

    // Generate AI narrative if we have enough data
    let story = null;
    if (total >= 5) {
      const prompt = [
        `Summarize this ${period} of cognitive activity:`,
        `- ${narrative.topCategories.map(c => `${c.name}: ${c.percentage}%`).join(', ')}`,
        `- Commitments: ${narrative.commitments.completed}/${narrative.commitments.total} completed`,
        `- Fulfillment rate: ${narrative.commitments.fulfillmentRate}%`,
        narrative.driftEvents > 0 ? `- Drift events: ${narrative.driftEvents}` : '',
        narrative.peakTimes.length > 0 ? `- Peak times: ${narrative.peakTimes.join(', ')}` : '',
        'Write 2 sentences: what the user focused on and one pattern worth noticing.',
      ].filter(Boolean).join('\n');

      const user = { id: userId, tier: 'pro', api_keys: {}, data_sharing: true };
      try {
        story = await callLLM(user, prompt, [], 'narrative', [], [], {
          response_style: 'concise',
          custom_instructions: 'Write a brief, warm, insightful narrative. No bullet points. 2-3 sentences max.',
        });
      } catch {
        story = null;
      }
    }

    res.json({ narrative, aiStory: story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. Commitment Fulfillment Probability ────────────────────────────────────

router.get('/commitment-probability', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Past 90 days of commitment data
    const history = await pool.query(
      `SELECT
        EXTRACT(DOW FROM created_at)::int as day_of_week,
        urgency_tier,
        category,
        status
       FROM memory_graph
       WHERE user_id = $1 AND category = 'commitment'
       AND created_at > NOW() - INTERVAL '90 days'`,
      [userId]
    );

    const rows = history.rows;
    const total = rows.length;
    const completed = rows.filter(r => r.status === 'completed').length;
    const overallRate = total > 0 ? Math.round((completed / total) * 100) : 50;

    // Deconstruct by day of week
    const byDay = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const r of rows) {
      const day = parseInt(r.day_of_week);
      if (!byDay[day]) byDay[day] = { total: 0, completed: 0 };
      byDay[day].total++;
      if (r.status === 'completed') byDay[day].completed++;
    }

    const dayRates = Object.entries(byDay).map(([day, data]) => ({
      day: dayNames[parseInt(day)] || 'Unknown',
      total: data.total,
      completed: data.completed,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));

    // Pattern detection
    const worstDay = dayRates.reduce((worst, d) => d.rate < (worst?.rate || Infinity) ? d : worst, null);
    const bestDay = dayRates.reduce((best, d) => d.rate > (best?.rate || -1) ? d : best, null);

    // Probability for a NEW commitment created right now
    const currentDay = new Date().getDay();
    const todayRate = byDay[currentDay];
    const todayProb = todayRate && todayRate.total > 0
      ? Math.round((todayRate.completed / todayRate.total) * 100)
      : overallRate;

    // Adjust by urgency (critical commitments have higher completion)
    const urgentTotal = rows.filter(r => r.urgency_tier === 'critical' || r.urgency_tier === 'high').length;
    const urgentCompleted = rows.filter(r => (r.urgency_tier === 'critical' || r.urgency_tier === 'high') && r.status === 'completed').length;
    const urgentRate = urgentTotal > 0 ? Math.round((urgentCompleted / urgentTotal) * 100) : overallRate;

    res.json({
      overallFulfillmentRate: overallRate,
      byDay: dayRates.sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day)),
      worstDay,
      bestDay,
      todayProbability: Math.round((todayProb + urgentRate) / 2), // blended
      urgentRate,
      totalCommitments: total,
      insight: worstDay
        ? `You complete commitments least often on ${worstDay.day} (${worstDay.rate}%). Consider setting lighter expectations that day.`
        : 'Not enough data for day-specific insights. Keep capturing commitments!',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
