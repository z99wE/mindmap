/**
 * COMMITMENT ESCALATION
 *
 * When thoughts have been "pending" for too long, the system automatically
 * suggests escalating actions:
 *
 * - 3 days pending: "Convert to commitment with deadline?"
 * - 5 days pending: "Delegate this to someone else?"
 * - 7 days pending: "Archive this thought — it's not important enough"
 * - 14 days pending: "Delete this — it's cluttering your mind"
 *
 * Instead of letting thoughts silently decay, this forces the user to
 * make a conscious decision: act, delegate, or release.
 *
 * Cost: $0 — just checking timestamps and suggesting actions
 */

'use strict';

const { pool } = require('./db');

// ── Escalation Tiers ──────────────────────────────────────────────────────
const ESCALATION_TIERS = [
  {
    daysPending: 3,
    severity: 'nudge',
    icon: '💡',
    message: 'This thought has been pending for {days} days.',
    actions: [
      { label: 'Convert to commitment', action: 'convert_to_commitment', icon: '🎯' },
      { label: 'Add a deadline', action: 'add_deadline', icon: '⏰' },
      { label: 'Keep as-is', action: 'dismiss', icon: '✓' },
    ],
  },
  {
    daysPending: 5,
    severity: 'suggest',
    icon: '🤔',
    message: 'You\'ve been thinking about this for {days} days without acting.',
    actions: [
      { label: 'Delegate it', action: 'delegate', icon: '👥' },
      { label: 'Simplify & do now', action: 'simplify', icon: '⚡' },
      { label: 'Set a hard deadline', action: 'hard_deadline', icon: '🔥' },
      { label: 'Dismiss', action: 'dismiss', icon: '✓' },
    ],
  },
  {
    daysPending: 7,
    severity: 'warn',
    icon: '⚠️',
    message: 'This thought is taking up mental space for a week. Time to decide.',
    actions: [
      { label: 'Break into smaller steps', action: 'break_down', icon: '🔧' },
      { label: 'Archive it', action: 'archive', icon: '📦' },
      { label: 'Delete it', action: 'delete', icon: '🗑️' },
      { label: 'Keep (explain why)', action: 'keep_with_reason', icon: '💬' },
    ],
  },
  {
    daysPending: 14,
    severity: 'critical',
    icon: '🚨',
    message: 'This thought is 2 weeks old. It\'s cluttering your cognitive space.',
    actions: [
      { label: 'Archive permanently', action: 'archive', icon: '📦' },
      { label: 'Delete it', action: 'delete', icon: '🗑️' },
      { label: 'I\'ll do it TODAY', action: 'commit_today', icon: '🔥' },
    ],
  },
];

/**
 * Check all pending thoughts for a user and return escalation suggestions.
 */
async function getEscalations(userId) {
  const result = await pool.query(`
    SELECT id, content, category, urgency_tier, is_actionable,
           half_life_hours, expires_at, created_at, status, action_verb,
           EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age_days
    FROM memory_graph
    WHERE user_id = $1
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 50
  `, [userId]);

  const escalations = [];

  for (const thought of result.rows) {
    const ageDays = parseFloat(thought.age_days);
    const tier = getEscalationTier(ageDays);

    if (tier) {
      escalations.push({
        thoughtId: thought.id,
        content: thought.content,
        category: thought.category,
        urgency: thought.urgency_tier,
        ageDays: Math.round(ageDays),
        escalation: {
          ...tier,
          message: tier.message.replace('{days}', Math.round(ageDays)),
        },
      });
    }
  }

  return {
    escalations,
    summary: {
      total: escalations.length,
      nudge: escalations.filter(e => e.escalation.severity === 'nudge').length,
      suggest: escalations.filter(e => e.escalation.severity === 'suggest').length,
      warn: escalations.filter(e => e.escalation.severity === 'warn').length,
      critical: escalations.filter(e => e.escalation.severity === 'critical').length,
    },
    cognitiveDebt: calculateCognitiveDebt(escalations),
  };
}

/**
 * Get the escalation tier for a thought based on its age.
 */
function getEscalationTier(ageDays) {
  let tier = null;
  for (const t of ESCALATION_TIERS) {
    if (ageDays >= t.daysPending) {
      tier = t;
    }
  }
  return tier;
}

/**
 * Calculate cognitive debt — the mental cost of uncompleted thoughts.
 */
