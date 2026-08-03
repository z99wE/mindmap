/**
 * Thought Half-Life Classifier - Phase 8 Feature
 * 
 * Assigns half-life hours, updates memory_graph table,
 * and handles three-tiered WhatsApp escalation nudges.
 */

const HALF_LIFE_RULES = [
  { keywords: ['call doctor', 'medication', 'hospital', 'medicine', 'clinic', 'dentist'], hours: 24 },
  { keywords: ['pay bill', 'gst', 'rent', 'fine', 'tax', 'invoice', 'fees'], hours: 48 },
  { keywords: ['buy grocery', 'errand', 'pickup', 'groceries', 'supermarket', 'retrieve'], hours: 12 },
  { keywords: ['email', 'message', 'reply', 'send message', 'text', 'whatsapp', 'ping'], hours: 36 },
  { keywords: ['book appointment', 'ticket', 'reservation', 'schedule', 'flight', 'hotel'], hours: 72 },
  { keywords: ['someday', 'one day', 'eventually', 'later', 'dream', 'wish'], hours: 720 },
  { keywords: ['learn', 'read', 'explore', 'research', 'study', 'understand'], hours: 480 }
];

/**
 * Classifies thought half-life hours based on rule keywords or defaults to 168 hours (1 week).
 * @param {string} thought 
 * @returns {object} - { half_life_hours, urgency_tier, action_verb, category, is_actionable }
 */
function classifyHalfLife(thought) {
  const lower = thought.toLowerCase();
  let hours = 168; // Default
  let category = 'other';
  let actionVerb = 'other';
  let urgencyTier = 'medium';
  let isActionable = false;

  // Determine category and hours
  if (lower.includes('doctor') || lower.includes('medication') || lower.includes('hospital') || lower.includes('medicine')) {
    hours = 24;
    category = 'health';
    actionVerb = 'call';
    urgencyTier = 'critical';
    isActionable = true;
  } else if (lower.includes('pay') || lower.includes('bill') || lower.includes('gst') || lower.includes('rent') || lower.includes('fine')) {
    hours = 48;
    category = 'finance';
    actionVerb = 'pay';
    urgencyTier = 'high';
    isActionable = true;
  } else if (lower.includes('buy') || lower.includes('grocery') || lower.includes('pickup') || lower.includes('groceries')) {
    hours = 12;
    category = 'errand';
    actionVerb = 'buy';
    urgencyTier = 'medium';
    isActionable = true;
  } else if (lower.includes('email') || lower.includes('message') || lower.includes('reply') || lower.includes('reply to')) {
    hours = 36;
    category = 'work';
    actionVerb = 'send';
    urgencyTier = 'medium';
    isActionable = true;
  } else if (lower.includes('book') || lower.includes('appointment') || lower.includes('ticket') || lower.includes('reservation')) {
    hours = 72;
    category = 'personal';
    actionVerb = 'book';
    urgencyTier = 'medium';
    isActionable = true;
  } else if (lower.includes('someday') || lower.includes('one day') || lower.includes('eventually') || lower.includes('later')) {
    hours = 720;
    category = 'personal';
    actionVerb = 'other';
    urgencyTier = 'low';
    isActionable = false;
  } else if (lower.includes('learn') || lower.includes('read') || lower.includes('explore') || lower.includes('research')) {
    hours = 480;
    category = 'personal';
    actionVerb = 'other';
    urgencyTier = 'low';
    isActionable = false;
  }

  return {
    thought,
    category,
    half_life_hours: hours,
    urgency_tier: urgencyTier,
    action_verb: actionVerb,
    is_actionable: isActionable
  };
}

/**
 * Processes half-life escalation tiers for a single serverless tick.
 * @param {object} pool - PostgreSQL pool connection
 * @param {object} caspian - Caspian SDK client
 */
async function processHalfLifeEscalations(pool, caspian) {
  try {
    // Find thoughts nearing/exceeding half-life thresholds
    const now = new Date();
    const res = await pool.query(
      `SELECT id, user_id, value as thought, half_life_hours, created_at, notified_tier, urgency_tier
       FROM memory_graph
       WHERE status = 'pending' AND archived = false AND expires_at IS NOT NULL`
    );

    for (const row of res.rows) {
      const elapsedMs = now - new Date(row.created_at);
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const halfLife = row.half_life_hours;

      let targetTier = 0;
      let message = '';

      if (elapsedHours >= halfLife) {
        targetTier = 3;
        message = `Nudge Tier 3: Offer to archive expired thought: "${row.thought}". Reply 'archive' to archive, or check your regret ledger.`;
      } else if (elapsedHours >= halfLife * 0.8) {
        targetTier = 2;
        message = `Nudge Tier 2: Still relevant? "${row.thought}"`;
      } else if (elapsedHours >= halfLife * 0.5) {
        targetTier = 1;
        message = `Nudge Tier 1: Gentle reminder for: "${row.thought}"`;
      }

      if (targetTier > row.notified_tier) {
        // Send Caspian WhatsApp notification
        if (caspian) {
          try {
            await caspian.send({
              channel: 'whatsapp',
              to: row.user_id,
              message
            });
          } catch (e) {
            console.error('[Half-Life] Caspian send failed:', e.message);
          }
        }

        // Update notified tier in DB
        await pool.query(
          `UPDATE memory_graph SET notified_tier = $1 WHERE id = $2`,
          [targetTier, row.id]
        );
        console.log(`[Half-Life] Escalated task ${row.id} to tier ${targetTier} for user ${row.user_id}`);
      }
    }
  } catch (error) {
    console.error('[Half-Life Cron] Error:', error.message);
  }
}

module.exports = {
  classifyHalfLife,
  processHalfLifeEscalations
};
