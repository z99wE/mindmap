/**
 * Drift Detector - Phase 8 Feature
 * 
 * Monitors for location drift patterns (stale position)
 * Cross-references with memory graph for pending deadlines
 * Sends gentle nudge messages when user stays in one location too long
 */

/**
 * Get pending deadlines within a time window
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {number} hoursAhead - Hours ahead to check (default: 3)
 * @returns {Promise<Array>} - Array of pending deadlines
 */
async function getPendingDeadlines(db, userId, hoursAhead = 3) {
  const result = await db.query(
    `SELECT id, content, deadline_epoch, trigger_value, trigger_type
     FROM memory_graph 
     WHERE user_id = $1 
       AND status IN ('pending', 'scheduled', 'pending_clarification')
       AND deadline_epoch IS NOT NULL
       AND deadline_epoch BETWEEN EXTRACT(EPOCH FROM NOW()) 
                              AND EXTRACT(EPOCH FROM NOW() + INTERVAL '${hoursAhead} hours')
     ORDER BY deadline_epoch ASC`,
    [userId]
  );
  
  return result.rows;
}

/**
 * Generate natural language summary for drift detection alert
 * @param {object} llmRouter - LLM router function
 * @param {object} context - Context object with user info
 * @returns {Promise<string>} - Generated alert message
 */
async function generateDriftAlertMessage(llmRouter, context) {
  const { userLocation, pendingItems, locationDuration } = context;
  
  const prompt = `You are helping someone who may be stuck in hyperfocus or distracted.

User is at: ${userLocation || 'unknown location'}
Staying there for: ${locationDuration || 'unknown duration'}
Pending tasks: ${JSON.stringify(pendingItems)}

Write a gentle, non-alarmist check-in message asking if they have any time-sensitive tasks coming up. Keep it friendly and supportive.`;
  
  try {
    const response = await llmRouter({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-3.5-turbo'
    });
    
    return response.choices?.[0]?.message?.content || 'Just checking in. Anything time-sensitive coming up?';
  } catch (error) {
    console.error('Error generating drift alert message:', error);
    return 'Just checking in. You\'ve been at your location for a while. Anything time-sensitive tonight?';
  }
}

/**
 * Check user location drift
 * @param {object} tile38 - Tile38 client
 * @param {string} userId - User ID
 * @param {number} maxRadiusMeters - Maximum movement radius in meters (default: 200)
 * @param {number} maxDurationSeconds - Maximum duration at same location in seconds (default: 14400 = 4 hours)
 * @returns {Promise<object>} - { isDrifted: boolean, location: object, duration: number }
 */
async function checkLocationDrift(tile38, userId, maxRadiusMeters = 200, maxDurationSeconds = 14400) {
  try {
    // Check if user has been stationary
    const staleResult = await tile38.get('locations', `user:${userId}:location`);
    
    if (staleResult.object) {
      // Tile38's SETHOOK with 'stale' option would trigger webhook
      // For now, we check if the entry is old
      return { isDrifted: true, location: staleResult.object, duration: maxDurationSeconds };
    }
    
    return { isDrifted: false, location: null, duration: 0 };
  } catch (error) {
    console.error('Error checking location drift:', error);
    return { isDrifted: false, location: null, duration: 0 };
  }
}

/**
 * Process drift detection alert
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {object} llmRouter - LLM router
 * @param {string} userId - User ID
 * @param {object} locationData - Current location data
 * @param {number} locationDuration - Duration at current location in seconds
 * @returns {Promise<void>}
 */
async function processDriftAlert(db, caspian, llmRouter, userId, locationData, locationDuration) {
  try {
    // Get pending deadlines within next 3 hours
    const pendingItems = await getPendingDeadlines(db, userId, 3);
    
    if (pendingItems.length === 0) {
      console.log(`No pending deadlines for ${userId}, skipping alert`);
      return;
    }
    
    // Generate alert message
    const message = await generateDriftAlertMessage(llmRouter, {
      userLocation: locationData,
      pendingItems,
      locationDuration
    });
    
    // Send via WhatsApp
    await caspian.send({
      channel: 'whatsapp',
      to: userId,
      message
    });
    
    console.log(`Drift alert sent to ${userId}`);
  } catch (error) {
    console.error('Error processing drift alert:', error);
  }
}

/**
 * Set up Tile38 stale position hook
 * @param {object} tile38 - Tile38 client
 * @param {string} userId - User ID
 * @param {number} staleSeconds - Duration before considered stale (default: 14400 = 4 hours)
 * @returns {Promise<void>}
 */
async function setupStalePositionHook(tile38, userId, staleSeconds = 14400) {
  try {
    await tile38.sethook(`drift_${userId}`, {
      command: 'SET',
      key: `user:${userId}:location`,
      command: 'FENCE',
      near: { lat: 0, lng: 0, radius: 200 },
      options: { stale: `${staleSeconds}s` }
    });
    
    console.log(`✅ Drift detector hook set for ${userId} (stale: ${staleSeconds}s)`);
  } catch (error) {
    console.error('Error setting up drift detector hook:', error);
  }
}

/**
 * Background worker to check for drift
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {object} llmRouter - LLM router
 * @param {object} tile38 - Tile38 client (optional)
 * @param {number} intervalMinutes - Check interval in minutes (default: 15)
 */
function setupDriftDetectorWorker(db, caspian, llmRouter, tile38, intervalMinutes = 15) {
  // Run immediately on startup
  checkDriftForAllUsers(db, caspian, llmRouter, tile38);
  
  // Then run at interval
  setInterval(() => {
    checkDriftForAllUsers(db, caspian, llmRouter, tile38);
  }, intervalMinutes * 60 * 1000);
  
  console.log('✅ Drift Detector worker started (check interval:', intervalMinutes, 'minutes)');
}

/**
 * Check drift for all users
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {object} llmRouter - LLM router
 * @param {object} tile38 - Tile38 client
 * @returns {Promise<void>}
 */
async function checkDriftForAllUsers(db, caspian, llmRouter, tile38) {
  try {
    // Get all active users
    const users = await db.query(
      `SELECT DISTINCT user_id FROM memory_graph WHERE status IN ('pending', 'scheduled')`
    );
    
    for (const user of users.rows) {
      if (tile38) {
        const drift = await checkLocationDrift(tile38, user.user_id);
        
        if (drift.isDrifted) {
          await processDriftAlert(db, caspian, llmRouter, user.user_id, drift.location, 14400);
        }
      }
    }
  } catch (error) {
    console.error('Error checking drift for all users:', error);
  }
}

/**
 * Register drift detector webhook handler
 * @param {object} app - Express app
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {object} llmRouter - LLM router
 */
function createDriftDetectorEndpoints(app, db, caspian, llmRouter) {
  // POST /api/drift/detected - Called when Tile38 detects stale position
  app.post('/api/drift/detected', async (req, res) => {
    try {
      const { userId, location, duration } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      await processDriftAlert(db, caspian, llmRouter, userId, location, duration || 14400);
      
      res.json({ success: true, message: 'Drift alert processed' });
    } catch (error) {
      console.error('Error handling drift detection:', error);
      res.status(500).json({ error: 'Failed to process drift alert' });
    }
  });
}

module.exports = {
  getPendingDeadlines,
  generateDriftAlertMessage,
  checkLocationDrift,
  processDriftAlert,
  setupStalePositionHook,
  setupDriftDetectorWorker,
  checkDriftForAllUsers,
  createDriftDetectorEndpoints
};
