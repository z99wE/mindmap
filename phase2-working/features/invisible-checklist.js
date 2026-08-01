/**
 * Invisible Checklist - Phase 8 Feature
 * 
 * Detects store geofences and shows contextual task lists from memory graph
 * Uses Tile38 for geofence detection and OSM POI tags for store categorization
 */

/**
 * Store type mappings based on OSM POI tags
 */
const STORE_CATEGORIES = {
  supermarket: ['grocery', 'food'],
  grocery: ['grocery', 'food'],
  pharmacy: ['pharmacy', 'health'],
  chemist: ['pharmacy', 'health'],
  hardware: ['hardware', 'home'],
  gift_shop: ['gift', 'gifts'],
  present: ['gift', 'gifts'],
  restaurant: ['dining', 'food'],
  cafe: ['dining', 'food'],
  mall: ['shopping', 'retail'],
  store: ['retail', 'shopping']
};

/**
 * Detect store type from store name
 * @param {string} storeName - Name of the store
 * @returns {string} - Detected store category
 */
function detectStoreType(storeName) {
  if (!storeName) return 'general';
  
  const lowerName = storeName.toLowerCase();
  
  for (const [key, categories] of Object.entries(STORE_CATEGORIES)) {
    if (lowerName.includes(key)) {
      return categories[0];
    }
  }
  
  return 'general';
}

/**
 * Get pending items from memory graph for a store type
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {string} storeType - Detected store type
 * @param {number} limit - Max items to return (default: 10)
 * @returns {Promise<Array>} - Array of pending items
 */
async function getStoreChecklist(db, userId, storeType, limit = 10) {
  const result = await db.query(
    `SELECT id, content, requested_by, context_note, created_at 
     FROM memory_graph 
     WHERE user_id = $1 
       AND status IN ('pending', 'pending_clarification')
       AND (category = $2 OR category IS NULL)
     ORDER BY created_at DESC 
     LIMIT $3`,
    [userId, storeType, limit]
  );
  
  return result.rows;
}

/**
 * Format items as numbered checklist
 * @param {Array} items - Array of pending items
 * @returns {string} - Formatted checklist message
 */
function formatChecklist(items) {
  if (items.length === 0) return 'Your checklist is empty.';
  
  return items.map((item, i) => {
    let line = `${i + 1}. ${item.content}`;
    if (item.requested_by) {
      line += ` (asked by ${item.requested_by})`;
    }
    if (item.context_note) {
      line += ` - ${item.context_note}`;
    }
    return line;
  }).join('\n');
}

/**
 * Mark items as prompted to prevent duplicates
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {string} storeType - Store type
 * @returns {Promise<void>}
 */
async function markItemsAsPrompted(db, userId, storeType) {
  await db.query(
    `UPDATE memory_graph 
     SET status = 'prompted'
     WHERE user_id = $1 
       AND status IN ('pending', 'pending_clarification')
       AND (category = $2 OR category IS NULL)`,
    [userId, storeType]
  );
}

/**
 * Get recently prompted items (to avoid duplicates)
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {string} storeType - Store type
 * @param {number} hours - Lookback hours (default: 24)
 * @returns {Promise<Array>} - Array of recently prompted items
 */
async function getRecentlyPrompted(db, userId, storeType, hours = 24) {
  const result = await db.query(
    `SELECT content FROM memory_graph 
     WHERE user_id = $1 
       AND status = 'prompted'
       AND (category = $2 OR category IS NULL)
       AND created_at > NOW() - INTERVAL '${hours} hours'
     ORDER BY created_at DESC`,
    [userId, storeType]
  );
  
  return result.rows.map(row => row.content);
}

/**
 * Build contextual checklist message
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {string} storeType - Detected store type
 * @param {string} storeName - Name of the store
 * @returns {Promise<string>} - Formatted checklist message
 */
async function buildChecklistMessage(db, userId, storeType, storeName) {
  // Get pending items
  const items = await getStoreChecklist(db, userId, storeType);
  
  // Get recently prompted items to avoid duplicates
  const recentlyPrompted = await getRecentlyPrompted(db, userId, storeType);
  
  // Filter out recently prompted items
  const uniqueItems = items.filter(item => !recentlyPrompted.includes(item.content));
  
  if (uniqueItems.length === 0) {
    return `🔍 ${storeType.toUpperCase()} CHECKLIST\n\nNo pending items for ${storeName}.`;
  }
  
  // Format checklist
  const checklist = formatChecklist(uniqueItems);
  
  // Mark items as prompted
  await markItemsAsPrompted(db, userId, storeType);
  
  return `🔍 ${storeType.toUpperCase()} CHECKLIST\n\nStore: ${storeName}\n\n${checklist}\n\nMark items complete in Thought GPS after purchase.`;
}

/**
 * Handle geofence entry event
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {string} userId - User ID
 * @param {string} storeName - Name of the store entered
 * @returns {Promise<void>}
 */
async function handleGeofenceEntry(db, caspian, userId, storeName) {
  const storeType = detectStoreType(storeName);
  const message = await buildChecklistMessage(db, userId, storeType, storeName);
  
  await caspian.send({
    channel: 'whatsapp',
    to: userId,
    message
  });
  
  console.log(`Invisible checklist sent to ${userId} for ${storeName}`);
}

/**
 * Set up Tile38 geofence hooks for stores
 * @param {object} tile38 - Tile38 client
 * @param {string} hookName - Name for the geofence hook
 */
async function setupStoreGeofence(tile38, hookName = 'store_checklist') {
  try {
    // This would be configured with actual store coordinates
    // For now, returns setup function that can be called with coordinates
    return async (lat, lng, radius = 500, userId) => {
      await tile38.set('stores', `user:${userId}:current_store`, {
        type: 'Point',
        coordinates: [lng, lat]
      });
      
      await tile38.sethook(`${hookName}_${userId}`, {
        command: 'FENCE',
        key: 'stores',
        near: { lat, lng, radius: radius }
      });
    };
  } catch (error) {
    console.error('Error setting up store geofence:', error);
  }
}

/**
 * Register geofence entry webhook handler
 * @param {object} app - Express app
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 */
function createInvisibleChecklistEndpoints(app, db, caspian) {
  // POST /api/geofence/store-entry - Called when user enters a store geofence
  app.post('/api/geofence/store-entry', async (req, res) => {
    try {
      const { userId, storeName, storeLat, storeLng } = req.body;
      
      if (!userId || !storeName) {
        return res.status(400).json({ error: 'userId and storeName are required' });
      }
      
      await handleGeofenceEntry(db, caspian, userId, storeName);
      
      res.json({ success: true, message: 'Checklist sent' });
    } catch (error) {
      console.error('Error handling geofence entry:', error);
      res.status(500).json({ error: 'Failed to send checklist' });
    }
  });
}

module.exports = {
  detectStoreType,
  getStoreChecklist,
  formatChecklist,
  markItemsAsPrompted,
  getRecentlyPrompted,
  buildChecklistMessage,
  handleGeofenceEntry,
  setupStoreGeofence,
  createInvisibleChecklistEndpoints
};
