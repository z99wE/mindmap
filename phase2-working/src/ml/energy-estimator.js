/**
 * Energy-Aware Scheduler — Kernel Density Estimation
 * 
 * Learns a user's ACTUAL energy curve from completion timestamps.
 * Uses Gaussian KDE to estimate probability density of productive hours.
 * 
 * Also detects:
 * - Peak performance windows
 * - Post-lunch dip
 * - Late-night cognitive decline
 * - Optimal scheduling windows for different task difficulties
 * 
 * Cost: $0 — pure statistics.
 */

const { pool } = require('../db');

/**
 * Gaussian kernel function
 */
function gaussianKernel(u) {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

/**
 * Kernel Density Estimation
 * Estimates the probability density function of completion hours
 */
function kde(data, bandwidth = 1.5) {
  if (!data.length) return Array.from({ length: 24 }, () => 0);
  
  return Array.from({ length: 24 }, (_, x) => {
    const density = data.reduce((sum, xi) => {
      const u = (x - xi) / bandwidth;
      return sum + gaussianKernel(u);
    }, 0) / (data.length * bandwidth);
    return Math.max(0, density);
  });
}

/**
 * Smooth the energy curve using moving average
 */
function smooth(values, windowSize = 3) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(values.length - 1, i + windowSize); j++) {
      sum += values[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
}

/**
 * Detect energy pattern from user's completion behavior
 * Completion timestamps reveal when the user is actually productive
 */
async function detectEnergyPattern(userId) {
  // Get completion timestamps (when thoughts were completed)
  const completions = await pool.query(`
    SELECT EXTRACT(HOUR FROM updated_at) as hour,
           EXTRACT(DOW FROM updated_at) as dow,
           EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0 as time_to_complete
    FROM memory_graph
    WHERE user_id = $1 
      AND (status = 'completed' OR commitment_fulfilled = true)
      AND created_at > NOW() - INTERVAL '90 days'
  `, [userId]);
  
  if (completions.rows.length < 5) {
    return {
      has_data: false,
      message: 'Not enough completion data yet. Complete at least 5 thoughts to see your energy curve.',
      default_curve: getDefaultCurve(),
      data_points: completions.rows.length
    };
  }
  
  const hours = completions.rows.map(r => parseFloat(r.hour));
  const dows = completions.rows.map(r => parseInt(r.dow));
  const completionTimes = completions.rows.map(r => parseFloat(r.time_to_complete));
  
  // KDE on completion hours
  const rawDensity = kde(hours, 1.5);
  const density = smooth(rawDensity, 2);
  
  // Normalize to 0-100 scale
  const maxDensity = Math.max(...density);
  const energyCurve = density.map(d => Math.round((d / maxDensity) * 100));
  
  // Find peaks and troughs
  const peakHours = findPeaks(energyCurve);
  const troughHours = findTroughs(energyCurve);
  
  // Day-of-week pattern
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowCounts = new Array(7).fill(0);
  dows.forEach(d => dowCounts[d]++);
  const totalDow = dows.length;
  const dowPattern = dowCounts.map((c, i) => ({
    day: dayNames[i],
    activity_pct: Math.round((c / totalDow) * 100)
  }));
  
  // Average completion speed by hour (faster = more energy)
  const speedByHour = {};
  completions.rows.forEach(r => {
    const h = Math.floor(parseFloat(r.hour));
    if (!speedByHour[h]) speedByHour[h] = [];
    speedByHour[h].push(parseFloat(r.time_to_complete));
  });
  
  const avgSpeed = {};
  for (const [h, times] of Object.entries(speedByHour)) {
    avgSpeed[h] = times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  // Generate recommendations
  const recommendations = generateEnergyRecommendations(energyCurve, peakHours, troughHours, avgSpeed);
  
  return {
    has_data: true,
    energy_curve: energyCurve,
    peak_hours: peakHours,
    trough_hours: troughHours,
    best_day: dowPattern.reduce((a, b) => a.activity_pct > b.activity_pct ? a : b).day,
    day_pattern: dowPattern,
    speed_by_hour: avgSpeed,
    recommendations,
    data_points: completions.rows.length,
    confidence: Math.min(1, completions.rows.length / 50)
  };
}

/**
 * Find local maxima in the energy curve
 */
function findPeaks(curve) {
  const peaks = [];
  for (let i = 1; i < curve.length - 1; i++) {
    if (curve[i] > curve[i - 1] && curve[i] > curve[i + 1] && curve[i] > 30) {
      peaks.push({ hour: i, energy: curve[i] });
    }
  }
  // Also check wrap-around
  if (curve[0] > curve[23] && curve[0] > curve[1] && curve[0] > 30) {
    peaks.push({ hour: 0, energy: curve[0] });
  }
  return peaks.sort((a, b) => b.energy - a.energy);
}

/**
 * Find local minima in the energy curve
 */
function findTroughs(curve) {
  const troughs = [];
  for (let i = 1; i < curve.length - 1; i++) {
    if (curve[i] < curve[i - 1] && curve[i] < curve[i + 1] && curve[i] < 50) {
      troughs.push({ hour: i, energy: curve[i] });
    }
  }
  return troughs.sort((a, b) => a.energy - b.energy);
}

/**
 * Generate scheduling recommendations
 */
function generateEnergyRecommendations(curve, peaks, troughs, speedByHour) {
  const recs = [];
  
  if (peaks.length > 0) {
    const bestPeak = peaks[0];
    recs.push({
      type: 'peak_window',
      message: `Your peak performance window is around ${bestPeak.hour}:00. Schedule your most challenging work here.`,
      hour: bestPeak.hour,
      energy: bestPeak.energy,
      task_type: 'complex'
    });
  }
  
  if (troughs.length > 0) {
    const worstTrough = troughs[0];
    recs.push({
      type: 'trough_window',
      message: `Energy dips around ${worstTrough.hour}:00. Use this time for easy tasks — emails, admin, planning.`,
      hour: worstTrough.hour,
      energy: worstTrough.energy,
      task_type: 'simple'
    });
  }
  
  // Check for post-lunch dip (13:00-15:00)
  const lunchEnergy = (curve[13] + curve[14]) / 2;
  if (lunchEnergy < 40) {
    recs.push({
      type: 'post_lunch',
      message: 'You experience a post-lunch dip. Consider a 10-minute walk or light task after lunch.',
      energy: Math.round(lunchEnergy),
      task_type: 'rest'
    });
  }
  
  // Check for late-night productivity
  const nightEnergy = (curve[22] + curve[23]) / 2;
  if (nightEnergy > 50) {
    recs.push({
      type: 'night_owl',
      message: 'You\'re productive late at night. Consider shifting creative work to evening hours.',
      energy: Math.round(nightEnergy),
      task_type: 'creative'
    });
  }
  
  // Speed-based insight
  const speedEntries = Object.entries(speedByHour).map(([h, avg]) => ({ hour: parseInt(h), avgTime: avg }));
  if (speedEntries.length >= 3) {
    speedEntries.sort((a, b) => a.avgTime - b.avgTime); // Fastest first
    const fastest = speedEntries[0];
    recs.push({
      type: 'fastest_hour',
      message: `You complete tasks fastest around ${fastest.hour}:00 (avg ${Math.round(fastest.avgTime * 10) / 10}h). Use this for quick wins.`,
      hour: fastest.hour,
      avg_completion_hours: Math.round(fastest.avgTime * 10) / 10
    });
  }
  
  return recs;
}

/**
 * Default curve when no data is available
 */
function getDefaultCurve() {
  return Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return 80;   // Morning peak
    if (i >= 14 && i <= 16) return 70;   // Afternoon recovery
    if (i >= 20 && i <= 22) return 60;   // Evening burst
    if (i >= 12 && i <= 13) return 30;   // Lunch dip
    if (i >= 0 && i <= 5) return 10;     // Night
    return 50;                            // Default
  });
}

module.exports = { detectEnergyPattern, kde, gaussianKernel, getDefaultCurve };
