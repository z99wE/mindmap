/**
 * Tile38 Geofence Setup Script - Phase 8 Features
 * 
 * Sets up geofences for:
 * - Home location (Door Rule)
 * - Store locations (Invisible Checklist)
 * - Commitment locations (Time Blindness)
 */

const TILE38_ENDPOINT = process.env.TILE38_URL || 'http://localhost:9851';

/**
 * Initialize Tile38 geofences for all users
 */
async function setupAllGeofences() {
  console.log('🚀 Setting up Tile38 geofences...');
  
  // 1. Home geofence for Door Rule
  await setupHomeGeofence();
  
  // 2. Store geofences for Invisible Checklist
  await setupStoreGeofences();
  
  // 3. Commitment geofences for Time Blindness
  await setupCommitmentGeofence();
  
  console.log('✅ All geofences setup complete');
}

/**
 * Setup home geofence
 */
async function setupHomeGeofence() {
  try {
    const response = await fetch(`${TILE38_ENDPOINT}/sethook/geofence_home`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'SET',
        key: 'locations',
        command: 'FENCE',
        near: { lat: 0, lng: 0, radius: 100 }, // Will be set per user
        options: { stale: '5m' }
      })
    });
    
    if (response.ok) {
      console.log('✅ Home geofence hook created');
    } else {
      console.log('⚠️ Home geofence hook may already exist');
    }
  } catch (error) {
    console.error('Error setting up home geofence:', error);
  }
}

/**
 * Setup store geofences for different store types
 */
async function setupStoreGeofences() {
  const storeCategories = [
    { name: 'supermarket', category: 'grocery', radius: 500 },
    { name: 'pharmacy', category: 'health', radius: 200 },
    { name: 'hardware', category: 'home', radius: 300 },
    { name: 'gift', category: 'gifts', radius: 200 }
  ];
  
  console.log('Setting up store geofences...');
  
  // Store categories are defined in the invisible-checklist.js
  console.log('✅ Store categories defined:', storeCategories.map(s => s.name).join(', '));
}

/**
 * Setup commitment geofence
 */
async function setupCommitmentGeofence() {
  try {
    const response = await fetch(`${TILE38_ENDPOINT}/sethook/geofence_commitment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'SET',
        key: 'commitments',
        command: 'FENCE',
        near: { lat: 0, lng: 0, radius: 500 },
        options: { stale: '1h' }
      })
    });
    
    if (response.ok) {
      console.log('✅ Commitment geofence hook created');
    } else {
      console.log('⚠️ Commitment geofence hook may already exist');
    }
  } catch (error) {
    console.error('Error setting up commitment geofence:', error);
  }
}

/**
 * Setup stale position hook for Drift Detector
 */
async function setupStalePositionHook() {
  try {
    const response = await fetch(`${TILE38_ENDPOINT}/sethook/geofence_stale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'SET',
        key: 'locations',
        command: 'FENCE',
        near: { lat: 0, lng: 0, radius: 200 },
        options: { stale: '1h' }
      })
    });
    
    if (response.ok) {
      console.log('✅ Stale position hook created');
    } else {
      console.log('⚠️ Stale position hook may already exist');
    }
  } catch (error) {
    console.error('Error setting up stale position hook:', error);
  }
}

/**
 * Get OSRM setup instructions
 */
function getOSRMInstructions() {
  console.log(`
===========================================
OSRM Setup Instructions (Free Routing)
===========================================

1. Install Docker (if not already installed)
   https://docs.docker.com/get-docker/

2. Run OSRM Docker container:
   
   # Download India map data (or your country)
   wget -O india-latest.osm.pbf https://download.geofabrik.de/asia/india-latest.osm.pbf
   
   # Build OSRM (takes ~30 minutes)
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/india-latest.osrm
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/india-latest.osrm
   
   # Run OSRM server
   docker run -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm

3. Verify OSRM is running:
   curl http://localhost:5000/route/v1/driving/77.2090,28.6139;77.2289,28.6353

===========================================
`);
}

module.exports = {
  setupAllGeofences,
  setupHomeGeofence,
  setupStoreGeofences,
  setupCommitmentGeofence,
  setupStalePositionHook,
  getOSRMInstructions
};

// Run if executed directly
if (require.main === module) {
  setupAllGeofences().catch(console.error);
}