function calculateCognitiveDebt(escalations) {
  // Each pending thought "costs" mental energy
  // Older thoughts cost more (they've been nagging longer)
  let totalDebt = 0;
  let breakdown = { nudge: 0, suggest: 0, warn: 0, critical: 0 };

  for (const e of escalations) {
    const weight = { nudge: 1, suggest: 2, warn: 4, critical: 8 }[e.escalation.severity] || 1;
    const debt = weight * (1 + e.ageDays * 0.1); // older = more expensive
    totalDebt += debt;
    breakdown[e.escalation.severity] += debt;
  }

  // Normalize to 0-100
  const maxDebt = escalations.length * 10; // theoretical max
  const normalized = Math.min(100, Math.round((totalDebt / Math.max(maxDebt, 1)) * 100));

  return {
    score: normalized,
    level: normalized >= 80 ? 'critical' :
           normalized >= 50 ? 'high' :
           normalized >= 25 ? 'medium' : 'low',
    message: normalized >= 80 ? 'Your cognitive load is very high. Consider archiving or deleting stale thoughts.'
           : normalized >= 50 ? 'You have significant cognitive debt. Time for a thought cleanup.'
           : normalized >= 25 ? 'Some thoughts need attention. Review your pending items.'
           : 'Your mind is clear! Keep it up.',
    breakdown,
  };
}

/**
 * Handle an escalation action (called when user clicks an action).
 */
async function handleEscalationAction(userId, thoughtId, action) {
  const thoughtResult = await pool.query(
    'SELECT * FROM memory_graph WHERE id = $1 AND user_id = $2',
    [thoughtId, userId]
  );

  if (thoughtResult.rows.length === 0) {
    return { success: false, error: 'Thought not found' };
  }

  const thought = thoughtResult.rows[0];

  switch (action) {
    case 'convert_to_commitment': {
      // Add a deadline 3 days from now
      const deadline = new Date(Date.now() + 3 * 86400000).toISOString();
      await pool.query(`
        UPDATE memory_graph
        SET expires_at = $1, is_actionable = true, urgency_tier = 'high'
        WHERE id = $2
      `, [deadline, thoughtId]);
      return { success: true, message: 'Converted to commitment with 3-day deadline' };
    }

    case 'add_deadline': {
      const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
      await pool.query(`
        UPDATE memory_graph SET expires_at = $1 WHERE id = $2
      `, [deadline, thoughtId]);
      return { success: true, message: 'Added 7-day deadline' };
    }

    case 'hard_deadline': {
      const deadline = new Date(Date.now() + 1 * 86400000).toISOString();
      await pool.query(`
        UPDATE memory_graph SET expires_at = $1, urgency_tier = 'critical' WHERE id = $2
      `, [deadline, thoughtId]);
      return { success: true, message: 'Set hard deadline for tomorrow with critical urgency' };
    }

    case 'delegate': {
      await pool.query(`
        UPDATE memory_graph SET category = 'delegated' WHERE id = $1
      `, [thoughtId]);
      return { success: true, message: 'Marked as delegated — follow up in a few days' };
    }

    case 'simplify': {
      await pool.query(`
        UPDATE memory_graph SET urgency_tier = 'high', is_actionable = true WHERE id = $1
      `, [thoughtId]);
      return { success: true, message: 'Simplified — tackle it now!' };
    }

    case 'break_down': {
      await pool.query(`
        UPDATE memory_graph SET category = 'needs_breakdown' WHERE id = $1
      `, [thoughtId]);
      return { success: true, message: 'Marked for breakdown — consider splitting into smaller tasks' };
    }

    case 'archive': {
      await pool.query(`
        UPDATE memory_graph SET status = 'archived' WHERE id = $1
      `, [thoughtId]);
      return { success: true, message: 'Archived — out of sight, out of mind' };
    }

    case 'delete': {
      await pool.query('DELETE FROM memory_graph WHERE id = $1', [thoughtId]);
      return { success: true, message: 'Deleted — mental space freed' };
    }

    case 'commit_today': {
      const deadline = new Date(Date.now() + 1 * 86400000).toISOString();
      await pool.query(`
        UPDATE memory_graph SET expires_at = $1, urgency_tier = 'critical', status = 'in_progress'
        WHERE id = $2
      `, [deadline, thoughtId]);
      return { success: true, message: 'Committed for today — you got this!' };
    }

    case 'keep_with_reason': {
      return { success: true, message: 'Keeping — sometimes thoughts need time to mature' };
    }

    case 'dismiss': {
      return { success: true, message: 'Dismissed' };
    }

    default:
      return { success: false, error: 'Unknown action' };
  }
}

module.exports = {
  getEscalations,
  handleEscalationAction,
  calculateCognitiveDebt,
  ESCALATION_TIERS,
};
