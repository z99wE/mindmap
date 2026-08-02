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

// In-memory revival queue (zero cost, no Redis needed)
const revivalQueue = new Map();

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
 * Schedule a revival in the in-memory queue
 * @param {string} userId - User ID
 * @param {string} thoughtId - Thought ID
 * @param {string} thought - Thought text
 * @param {number} ttlHours - Hours until revival
 */
function scheduleRevival(userId, thoughtId, thought, ttlHours = 12) {
  const key = `revival:${userId}:${thoughtId}`;
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
  revivalQueue.set(key, { userId, thoughtId, thought, expiresAt });
}

/**
 * Process revival queue and return due revivals
 * @param {object} caspian - Caspian SDK client (optional)
 * @returns {Array} - Array of revival messages to send
 */
function processRevivalQueue(caspian = null) {
  const now = Date.now();
  const due = [];

  for (const [key, entry] of revivalQueue.entries()) {
    if (now >= entry.expiresAt) {
      due.push(entry);
      revivalQueue.delete(key);
    }
  }

  return due.map(entry => ({
    userId: entry.userId,
    message: `Still on your mind? "${entry.thought}"`
  }));
}

/**
 * Get pending clarifications for a user
 * @param {string} userId - User ID
 * @returns {Array} - Pending clarifications
 */
function getPendingClarifications(userId) {
  const pending = [];
  for (const [key, entry] of revivalQueue.entries()) {
    if (key.startsWith(`revival:${userId}:`)) {
      pending.push({
        thoughtId: entry.thoughtId,
        thought: entry.thought,
        expiresAt: entry.expiresAt,
      });
    }
  }
  return pending;
}

/**
 * Clear a pending clarification
 * @param {string} userId
 * @param {string} thoughtId
 */
function clearClarification(userId, thoughtId) {
  const key = `revival:${userId}:${thoughtId}`;
  revivalQueue.delete(key);
}

/**
 * Setup revival cron using setInterval (no Redis needed)
 * @param {object} pool - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {number} intervalMs - Check interval (default: 5 min)
 */
function setupRevivalCron(pool, caspian, intervalMs = 5 * 60 * 1000) {
  setInterval(async () => {
    const revivals = processRevivalQueue(caspian);
    for (const r of revivals) {
      if (caspian) {
        try {
          await caspian.send({ channel: 'whatsapp', to: r.userId, message: r.message });
          console.log(`[Interceptor] Revival sent to ${r.userId}`);
        } catch (e) {
          console.error('[Interceptor] Revival send failed:', e.message);
        }
      }
      // Also store as notification
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, channel)
           VALUES ($1, 'thought_revival', 'Thought Revival', $2, 'browser')`,
          [r.userId, r.message]
        );
      } catch { /* notifications table may not exist */ }
    }
  }, intervalMs);
}

module.exports = {
  detectIntent,
  detectUnanchored,
  analyzeIntentTrigger,
  applyRevivalHours,
  scheduleRevival,
  processRevivalQueue,
  getPendingClarifications,
  clearClarification,
  setupRevivalCron,
  revivalQueue,
};
