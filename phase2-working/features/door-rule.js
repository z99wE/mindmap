/**
 * Door Rule - Phase 8 Feature
 * 
 * Fires departure brief when user leaves home
 * Shows max 3 time-sensitive pending tasks
 * Includes weather if relevant
 * Only fires on departure from home, never at other times
 */

/**
 * Get departure brief items
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {number} limit - Max items to return (default: 3)
 * @returns {Promise<Array>} - Array of departure items
 */
async function getDepartureItems(db, userId, limit = 3) {
  const result = await db.query(
    `SELECT content, deadline_epoch, trigger_value, emotional_weight_score
     FROM memory_graph 
     WHERE user_id = $1 
       AND status IN ('pending', 'pending_clarification', 'scheduled')
       AND deadline_epoch IS NOT NULL
       AND deadline_epoch > EXTRACT(EPOCH FROM NOW())
     ORDER BY 
       CASE WHEN emotional_weight_score >= 4 THEN 0 ELSE 1 END,
       deadline_epoch ASC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows;
}

/**
 * Get weather from Open-Meteo (completely free, no key)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} - Weather data
 */
async function getWeatherFree(lat, lng) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
    );
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temperature: data.current_weather.temperature,
      temperatureUnit: '°F',
      isRaining: data.current_weather.weathercode >= 51,
      windSpeed: data.current_weather.windspeed
    };
  } catch (error) {
    console.error('Error getting weather:', error);
    return null;
  }
}

/**
 * Get home location for user
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} - { lat, lng } or null
 */
async function getHomeLocation(db, userId) {
  const result = await db.query(
    `SELECT home_location FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length > 0 && result.rows[0].home_location) {
    const [lng, lat] = result.rows[0].home_location;
    return { lat, lng };
  }
  
  return null;
}

/**
 * Format departure brief message
 * @param {Array} tasks - Array of pending tasks
 * @param {object|null} weather - Weather data or null
 * @returns {string} - Formatted message
 */
function formatDepartureBrief(tasks, weather) {
  const parts = [];

  // Time-based greeting (only before 10am)
  const hour = new Date().getHours();
  if (hour < 10) parts.push('Good morning');

  // Weather: add umbrella line if rain likely
  if (weather && (weather.isRaining || weather.rainProbability > 60)) {
    parts.push(`Carry an umbrella — ${weather.rainProbability || 'high'}% rain today`);
  }

  // Tasks
  if (tasks.length === 0) {
    parts.push('All clear. Have a good one.');
  } else {
    tasks.forEach((task, i) => {
      let line = `${i + 1}. ${task.content}`;
      if (task.trigger_value) line += ` — ${task.trigger_value}`;
      parts.push(line);
    });
  }

  // Hard deadline today
  const today = new Date();
  const todayTask = tasks.find(t => t.deadline_epoch && new Date(t.deadline_epoch * 1000).toDateString() === today.toDateString());
  if (todayTask && todayTask.deadline_epoch) {
    const dlTime = new Date(todayTask.deadline_epoch * 1000);
    parts.push(`${todayTask.content} by ${dlTime.getHours()}:${String(dlTime.getMinutes()).padStart(2,'0')}`);
  }

  return parts.join('\n');
}

/**
 * Handle home exit event
 * @param {object} db - PostgreSQL pool
 * @param {object} messenger - Caspian SDK client
 * @param {string} userId - User ID
 * @param {string} locationName - Name of current location
 * @returns {Promise<void>}
 */
async function handleHomeExit(db, messenger, userId, locationName) {
  // Dedup: check if last brief was sent within 6 hours
  try {
    const lastRes = await db.query(
      `SELECT last_departure_brief_sent_at FROM users WHERE id = $1`,
      [userId]
    );
    const lastSent = lastRes.rows[0]?.last_departure_brief_sent_at;
    if (lastSent) {
      const hoursSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 6) {
        console.log(`[Door Rule] Skipping — last brief sent ${hoursSince.toFixed(1)}h ago for ${userId}`);
        return;
      }
    }
  } catch { /* column may not exist yet, continue */ }

  // Get departure items
  const tasks = await getDepartureItems(db, userId, 3);

  // Get home location for weather
  const homeLocation = await getHomeLocation(db, userId);

  // Get weather if home location exists
  let weather = null;
  if (homeLocation) {
    weather = await getWeatherFree(homeLocation.lat, homeLocation.lng);
  }

  // Format and send message
  const message = formatDepartureBrief(tasks, weather);

  if (messenger) {
    await messenger.send({
      channel: 'whatsapp',
      to: userId,
      message
    });
  }

  // Update last departure brief timestamp
  try {
    await db.query(
      `UPDATE users SET last_departure_brief_sent_at = NOW() WHERE id = $1`,
      [userId]
    );
  } catch { /* column may not exist */ }

  console.log(`[Door Rule] Brief sent to ${userId} (location: ${locationName})`);
}

/**
 * Set up Tile38 geofence for home
 * @param {object} tile38 - Tile38 client
 * @param {string} userId - User ID
 * @param {number} lat - Home latitude
 * @param {number} lng - Home longitude
 * @param {number} radiusMeters - Geofence radius (default: 100)
 * @returns {Promise<void>}
 */
