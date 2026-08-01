/**
 * Thought Interceptor - Phase 8 Feature
 * 
 * Captures thoughts with intent verbs and adds geofenced/time-triggered actions
 * Uses existing Caspian SDK for WhatsApp delivery
 * Uses Redis for pending queue with TTL
 */

const INTENT_PATTERNS = [
  /need to\s+(.*)/i,
  /should\s+(.*)/i,
  /don't forget\s+(.*)/i,
  /remind me\s+(.*)/i,
  /have to\s+(.*)/i,
  /must\s+(.*)/i,
  /gotta\s+(.*)/i,
  /gonna\s+(.*)/i
];

/**
 * Detect if a message contains intent verbs
 * @param {string} message - User's message
 * @returns {string|null} - The intent content or null if no intent detected
 */
function detectIntent(message) {
  for (const pattern of INTENT_PATTERNS) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if intent contains location/time trigger
 * @param {string} intent - The extracted intent
 * @returns {object} - { hasTime: boolean, hasLocation: boolean, timeText: string|null, locationText: string|null }
 */
function analyzeIntentTrigger(intent) {
  // Time patterns
  const timePatterns = [
    /today\s+(.*)/i,
    /tomorrow\s+(.*)/i,
    /in\s+(\d+)\s+(minutes?|hours?|days?)/i,
    /at\s+(\d{1,2}:\d{2})/i,
    /(\d{1,2}:\d{2})\s*(am|pm)/i
  ];
  
  // Location patterns
  const locationPatterns = [
    /at\s+(.*)/i,
    /in\s+(.*)/i,
    /go\s+(.*)/i,
    /pick\s+up\s+(.*)/i,
    /drop\s+off\s+(.*)/i
  ];
  
  let hasTime = false, hasLocation = false;
  let timeText = null, locationText = null;
  
  for (const pattern of timePatterns) {
    const match = intent.match(pattern);
    if (match) {
      hasTime = true;
      timeText = match[0];
      break;
    }
  }
  
  for (const pattern of locationPatterns) {
    const match = intent.match(pattern);
    if (match) {
      hasLocation = true;
      locationText = match[0];
      break;
    }
  }
  
  return { hasTime, hasLocation, timeText, locationText };
}

/**
 * Store thought as pending_clarification in memory graph
 * @param {object} db - PostgreSQL pool connection
 * @param {string} userId - User ID
 * @param {string} intent - Extracted intent
 * @returns {Promise<object>} - Inserted record
 */
async function storePendingThought(db, userId, intent) {
  const result = await db.query(
    `INSERT INTO memory_graph (user_id, content, status, created_at)
     VALUES ($1, $2, 'pending_clarification', NOW())
     RETURNING *`,
    [userId, intent]
  );
  return result.rows[0];
}

/**
 * Ask clarification question via WhatsApp
 * @param {object} caspian - Caspian SDK client
 * @param {string} userId - User's WhatsApp ID
 * @returns {Promise<void>}
 */
async function askClarification(caspian, userId) {
  await caspian.send({
    channel: 'whatsapp',
    to: userId,
    message: 'When? Or where?'
  });
}

/**
 * Schedule thought revival in Redis
 * @param {object} redis - Redis client
 * @param {string} userId - User ID
 * @param {string} intent - Intent content
 * @param {number} ttl - Time to live in seconds (default: 14400 = 4 hours)
 */
async function scheduleRevival(redis, userId, intent, ttl = 14400) {
  const key = `revival:${userId}:${Date.now()}`;
  await redis.setex(key, ttl, intent);
}

/**
 * Process revival queue and send WhatsApp notifications
 * @param {object} redis - Redis client
 * @param {object} caspian - Caspian SDK client
 * @param {number} interval - Check interval in ms (default: 300000 = 5 minutes)
 */
function setupRevivalCron(redis, caspian, interval = 300000) {
  setInterval(async () => {
    try {
      const keys = await redis.keys('revival:*');
      const now = Date.now();
      
      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length < 3) continue;
        
        const userId = parts[1];
        const timestamp = parseInt(parts[2], 10);
        const thought = await redis.get(key);
        
        if (now - timestamp >= 14400000) { // 4 hours
          await caspian.send({
            channel: 'whatsapp',
            to: userId,
            message: `Thought revival: ${thought}\n\nReply with a time or location to schedule this action.`
          });
          await redis.del(key);
        }
      }
    } catch (error) {
      console.error('Error processing revival queue:', error);
    }
  }, interval);
}

/**
 * Create HTTP endpoints for thought interceptor
 * @param {object} app - Express app
 * @param {object} db - PostgreSQL pool
 * @param {object} redis - Redis client
 * @param {object} caspian - Caspian SDK client
 */
function createThoughtInterceptorEndpoints(app, db, redis, caspian) {
  // POST /api/thought/intercept - Intercept and process a new thought
  app.post('/api/thought/intercept', async (req, res) => {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: 'userId and message are required' });
      }
      
      const intent = detectIntent(message);
      
      if (!intent) {
        // Not an intercepted thought, process normally
        return res.json({ 
          type: 'normal',
          message: 'Message processed normally' 
        });
      }
      
      // Store as pending clarification
      const thought = await storePendingThought(db, userId, intent);
      
      // Ask clarification question
      await askClarification(caspian, userId);
      
      // Schedule revival if no response in 10 minutes
      await redis.setex(`clarification:${thought.id}`, 600, JSON.stringify({
        thoughtId: thought.id,
        userId,
        intent
      }));
      
      res.json({
        type: 'intercepted',
        intent,
        status: 'pending_clarification',
        thoughtId: thought.id
      });
    } catch (error) {
      console.error('Error intercepting thought:', error);
      res.status(500).json({ error: 'Failed to intercept thought' });
    }
  });
  
  // POST /api/thought/clarify - User provides clarification
  app.post('/api/thought/clarify', async (req, res) => {
    try {
      const { thoughtId, userId, response } = req.body;
      
      if (!thoughtId || !userId || !response) {
        return res.status(400).json({ error: 'thoughtId, userId, and response are required' });
      }
      
      // Analyze the clarification
      const intentData = JSON.parse(await redis.get(`clarification:${thoughtId}`));
      
      // Update memory graph with new status and trigger
      const result = await db.query(
        `UPDATE memory_graph 
         SET status = $1, 
             trigger_type = $2,
             trigger_value = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        ['scheduled', 
         response.includes('at') || response.includes('in') ? 'location' : 'time',
         response,
         thoughtId, userId]
      );
      
      await redis.del(`clarification:${thoughtId}`);
      
      res.json({
        success: true,
        thought: result.rows[0]
      });
    } catch (error) {
      console.error('Error processing clarification:', error);
      res.status(500).json({ error: 'Failed to process clarification' });
    }
  });
}

module.exports = {
  detectIntent,
  analyzeIntentTrigger,
  storePendingThought,
  askClarification,
  scheduleRevival,
  setupRevivalCron,
  createThoughtInterceptorEndpoints
};
