/**
 * Pattern Break Detector — Z-Score Statistical Anomaly Detection
 * 
 * Detects when user behavior deviates significantly from their norm.
 * Uses rolling Z-scores on:
 * - Daily thought count
 * - Completion rate
 * - Category distribution shifts
 * - Time-of-day patterns
 * 
 * Cost: $0 — pure statistics on existing data.
 */

const { pool } = require('../db');

/**
 * Calculate Z-score: how many standard deviations from the mean
 */
function zScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate basic statistics
 */
function stats(values) {
  if (!values.length) return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0 };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return { mean, stdDev, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

/**
 * Detect anomalies in a user's behavior
 */
async function detectPatternBreaks(userId) {
  const breaks = [];
  
  // 1. Daily thought count anomaly
  const dailyCounts = await pool.query(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM memory_graph
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY day
  `, [userId]);
  
  if (dailyCounts.rows.length >= 5) {
    const counts = dailyCounts.rows.map(r => parseInt(r.count));
    const { mean, stdDev } = stats(counts.slice(0, -1)); // Exclude today
    const todayCount = counts[counts.length - 1] || 0;
    const z = zScore(todayCount, mean, stdDev);
    
    if (Math.abs(z) > 2) {
      breaks.push({
        type: z > 0 ? 'spike' : 'drop',
        metric: 'daily_thought_count',
        severity: Math.abs(z) > 3 ? 'alert' : 'watch',
        message: z > 0 
          ? `You captured ${todayCount} thoughts today — ${Math.round((todayCount / Math.max(mean, 1)) * 100)}% above your average of ${Math.round(mean)}. Something big on your mind?`
          : `Only ${todayCount} thoughts today vs your usual ${Math.round(mean)}. Everything OK?`,
        z_score: Math.round(z * 100) / 100,
        baseline: Math.round(mean * 10) / 10,
        current: todayCount,
        insight: z > 0 ? 'spike_engagement' : 'drop_engagement'
      });
    }
  }
  
  // 2. Completion rate anomaly
  const completionRates = await pool.query(`
    SELECT 
      DATE(created_at) as day,
      COUNT(*) FILTER (WHERE status = 'completed' OR commitment_fulfilled = true)::float / NULLIF(COUNT(*), 0) as rate
    FROM memory_graph
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    HAVING COUNT(*) >= 3
    ORDER BY day
  `, [userId]);
  
  if (completionRates.rows.length >= 5) {
    const rates = completionRates.rows.map(r => parseFloat(r.rate));
    const recentRates = rates.slice(-3); // Last 3 days
    const historicalRates = rates.slice(0, -3);
    
    const { mean, stdDev } = stats(historicalRates);
    const recentAvg = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    const z = zScore(recentAvg, mean, stdDev);
    
    if (Math.abs(z) > 1.5) {
      breaks.push({
        type: z > 0 ? 'improvement' : 'decline',
        metric: 'completion_rate',
        severity: z < -2 ? 'alert' : 'watch',
        message: z > 0
          ? `Your completion rate jumped to ${Math.round(recentAvg * 100)}% — well above your ${Math.round(mean * 100)}% average. Keep it up!`
          : `Completion rate dropped to ${Math.round(recentAvg * 100)}% from your usual ${Math.round(mean * 100)}%. Consider clearing some old items.`,
        z_score: Math.round(z * 100) / 100,
        baseline: Math.round(mean * 100) + '%',
        current: Math.round(recentAvg * 100) + '%',
        insight: z > 0 ? 'rate_improvement' : 'rate_decline'
      });
    }
  }
  
  // 3. Category distribution shift
  const categoryDist = await pool.query(`
    SELECT 
      category,
      COUNT(*) as current_count
    FROM memory_graph
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY category
  `, [userId]);
  
  const categoryHist = await pool.query(`
    SELECT 
      category,
      COUNT(*)::float / NULLIF((SELECT COUNT(*) FROM memory_graph WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'), 0) as historical_pct
    FROM memory_graph
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days' AND created_at < NOW() - INTERVAL '7 days'
    GROUP BY category
  `, [userId]);
  
  if (categoryDist.rows.length > 0 && categoryHist.rows.length > 0) {
    const totalRecent = categoryDist.rows.reduce((a, r) => a + parseInt(r.current_count), 0);
    const histMap = {};
    categoryHist.rows.forEach(r => { histMap[r.category] = parseFloat(r.historical_pct); });
    
    for (const row of categoryDist.rows) {
      const currentPct = parseInt(row.current_count) / totalRecent;
      const histPct = histMap[row.category] || 0;
      const shift = currentPct - histPct;
      
      if (Math.abs(shift) > 0.2) {
        breaks.push({
          type: 'category_shift',
          metric: 'category_distribution',
          severity: 'info',
          message: `"${row.category}" thoughts jumped from ${Math.round(histPct * 100)}% to ${Math.round(currentPct * 100)}% of your activity. Focus shift detected.`,
          category: row.category,
          from_pct: Math.round(histPct * 100),
          to_pct: Math.round(currentPct * 100),
          insight: 'focus_shift'
        });
      }
    }
  }
  
  // 4. Time-of-day pattern change
  const hourPattern = await pool.query(`
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as count
    FROM memory_graph
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '14 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  `, [userId]);
  
  if (hourPattern.rows.length >= 3) {
    const hours = hourPattern.rows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) }));
    const peakHour = hours.reduce((a, b) => a.count > b.count ? a : b);
    const totalThoughts = hours.reduce((a, b) => a + b.count, 0);
    const peakPct = peakHour.count / totalThoughts;
    
    if (peakPct > 0.4) {
      breaks.push({
        type: 'temporal_concentration',
        metric: 'time_distribution',
        severity: 'info',
        message: `${Math.round(peakPct * 100)}% of your thoughts happen around ${peakHour.hour}:00. Consider spreading capture throughout the day.`,
        peak_hour: peakHour.hour,
        peak_percentage: Math.round(peakPct * 100),
        insight: 'temporal_pattern'
      });
    }
  }
  
  return {
    user_id: userId,
    detected_breaks: breaks,
    summary: {
      total: breaks.length,
      alerts: breaks.filter(b => b.severity === 'alert').length,
      watches: breaks.filter(b => b.severity === 'watch').length,
      info: breaks.filter(b => b.severity === 'info').length
    },
    checked_at: new Date().toISOString()
  };
}

module.exports = { detectPatternBreaks, zScore, stats };
