/**
 * Commitment Witness - Phase 8 Feature
 * 
 * Detects time-bound personal commitments, asks user if they want accountability witness,
 * and notifies their witness contact via WhatsApp if the task expires without being marked complete.
 */

/**
 * Parse a relative deadline string into an actual Date
 * @param {string} deadline - "friday", "tomorrow", "this_week", "end_of_day", "before 6pm", etc.
 * @returns {Date|null}
 */
function parseDeadline(deadline) {
  const now = new Date();
  const lower = (deadline || '').toLowerCase();

  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0); // Default 6pm
    return d;
  }
  if (lower.includes('end of day') || lower.includes('end_of_day') || lower.includes('before i sleep')) {
    const d = new Date(now);
    d.setHours(23, 59, 0, 0);
    return d;
  }
  if (lower.includes('this week') || lower.includes('this_week')) {
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    d.setHours(18, 0, 0, 0);
    return d;
  }

  // Day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const d = new Date(now);
      const daysUntil = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntil);
      d.setHours(18, 0, 0, 0);
      return d;
    }
  }

  // Time-based: "before 6pm", "by 5pm"
  const timeMatch = lower.match(/(\d{1,2})\s*(am|pm)/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    if (timeMatch[2] === 'pm' && hour < 12) hour += 12;
    if (timeMatch[2] === 'am' && hour === 12) hour = 0;
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1); // If time passed, assume tomorrow
    return d;
  }

  return null; // Can't parse, return null
}

/**
 * Detects if a message is a personal commitment
 * @param {string} message 
 * @returns {object} - { isCommitment, commitment, deadline, askForWitness, witnessAskMessage, deadlineDate }
 */
function detectCommitment(message) {
  const lower = message.toLowerCase();
  
  // Commitment signals
  const signals = ["i will", "i'll", "i promise", "i'm going to", "i plan to", "i'll do", "i'll finish", "i'll complete", "i'll send"];
  const matchesSignal = signals.some(sig => lower.includes(sig));
  
  // Deadline signals
  const deadlineSignals = ["by friday", "before 6pm", "before 5pm", "this week", "tomorrow", "before i sleep", "by end of day", "by monday", "by tuesday", "by wednesday", "by thursday", "by sunday", "by saturday"];
  const matchesDeadline = deadlineSignals.some(dl => lower.includes(dl));
  
  if (matchesSignal && matchesDeadline) {
    // Extract the matched deadline string
    let deadlineStr = 'end_of_day';
    for (const dl of deadlineSignals) {
      if (lower.includes(dl)) { deadlineStr = dl; break; }
    }

    // Parse deadline to actual Date
    const deadlineDate = parseDeadline(deadlineStr);

    // Check if deadline is within 72 hours
    let askForWitness = false;
    if (deadlineDate) {
      const hoursUntil = (deadlineDate - new Date()) / (1000 * 60 * 60);
      askForWitness = hoursUntil > 0 && hoursUntil <= 72;
    }

    // Extract commitment text (rough extraction)
    let commitment = message;

    return {
      is_commitment: true,
      commitment,
      deadline: deadlineStr,
      deadline_date: deadlineDate ? deadlineDate.toISOString() : null,
      ask_for_witness: askForWitness,
      witness_ask_message: "Want me to quietly let someone know if this doesn't happen?"
    };
  }
  
  return { is_commitment: false };
}

/**
 * Checks for expired commitments and notifies witnesses if needed
 * @param {object} pool - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 */
async function checkCommitmentWitnesses(pool, caspian) {
  try {
    const res = await pool.query(
      `SELECT id, user_id, value as thought, witness_contact, expires_at
       FROM memory_graph
       WHERE status = 'pending' 
         AND witness_contact IS NOT NULL 
         AND witness_notified = false 
         AND expires_at < NOW()`
    );
    
    for (const row of res.rows) {
      // Send notification to the witness contact
      if (caspian) {
        await caspian.send({
          channel: 'whatsapp',
          to: row.witness_contact,
          message: `Just a nudge. Someone planned to finish: "${row.thought}" by now. 🙂`
        });
      }
      
      // Mark as notified so we never double notify
      await pool.query(
        `UPDATE memory_graph SET witness_notified = true WHERE id = $1`,
        [row.id]
      );
      console.log(`[Commitment Witness] Notified witness ${row.witness_contact} for expired task ${row.id}`);
    }
  } catch (error) {
    console.error('[Commitment Witness] Error checking expired tasks:', error.message);
  }
}

module.exports = {
  detectCommitment,
  checkCommitmentWitnesses,
  parseDeadline
};
