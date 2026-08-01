/**
 * Time Blindness Compensation Engine - Phase 8 Feature
 * 
 * Calculates travel time using OSRM and sends "leave now" alerts
 * Uses OpenStreetMap routing (free, no key)
 */

/**
 * Get travel duration from OSRM (self-hosted Docker container)
 * @param {number} startLat - Starting latitude
 * @param {number} startLng - Starting longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Promise<number>} - Travel duration in minutes
 */
async function getTravelDuration(startLat, startLng, destLat, destLng) {
  try {
    const response = await fetch('http://localhost:5000/route/v1/driving/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: [[parseFloat(startLng), parseFloat(startLat)], [parseFloat(destLng), parseFloat(destLat)]],
        annotations: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    const durationSeconds = data.routes?.[0]?.duration || 0;
    
    return Math.ceil(durationSeconds / 60); // Convert to minutes
  } catch (error) {
    console.error('Error getting travel duration:', error);
    return 0; // Default to 0 if OSRM unavailable
  }
}

/**
 * Get current user location from Tile38
 * @param {string} userId - User ID
 * @param {object} tile38 - Tile38 client
 * @returns {Promise<object>} - { lat, lng }
 */
async function getCurrentLocation(userId, tile38) {
  try {
    const result = await tile38.get('locations', `user:${userId}:location`);
    if (result.object) {
      const coords = JSON.parse(result.object);
      return { lat: coords.lat, lng: coords.lng };
    }
    return null;
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Set up Tile38 geofence for commitments
 * @param {object} tile38 - Tile38 client
 * @param {string} userId - User ID
 * @param {number} lat - Commitment location latitude
 * @param {number} lng - Commitment location longitude
 * @param {number} radiusMeters - Geofence radius in meters
 */
async function setupCommitmentGeofence(tile38, userId, lat, lng, radiusMeters = 500) {
  try {
    await tile38.set('commitments', `user:${userId}:commitment`, {
      type: 'Point',
      coordinates: [lng, lat]
    });
    
    await tile38.sethook(`time_blindness_${userId}`, {
      command: 'FENCE',
      key: 'commitments',
      near: { lat, lng, radius: radiusMeters },
      options: { stale: '1h' }
    });
  } catch (error) {
    console.error('Error setting up commitment geofence:', error);
  }
}

/**
 * Calculate departure time and send alert
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {object} tile38 - Tile38 client (optional, if null uses stored coords)
 * @param {number} bufferMinutes - Buffer time before departure (default: 15)
 */
async function checkAndAlertDeparture(db, caspian, tile38, bufferMinutes = 15) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const twoHoursFromNow = now + 7200; // 2 hours
    
    // Get all commitments scheduled in the next 2 hours
    const commitments = await db.query(
      `SELECT mg.id, mg.user_id, mg.content, mg.trigger_value, mg.trigger_type,
              mg.destination_coords, mg.deadline_epoch
       FROM memory_graph mg
       WHERE mg.status = 'scheduled'
         AND mg.deadline_epoch > $1
         AND mg.deadline_epoch <= $2`,
      [now, twoHoursFromNow]
    );
    
    for (const commit of commitments.rows) {
      let currentLocation = null;
      
      // Get current location if Tile38 available
      if (tile38) {
        currentLocation = await getCurrentLocation(commit.user_id, tile38);
      }
      
      if (!currentLocation && commit.destination_coords) {
        // Use stored coords as fallback
        currentLocation = {
          lat: commit.destination_coords[1],
          lng: commit.destination_coords[0]
        };
      }
      
      if (currentLocation && commit.destination_coords) {
        const travelTime = await getTravelDuration(
          currentLocation.lat,
          currentLocation.lng,
          commit.destination_coords[1],
          commit.destination_coords[0]
        );
        
        const totalTravelTime = travelTime + bufferMinutes;
        const departureTime = commit.deadline_epoch - (totalTravelTime * 60);
        
        if (now >= departureTime && now < commit.deadline_epoch) {
          // Calculate minutes until meeting
          const minutesUntil = Math.ceil((commit.deadline_epoch - now) / 60);
          
          // Format location from trigger_value
          const location = commit.trigger_value?.replace(/^(at|in)\s+/i, '') || 'the destination';
          
          await caspian.send({
            channel: 'whatsapp',
            to: commit.user_id,
            message: `⏰ LEAVE NOW\n\n${commit.content}\nLocation: ${location}\n\nYou have ${minutesUntil} minutes. Travel time: ~${travelTime} minutes.`
          });
          
          console.log(`Departure alert sent to ${commit.user_id} for ${commit.content}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking departures:', error);
  }
}

/**
 * Start background worker to check departures
 * @param {object} db - PostgreSQL pool
 * @param {object} caspian - Caspian SDK client
 * @param {object} tile38 - Tile38 client (optional)
 * @param {number} intervalMinutes - Check interval in minutes (default: 15)
 */
function setupTimeBlindnessWorker(db, caspian, tile38, intervalMinutes = 15) {
  // Run immediately on startup
  checkAndAlertDeparture(db, caspian, tile38);
  
  // Then run at interval
  setInterval(() => {
    checkAndAlertDeparture(db, caspian, tile38);
  }, intervalMinutes * 60 * 1000);
  
  console.log('✅ Time Blindness worker started (check interval:', intervalMinutes, 'minutes)');
}

/**
 * Store commitment with destination coordinates
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {string} content - Task content
 * @param {string} triggerValue - Time/location trigger
 * @param {number} deadlineEpoch - Unix timestamp of deadline
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Promise<object>} - Inserted commitment
 */
async function storeCommitment(db, userId, content, triggerValue, deadlineEpoch, destLat, destLng) {
  const result = await db.query(
    `INSERT INTO memory_graph (user_id, content, status, trigger_type, trigger_value, 
                                destination_coords, deadline_epoch, created_at)
     VALUES ($1, $2, 'scheduled', 'time_location', $3, 
             POINT($4, $5), $6, NOW())
     RETURNING *`,
    [userId, content, triggerValue, destLng, destLat, deadlineEpoch]
  );
  
  return result.rows[0];
}

module.exports = {
  getTravelDuration,
  getCurrentLocation,
  setupCommitmentGeofence,
  checkAndAlertDeparture,
  setupTimeBlindnessWorker,
  storeCommitment
};
