// Location Routes - Manual location update + time blindness
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

// POST /api/location/update - update user's current location
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, label } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng are required' });
    await pool.query(
      'UPDATE users SET location = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify({ lat, lng, label: label || null, updatedAt: new Date().toISOString() }), req.user.userId]
    );
    res.json({ success: true, location: { lat, lng, label } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/location - get user's current location
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.userId]);
    res.json({ location: result.rows[0]?.location || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/location/travel-time - estimate travel time (OSRM fallback)
router.get('/travel-time', authMiddleware, async (req, res) => {
  try {
    const { destLat, destLng } = req.query;
    if (!destLat || !destLng) return res.status(400).json({ error: 'destLat and destLng required' });

    const userRes = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.userId]);
    const loc = userRes.rows[0]?.location;
    if (!loc?.lat || !loc?.lng) {
      return res.json({ travelTime: null, message: 'Set your current location first' });
    }

    // Try OSRM (free routing API)
    try {
      const osrmRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${loc.lng},${loc.lat};${destLng},${destLat}?overview=false`
      );
      if (osrmRes.ok) {
        const data = await osrmRes.json();
        const route = data.routes?.[0];
        if (route) {
          return res.json({
            travelTime: Math.round(route.duration / 60), // minutes
            distance: Math.round(route.distance / 1000), // km
            source: 'osrm',
          });
        }
      }
    } catch { /* OSRM optional */ }

    // Fallback: Haversine distance + rough estimate
    const R = 6371;
    const dLat = (destLat - loc.lat) * Math.PI / 180;
    const dLng = (destLng - loc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(loc.lat*Math.PI/180) * Math.cos(destLat*Math.PI/180) * Math.sin(dLng/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    res.json({
      travelTime: Math.round(dist / 0.5 * 60 / 60), // rough: 30km/h avg
      distance: Math.round(dist),
      source: 'estimate',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
