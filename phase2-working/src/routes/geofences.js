// Geofences Routes - CRUD for user geo-fences
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

// GET /api/geofences - list user's geofences
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT geofences FROM users WHERE id = $1', [req.user.userId]);
    const geofences = result.rows[0]?.geofences || [];
    res.json({ geofences });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/geofences - add a geofence
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, lat, lng, radius, trigger_type, linked_tasks } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'name, lat, and lng are required' });
    }

    const geofence = {
      id: `gf_${Date.now()}`,
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius) || 200,
      trigger_type: trigger_type || 'arrival',
      linked_tasks: Array.isArray(linked_tasks) ? linked_tasks : [],
      created_at: new Date().toISOString(),
    };

    const result = await pool.query('SELECT geofences FROM users WHERE id = $1', [req.user.userId]);
    const geofences = result.rows[0]?.geofences || [];
    geofences.push(geofence);

    await pool.query(
      'UPDATE users SET geofences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(geofences), req.user.userId]
    );

    res.json({ success: true, geofence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/geofences/:id - update a geofence
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT geofences FROM users WHERE id = $1', [req.user.userId]);
    const geofences = result.rows[0]?.geofences || [];
    const idx = geofences.findIndex(g => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Geofence not found' });

    const { name, lat, lng, radius, trigger_type, linked_tasks } = req.body;
    if (name !== undefined) geofences[idx].name = name;
    if (lat !== undefined) geofences[idx].lat = parseFloat(lat);
    if (lng !== undefined) geofences[idx].lng = parseFloat(lng);
    if (radius !== undefined) geofences[idx].radius = parseInt(radius);
    if (trigger_type !== undefined) geofences[idx].trigger_type = trigger_type;
    if (linked_tasks !== undefined) geofences[idx].linked_tasks = Array.isArray(linked_tasks) ? linked_tasks : [];

    await pool.query(
      'UPDATE users SET geofences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(geofences), req.user.userId]
    );

    res.json({ success: true, geofence: geofences[idx] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/geofences/:id - remove a geofence
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT geofences FROM users WHERE id = $1', [req.user.userId]);
    const geofences = (result.rows[0]?.geofences || []).filter(g => g.id !== req.params.id);

    await pool.query(
      'UPDATE users SET geofences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(geofences), req.user.userId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/geofences/check - check if user is inside any geofence (haversine)
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

    const result = await pool.query('SELECT geofences FROM users WHERE id = $1', [req.user.userId]);
    const geofences = result.rows[0]?.geofences || [];

    const inside = geofences.filter(g => {
      const dist = haversine(lat, lng, g.lat, g.lng);
      return dist <= g.radius;
    }).map(g => ({
      ...g,
      distance: Math.round(haversine(lat, lng, g.lat, g.lng)),
    }));

    res.json({ inside, total: geofences.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Haversine distance in meters
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
