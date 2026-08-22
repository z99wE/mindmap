/**
 * ADAPTIVE COGNITIVE LOAD BALANCER
 *
 * Learns from user behavior to automatically suggest which thoughts to
 * tackle first. Unlike simple urgency-based sorting, this considers:
 *
 * - Time of day (match thought difficulty to energy level)
 * - Category reliability (tackle low-reliability categories during peak hours)
 * - Completion momentum (suggest easy wins first to build confidence)
 * - Deadline proximity vs completion probability
 * - Cognitive debt accumulation (overdue items drain mental energy)
 *
 * Cost: $0 (math on existing data + existing embeddings)
 */

'use strict';

const { pool } = require('./db');
const { learnBehavioralProfile, predictCompletion, suggestOptimalTime } = require('./behavioral-learner');

/**
 * Get an adaptive priority queue for a user's pending thoughts.
 * Returns thoughts ranked by "tackle this first" priority.
 */
async function getAdaptivePriorityQueue(userId) {
  // Get pending thoughts
  const thoughtsResult = await pool.query(`
    SELECT id, content, category, urgency_tier, is_actionable,
           half_life_hours, expires_at, created_at, status,
           action_verb
    FROM memory_graph
    WHERE user_id = $1
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 50
  `, [userId]);

  const thoughts = thoughtsResult.rows;
  if (thoughts.length === 0) return { queue: [], insights: [] };

  // Learn behavioral profile
  const profile = await learnBehavioralProfile(userId);

  // Score each thought for "tackle first" priority
  const scored = thoughts.map(t => {
    const prediction = predictCompletion(t, profile);
    const optimalTime = suggestOptimalTime(t, profile);

    let score = 0;
    const reasons = [];

    // 1. Urgency (0-30 points)
    const urgencyScores = { critical: 30, high: 20, medium: 10, low: 5 };
    score += urgencyScores[t.urgency_tier] || 10;
    if (t.urgency_tier === 'critical') reasons.push('Critical urgency');

    // 2. Deadline proximity (0-25 points)
    if (t.expires_at) {
      const hoursUntilExpiry = (new Date(t.expires_at) - Date.now()) / 3600000;
      if (hoursUntilExpiry < 24) { score += 25; reasons.push('Expires within 24h'); }
      else if (hoursUntilExpiry < 72) { score += 15; reasons.push('Expires within 3 days'); }
      else if (hoursUntilExpiry < 168) { score += 5; reasons.push('Expires this week'); }
    }

    // 3. Completion probability (0-20 points) — higher probability = easier win
    score += Math.round(prediction.probability * 20);
    if (prediction.probability > 0.7) reasons.push('High completion likelihood');

    // 4. Time-of-day match (0-15 points)
    const currentHour = new Date().getHours();
    const isOptimalTime = Math.abs(optimalTime.hour - currentHour) <= 2;
    if (isOptimalTime) { score += 15; reasons.push('Matched to your peak hour'); }

    // 5. Freshness penalty (-5 points for very old thoughts)
    const daysOld = (Date.now() - new Date(t.created_at).getTime()) / 86400000;
    if (daysOld > 14) { score -= 5; reasons.push('Been sitting for 2+ weeks'); }

    // 6. Category reliability bonus (0-10 points)
    const catReliability = profile.categoryReliability[t.category];
    if (catReliability && catReliability.completionRate > 0.6) {
      score += 10;
      reasons.push(`You're reliable with ${t.category}`);
    } else if (catReliability && catReliability.completionRate < 0.3) {
      reasons.push(`Struggle with ${t.category} — tackle during peak hours`);
    }

    return {
      ...t,
      priorityScore: Math.max(score, 0),
      reasons,
      completionProbability: prediction.probability,
      optimalHour: optimalTime.hour,
      optimalReason: optimalTime.reason,
    };
  });

  // Sort by priority score (highest first)
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Generate insights about the queue
  const insights = [];
  const criticalCount = scored.filter(t => t.urgency_tier === 'critical').length;
  const expiringSoon = scored.filter(t => {
    if (!t.expires_at) return false;
    return (new Date(t.expires_at) - Date.now()) / 3600000 < 24;
  }).length;

  if (criticalCount > 0) {
    insights.push(`🔴 ${criticalCount} critical thought${criticalCount > 1 ? 's' : ''} need attention`);
  }
  if (expiringSoon > 0) {
    insights.push(`⏰ ${expiringSoon} thought${expiringSoon > 1 ? 's' : ''} expiring within 24 hours`);
  }
  if (scored.length > 5) {
    insights.push(`💡 Start with the top 3 for momentum, then tackle critical items`);
  }

  return {
    queue: scored.slice(0, 10), // top 10
    insights,
    profile: {
      completionRate: profile.overallCompletionRate,
      peakHours: profile.peakHours.slice(0, 3),
      stressThreshold: profile.stressThreshold,
    },
  };
}

/**
 * innovative Productivity Concept: "Thought Energy Matching"
 *
 * Instead of just sorting by urgency, match thought difficulty to
 * the user's current energy level based on time of day and recent activity.
 *
 * Low energy (morning/evening): Easy completions, quick wins
 * High energy (peak hours): Complex tasks, critical items
 * Post-meal dip: Administrative tasks, organization
 */
function matchThoughtToEnergyLevel(thought, currentHour, profile) {
  // Energy curve: high 9-12, dip 13-14, high 15-17, low 18-22, very low 23-8
  let energyLevel = 'medium';
  if (currentHour >= 9 && currentHour <= 12) energyLevel = 'high';
  else if (currentHour >= 15 && currentHour <= 17) energyLevel = 'high';
  else if (currentHour >= 13 && currentHour <= 14) energyLevel = 'low'; // post-lunch
  else if (currentHour >= 18 && currentHour <= 22) energyLevel = 'low';
  else if (currentHour >= 23 || currentHour < 8) energyLevel = 'very-low';

  // Match thought complexity to energy
  const complexity = thought.urgency_tier === 'critical' ? 'high' :
    thought.is_actionable ? 'medium' : 'low';

  const energyComplexityMatch = {
    'high-high': 'excellent',
    'high-medium': 'good',
    'high-low': 'good',
    'medium-high': 'good',
    'medium-medium': 'good',
    'medium-low': 'ok',
    'low-high': 'poor',
    'low-medium': 'ok',
    'low-low': 'good',
    'very-low-high': 'avoid',
    'very-low-medium': 'poor',
    'very-low-low': 'ok',
  };

  const match = energyComplexityMatch[`${energyLevel}-${complexity}`] || 'ok';

  return {
    energyLevel,
    complexity,
    match,
    recommendation: match === 'excellent' || match === 'good'
      ? `Good time for this — your energy matches the task`
      : match === 'poor' || match === 'avoid'
        ? `Consider waiting until your next peak hour`
        : `OK time, but not optimal`,
  };
}

module.exports = { getAdaptivePriorityQueue, matchThoughtToEnergyLevel };
