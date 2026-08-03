/**
 * Thought Interceptor - Phase 8 Feature
 * 
 * Detects unanchored intentions (thoughts with no time or place attached),
 * asks clarification questions, and schedules revival if no response.
 * Uses in-memory Map instead of Redis for zero cost.
 */

const INTENT_PATTERNS = [
  /need to\s+(.*)/i,
  /should\s+(.*)/i,
  /don't forget\s+(.*)/i,
  /remind me\s+(.*)/i,
  /have to\s+(.*)/i,
  /must\s+(.*)/i,
  /gotta\s+(.*)/i,
  /gonna\s+(.*)/i,
  /i should\s+(.*)/i,
  /want to\s+(.*)/i,
  /can't forget\s+(.*)/i,
];

// Time patterns (presence means anchored)
const TIME_PATTERNS = [
  /today/i, /tomorrow/i, /tonight/i, /this (morning|afternoon|evening)/i,
  /at\s+\d{1,2}/i, /\d{1,2}:\d{2}/i, /\d{1,2}\s*(am|pm)/i,
  /in\s+\d+\s+(minutes?|hours?|days?)/i,
  /on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /by\s+(friday|monday|tomorrow|end of day|noon|5pm|6pm)/i,
  /next\s+(week|month|year)/i,
];

// Place patterns (presence means anchored)
const PLACE_PATTERNS = [
  /at (the |home|work|office|store|mall|gym|hospital|clinic|airport|station)/i,
  /in (the |my |your )?(kitchen|bedroom|car|garage|garden|park)/i,
  /near\s+/i, /at\s+(?=.*\b(street|road|avenue|lane)\b)/i,
  /going to\s+/i, /heading to\s+/i,
];

// Removed in-memory revivalQueue to use PostgreSQL (thought_revivals table)

/**
 * Detect if a message contains intent verbs
 * @param {string} message - User's message
 * @returns {string|null} - The extracted intent content or null
 */
function detectIntent(message) {
  for (const pattern of INTENT_PATTERNS) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Detect if an intention is unanchored (no time or place attached)
 * @param {string} message - Full user message
 * @param {string} intent - Extracted intent content
 * @returns {object} - { is_unanchored, thought, missing, clarification_question, auto_revival_hours }
 */
function detectUnanchored(message, intent) {
  const text = intent || message;

  const hasTime = TIME_PATTERNS.some(p => p.test(text));
  const hasPlace = PLACE_PATTERNS.some(p => p.test(text));

  if (hasTime && hasPlace) {
    return { is_unanchored: false };
  }

  let missing = 'both';
  if (hasTime && !hasPlace) missing = 'place';
  else if (!hasTime && hasPlace) missing = 'time';

  // Clarification question rules: one question max
  let clarificationQuestion;
  if (missing === 'time') clarificationQuestion = 'When do you want to do this?';
  else if (missing === 'place') clarificationQuestion = 'Is this tied to a specific place?';
  else clarificationQuestion = 'When or where does this need to happen?';

  return {
    is_unanchored: true,
    thought: intent || message,
    missing,
    clarification_question: clarificationQuestion,
    auto_revival_hours: 12, // Default, updated by classifyIntent
  };
}

/**
 * Analyze an intent trigger (time or location)
 * @param {string} intent - The extracted intent
 * @returns {object} - { hasTime, hasLocation, timeText, locationText }
 */
function analyzeIntentTrigger(intent) {
  let hasTime = false, hasLocation = false;
  let timeText = null, locationText = null;

  for (const pattern of TIME_PATTERNS) {
    const match = intent.match(pattern);
    if (match) { hasTime = true; timeText = match[0]; break; }
  }

  for (const pattern of PLACE_PATTERNS) {
    const match = intent.match(pattern);
    if (match) { hasLocation = true; locationText = match[0]; break; }
  }

  return { hasTime, hasLocation, timeText, locationText };
}

/**
 * Set auto_revival_hours based on urgency tier
 * @param {object} result - The unanchored detection result
 * @param {string} urgencyTier - critical/high/medium/low
 * @returns {object} - Updated result
 */
function applyRevivalHours(result, urgencyTier) {
  if (!result.is_unanchored) return result;
  const hoursMap = { critical: 4, high: 8, medium: 12, low: 12 };
  result.auto_revival_hours = hoursMap[urgencyTier] || 12;
  return result;
}

/**
 * Schedule a revival durably in Postgres
 * @param {object} pool - Database pool
 * @param {string} userId - User ID
 * @param {string} thoughtId - Thought ID
 * @param {string} thought - Thought text
 * @param {number} ttlHours - Hours until revival
 */
async function scheduleRevival(pool, userId, thoughtId, thought, ttlHours = 12) {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO thought_revivals (user_id, thought_id, thought, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, thought_id) 
       DO UPDATE SET thought = EXCLUDED.thought, expires_at = EXCLUDED.expires_at`,
      [userId, thoughtId, JSON.stringify(thought), expiresAt]
    );
  } catch (err) {
    console.error('[Interceptor] Failed to schedule revival:', err);
  }
}

/**
 * Process durable revival queue and return due revivals
 * @param {object} pool - Database pool
 * @returns {Array} - Array of revival messages to send
 */
async function processRevivalQueue(pool) {
  try {
    const res = await pool.query(
      `DELETE FROM thought_revivals
       WHERE expires_at <= NOW()
       RETURNING user_id, thought_id, thought`
    );
    
    return res.rows.map(entry => ({
      userId: entry.user_id,
      thoughtId: entry.thought_id,
      message: `Still on your mind? "${entry.thought}"`
    }));
  } catch (err) {
    console.error('[Interceptor] Failed to process revival queue:', err);
    return [];
  }
}

/**
 * Get pending clarifications for a user
 * @param {object} pool - Database pool
 * @param {string} userId - User ID
 * @returns {Array} - Pending clarifications
 */
async function getPendingClarifications(pool, userId) {
  try {
    const res = await pool.query(
      `SELECT thought_id as "thoughtId", thought, expires_at as "expiresAt"
       FROM thought_revivals
       WHERE user_id = $1`,
      [userId]
    );
    return res.rows;
  } catch (err) {
    console.error('[Interceptor] Failed to get pending clarifications:', err);
    return [];
  }
}

/**
 * Clear a pending clarification
 * @param {object} pool - Database pool
 * @param {string} userId
 * @param {string} thoughtId
 */
async function clearClarification(pool, userId, thoughtId) {
  try {
    await pool.query(
      `DELETE FROM thought_revivals WHERE user_id = $1 AND thought_id = $2`,
      [userId, thoughtId]
    );
  } catch (err) {
    console.error('[Interceptor] Failed to clear clarification:', err);
  }
}

// setupRevivalCron is removed - queue processing is now handled by the serverless /api/cron/tick endpoint

module.exports = {
  detectIntent,
  detectUnanchored,
  analyzeIntentTrigger,
  applyRevivalHours,
  scheduleRevival,
  processRevivalQueue,
  getPendingClarifications,
  clearClarification,
};