async function setupHomeGeofence(tile38, userId, lat, lng, radiusMeters = 100) {
  try {
    // Set user's home location in Tile38
    await tile38.set('locations', `user:${userId}:home`, {
      type: 'Point',
      coordinates: [lng, lat]
    });
    
    // Create geofence hook for home exit
    await tile38.sethook(`door_rule_${userId}`, {
      command: 'SET',
      key: 'locations',
      command: 'FENCE',
      near: { lat, lng, radius: radiusMeters }
    });
    
    console.log(`✅ Home geofence set for ${userId} (${radiusMeters}m radius)`);
  } catch (error) {
    console.error('Error setting up home geofence:', error);
  }
}

/**
 * Set up home location for user in database
 * @param {object} db - PostgreSQL pool
 * @param {string} userId - User ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<void>}
 */
async function setUserHomeLocation(db, userId, lat, lng) {
  await db.query(
    `UPDATE users SET home_location = POINT($1, $2) WHERE id = $3`,
    [lng, lat, userId]
  );
}

/**
 * Background worker to check for home exits
 * @param {object} db - PostgreSQL pool
 * @param {object} messenger - Caspian SDK client
 * @param {object} tile38 - Tile38 client (optional)
 * @param {number} intervalMinutes - Check interval (default: 5)
 */
function setupDoorRuleWorker(db, messenger, tile38, intervalMinutes = 5) {
  // Run immediately on startup
  checkHomeExits(db, messenger, tile38);
  
  // Then run at interval
  setInterval(() => {
    checkHomeExits(db, messenger, tile38);
  }, intervalMinutes * 60 * 1000);
  
  console.log('✅ Door Rule worker started (check interval:', intervalMinutes, 'minutes)');
}

/**
 * Check for home exits for all users
 * @param {object} db - PostgreSQL pool
 * @param {object} messenger - Caspian SDK client
 * @param {object} tile38 - Tile38 client (optional)
 * @returns {Promise<void>}
 */
async function checkHomeExits(db, messenger, tile38) {
  try {
    // Get all users with home location set
    const users = await db.query(
      `SELECT id, home_location FROM users WHERE home_location IS NOT NULL`
    );
    
    for (const user of users.rows) {
      if (tile38) {
        // Check if user is outside home geofence
        // This would be triggered by Tile38 webhook in production
        const currentLocation = await getCurrentLocation(tile38, user.id);
        
        if (currentLocation) {
          const [lng, lat] = currentLocation;
          const homeLng = user.home_location[0];
          const homeLat = user.home_location[1];
          
          // Check if user is more than 200m from home
          const distance = calculateDistance(lat, lng, homeLat, homeLng);
          
          if (distance > 200) {
            // User is away from home - could trigger door rule
            console.log(`User ${user.id} is ${distance}m from home`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking home exits:', error);
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Get current user location from Tile38
 * @param {object} tile38 - Tile38 client
 * @param {string} userId - User ID
 * @returns {Promise<Array|null>} - [lng, lat] or null
 */
async function getCurrentLocation(tile38, userId) {
  try {
    const result = await tile38.get('locations', `user:${userId}:location`);
    if (result.object) {
      const coords = JSON.parse(result.object);
      return [coords.lng, coords.lat];
    }
    return null;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Register door rule endpoints
 * @param {object} app - Express app
 * @param {object} db - PostgreSQL pool
 * @param {object} messenger - Caspian SDK client
 */
function createDoorRuleEndpoints(app, db, messenger) {
  // POST /api/door/set-home - Set user's home location
  app.post('/api/door/set-home', async (req, res) => {
    try {
      const { userId, lat, lng } = req.body;
      
      if (!userId || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'userId, lat, and lng are required' });
      }
      
      await setUserHomeLocation(db, userId, lat, lng);
      
      res.json({ success: true, message: 'Home location set' });
    } catch (error) {
      console.error('Error setting home location:', error);
      res.status(500).json({ error: 'Failed to set home location' });
    }
  });
  
  // POST /api/door/home-exit - Called when user exits home geofence
  app.post('/api/door/home-exit', async (req, res) => {
    try {
      const { userId, locationName } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      await handleHomeExit(db, messenger, userId, locationName);
      
      res.json({ success: true, message: 'Departure brief sent' });
    } catch (error) {
      console.error('Error handling home exit:', error);
      res.status(500).json({ error: 'Failed to send departure brief' });
    }
  });
  
  // GET /api/door/departure-items/:userId - Get departure items for user
  app.get('/api/door/departure-items/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const tasks = await getDepartureItems(db, userId, 3);
      
      const homeLocation = await getHomeLocation(db, userId);
      let weather = null;
      if (homeLocation) {
        weather = await getWeatherFree(homeLocation.lat, homeLocation.lng);
      }
      
      res.json({
        success: true,
        tasks,
        weather,
        formatted: formatDepartureBrief(tasks, weather)
      });
    } catch (error) {
      console.error('Error getting departure items:', error);
      res.status(500).json({ error: 'Failed to get departure items' });
    }
  });
}

module.exports = {
  getDepartureItems,
  getWeatherFree,
  getHomeLocation,
  formatDepartureBrief,
  handleHomeExit,
  setupHomeGeofence,
  setUserHomeLocation,
  setupDoorRuleWorker,
  checkHomeExits,
  calculateDistance,
  getCurrentLocation,
  createDoorRuleEndpoints
};
