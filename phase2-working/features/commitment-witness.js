/**
 * Commitment Witness - Phase 8 Feature
 * 
 * Detects time-bound personal commitments, asks user if they want accountability witness,
 * and notifies their witness contact via WhatsApp if the task expires without being marked complete.
 */

/**
 * Detects if a message is a personal commitment
 * @param {string} message 
 * @returns {object} - { isCommitment: boolean, commitment: string, deadline: string, askForWitness: boolean, witnessAskMessage: string }
 */
function detectCommitment(message) {
  const lower = message.toLowerCase();
  
  // Commitment signals
  const signals = ["i will", "i'll", "i promise", "i'm going to", "i plan to"];
  const matchesSignal = signals.some(sig => lower.includes(sig));
  
  // Deadline signals
  const deadlineSignals = ["by friday", "before 6pm", "this week", "tomorrow", "before i sleep", "by end of day"];
  const matchesDeadline = deadlineSignals.some(dl => lower.includes(dl));
  
  if (matchesSignal && matchesDeadline) {
    // Extract commitment and deadline
    let commitment = message;
    let deadline = 'end_of_day'; // Default relative deadline
    
    if (lower.includes('friday')) deadline = 'friday';
    else if (lower.includes('tomorrow')) deadline = 'tomorrow';
    else if (lower.includes('this week')) deadline = 'this_week';
    
    return {
      is_commitment: true,
      commitment,
      deadline,
      ask_for_witness: true,
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
      await caspian.send({
        channel: 'whatsapp',
        to: row.witness_contact,
        message: `Just a nudge. Someone planned to finish: "${row.thought}" by now. 🙂`
      });
      
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
  checkCommitmentWitnesses
};
