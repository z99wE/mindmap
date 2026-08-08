// Features Routes - All cognitive feature endpoints
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { getPendingClarifications, clearClarification } = require('../../features/thought-interceptor');

// GET /api/features/half-life - thoughts with decay status
router.get('/half-life', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, category, half_life_hours, urgency_tier,
              action_verb, is_actionable, expires_at, notified_tier, status, archived,
              created_at
       FROM memory_graph
       WHERE user_id = $1 AND half_life_hours IS NOT NULL
       ORDER BY
         CASE urgency_tier WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         expires_at ASC NULLS LAST`,
      [req.user.userId]
    );
    const now = new Date();
    const thoughts = result.rows.map(r => {
      const hoursRemaining = r.expires_at
        ? Math.round(((new Date(r.expires_at) - now) / 3600000) * 10) / 10
        : null;
      return {
        id: r.id,
        content: r.value || r.attribute,
        halfLifeHours: r.half_life_hours,
        urgencyTier: r.urgency_tier,
        hoursRemaining,
        notifiedTier: r.notified_tier || 0,
        category: r.category,
        actionVerb: r.action_verb,
        isActionable: r.is_actionable,
        expiresAt: r.expires_at,
        archived: r.archived,
        status: r.archived ? 'archived'
              : hoursRemaining !== null && hoursRemaining < 0 ? 'expired'
              : (r.notified_tier || 0) >= 2 ? 'escalated'
              : hoursRemaining !== null && hoursRemaining < 2 ? 'expiring_soon'
              : 'active',
      };
    });
    const stats = {
      total: thoughts.length,
      active: thoughts.filter(t => t.status === 'active').length,
      expiringSoon: thoughts.filter(t => t.status === 'expiring_soon').length,
      expired: thoughts.filter(t => t.status === 'expired').length,
      escalated: thoughts.filter(t => t.status === 'escalated').length,
      archived: thoughts.filter(t => t.status === 'archived').length,
    };
    res.json({ thoughts, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/commitments - active commitments
router.get('/commitments', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, category, expires_at, witness_contact, witness_notified,
              status, created_at
       FROM memory_graph
       WHERE user_id = $1
         AND (category = 'commitment' OR attribute LIKE 'commitment%')
       ORDER BY expires_at ASC NULLS LAST`,
      [req.user.userId]
    );
    const now = new Date();
    const commitments = result.rows.map(r => {
      const daysUntil = r.expires_at
        ? Math.ceil((new Date(r.expires_at) - now) / 86400000)
        : null;
      return {
        id: r.id,
        content: r.value || r.attribute,
        deadline: r.expires_at,
        witness_contact: r.witness_contact,
        witness_notified: r.witness_notified,
        status: r.status,
        isOverdue: daysUntil !== null && daysUntil < 0 && r.status !== 'completed',
        daysUntil,
        category: r.category,
      };
    });
    res.json({
      commitments,
      stats: {
        total: commitments.length,
        active: commitments.filter(c => c.status !== 'completed').length,
        overdue: commitments.filter(c => c.isOverdue).length,
        withWitness: commitments.filter(c => c.witness_contact).length,
        fulfilled: commitments.filter(c => c.status === 'completed').length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/commitments/:id/fulfill - mark commitment as done
router.post('/commitments/:id/fulfill', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE memory_graph SET status = 'completed', archived = true WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/commitments/:id/witness - set witness contact
router.post('/commitments/:id/witness', authMiddleware, async (req, res) => {
  try {
    const { witnessContact } = req.body;
    await pool.query(
      'UPDATE memory_graph SET witness_contact = $1 WHERE id = $2 AND user_id = $3',
      [witnessContact, req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/archaeology - weekly regret ledger
router.get('/archaeology', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, category, half_life_hours, urgency_tier,
              expires_at, status, archived, created_at
       FROM memory_graph
       WHERE user_id = $1
         AND status = 'pending'
         AND expires_at < NOW()
         AND archived = false
       ORDER BY expires_at DESC`,
      [req.user.userId]
    );

    // Group by category
    const grouped = {};
    result.rows.forEach(r => {
      const cat = r.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: r.id,
        content: r.value || r.attribute,
        expiresAt: r.expires_at,
        urgencyTier: r.urgency_tier,
      });
    });

    const categoryBreakdown = Object.entries(grouped).map(([cat, items]) => ({
      category: cat,
      count: items.length,
      items,
    }));

    // Find the one worth revisiting (closest to real consequence)
    const topThought = result.rows.find(r => r.urgency_tier === 'critical' || r.urgency_tier === 'high')
      || result.rows[0];

    res.json({
      expired: result.rows.map(r => ({
        id: r.id,
        content: r.value || r.attribute,
        category: r.category,
        expiresAt: r.expires_at,
        urgencyTier: r.urgency_tier,
      })),
      categoryBreakdown,
      topThought: topThought ? {
        id: topThought.id,
        content: topThought.value || topThought.attribute,
        category: topThought.category,
      } : null,
      stats: {
        totalExpired: result.rows.length,
        categories: Object.keys(grouped).length,
        archivedCount: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/archaeology/show-me - list all expired unarchived thoughts
router.post('/archaeology/show-me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, category, urgency_tier, expires_at, created_at
       FROM memory_graph
       WHERE user_id = $1
         AND status = 'pending'
         AND expires_at < NOW()
         AND archived = false
       ORDER BY expires_at ASC`,
      [req.user.userId]
    );
    res.json({
      thoughts: result.rows.map(r => ({
        id: r.id,
        content: r.value || r.attribute,
        category: r.category,
        urgencyTier: r.urgency_tier,
        expiredAt: r.expires_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/archaeology/clear - archive expired thoughts
router.post('/archaeology/clear', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE memory_graph SET archived = true, status = 'archived'
       WHERE user_id = $1
         AND status = 'pending'
         AND expires_at < NOW()
         AND archived = false`,
      [req.user.userId]
    );
    res.json({ success: true, archivedCount: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/interceptor/status - pending clarifications
router.get('/interceptor/status', authMiddleware, async (req, res) => {
  try {
    const pending = await getPendingClarifications(pool, req.user.userId);
    // Also query DB for pending_clarification thoughts
    const dbResult = await pool.query(
      `SELECT id, value, attribute, category, created_at
       FROM memory_graph
       WHERE user_id = $1 AND status = 'pending_clarification'
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json({
      pendingClarifications: pending,
      pendingThoughts: dbResult.rows.map(r => ({
        id: r.id,
        content: r.value || r.attribute,
        category: r.category,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/features/interceptor/clarify - respond to clarification
router.post('/interceptor/clarify', authMiddleware, async (req, res) => {
  try {
    const { thoughtId, response } = req.body;
    if (!thoughtId || !response) {
      return res.status(400).json({ error: 'thoughtId and response are required' });
    }

    // Update the thought in DB with the clarification
    await pool.query(
      "UPDATE memory_graph SET status = 'pending', context_note = COALESCE(context_note, '') || ' Clarification: ' || $1 WHERE id = $2 AND user_id = $3",
      [response, thoughtId, req.user.userId]
    );

    // Clear from durable revival queue
    await clearClarification(pool, req.user.userId, thoughtId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/brain - brain area distribution
router.get('/brain', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category as brain_area, COUNT(*) as count,
              AVG(importance) as avg_importance
       FROM memory_graph
       WHERE user_id = $1
       GROUP BY category
       ORDER BY count DESC`,
      [req.user.userId]
    );
    const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const areas = result.rows.map(r => ({
      area: r.brain_area,
      count: parseInt(r.count),
      percentage: total > 0 ? Math.round(parseInt(r.count) / total * 100) : 0,
      avgImportance: parseFloat(r.avg_importance)?.toFixed(2),
    }));
    const defaultAreas = ['health', 'finance', 'work', 'personal', 'errand'];
    if (areas.length === 0) {
      defaultAreas.forEach(a => areas.push({ area: a, count: 0, percentage: 0, avgImportance: '0.00' }));
    }
    res.json({ areas, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/cognitive-load - cognitive load distribution
router.get('/cognitive-load', authMiddleware, async (req, res) => {
  try {
    const [loadRes, toneRes, trendRes] = await Promise.all([
      pool.query('SELECT urgency_tier as cognitive_load, COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND urgency_tier IS NOT NULL GROUP BY urgency_tier ORDER BY count DESC', [req.user.userId]),
      pool.query('SELECT emotional_tone, COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND emotional_tone IS NOT NULL GROUP BY emotional_tone ORDER BY count DESC LIMIT 10', [req.user.userId]),
      pool.query("SELECT DATE(created_at) as date, COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND created_at > NOW() - INTERVAL '14 days' GROUP BY DATE(created_at) ORDER BY date ASC", [req.user.userId]),
    ]);
    const total = loadRes.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    res.json({
      distribution: loadRes.rows.map(r => ({
        type: r.cognitive_load,
        count: parseInt(r.count),
        percentage: total > 0 ? Math.round(parseInt(r.count) / total * 100) : 0,
      })),
      emotionalTones: toneRes.rows.map(r => ({
        tone: r.emotional_tone,
        count: parseInt(r.count),
      })),
      trend: trendRes.rows.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
        count: parseInt(r.count),
      })),
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/door-rule - departure brief
router.get('/door-rule', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, category, expires_at, urgency_tier
       FROM memory_graph
       WHERE user_id = $1
         AND status = 'pending'
         AND archived = false
       ORDER BY expires_at ASC NULLS LAST LIMIT 3`,
      [req.user.userId]
    );
    // Weather from Open-Meteo (free API)
    let weather = null;
    try {
      const userRes = await pool.query('SELECT location FROM users WHERE id = $1', [req.user.userId]);
      const loc = userRes.rows[0]?.location;
      if (loc?.lat && loc?.lng) {
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=precipitation_probability,temperature_2m,weather_code&timezone=auto`);
        if (wRes.ok) weather = await wRes.json();
      }
    } catch { /* weather is optional */ }

    res.json({
      items: result.rows.map(r => ({
        id: r.id,
        content: r.value || r.attribute,
        deadline: r.expires_at,
        category: r.category,
        urgencyTier: r.urgency_tier,
      })),
      weather: weather?.current ? {
        temp: weather.current.temperature_2m,
        code: weather.current.weather_code,
        rainProbability: weather.current.precipitation_probability,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/interceptor - urgency detection stats
router.get('/interceptor', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT urgency_tier, COUNT(*) as count
       FROM memory_graph
       WHERE user_id = $1 AND urgency_tier IS NOT NULL
       GROUP BY urgency_tier`,
      [req.user.userId]
    );
    const tiers = { critical: 0, high: 0, medium: 0, low: 0 };
    result.rows.forEach(r => { tiers[r.urgency_tier] = parseInt(r.count); });
    res.json({ tiers, total: Object.values(tiers).reduce((a, b) => a + b, 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/time-blindness - upcoming events + travel time
router.get('/time-blindness', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, category, expires_at, created_at
       FROM memory_graph
       WHERE user_id = $1
         AND status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at > NOW()
         AND expires_at < NOW() + INTERVAL '24 hours'
       ORDER BY expires_at ASC`,
      [req.user.userId]
    );
    const events = result.rows.map(r => ({
      id: r.id,
      content: r.value || r.attribute,
      deadline: r.expires_at,
      category: r.category,
      minutesUntil: Math.round((new Date(r.expires_at) - new Date()) / 60000),
    }));
    res.json({ events, total: events.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/classification/stats - classification distribution
router.get('/classification/stats', authMiddleware, async (req, res) => {
  try {
    const [loadRes, catRes] = await Promise.all([
      pool.query('SELECT urgency_tier, COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND urgency_tier IS NOT NULL GROUP BY urgency_tier', [req.user.userId]),
      pool.query('SELECT category, COUNT(*) as count FROM memory_graph WHERE user_id = $1 AND category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10', [req.user.userId]),
    ]);
    const totalLoad = loadRes.rows.reduce((s, r) => s + parseInt(r.count), 0);
    res.json({
      cognitiveLoad: loadRes.rows.map(r => ({ type: r.urgency_tier, count: parseInt(r.count), pct: totalLoad > 0 ? Math.round(parseInt(r.count) / totalLoad * 100) : 0 })),
      themes: catRes.rows.map(r => ({ theme: r.category, count: parseInt(r.count) })),
      total: totalLoad,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/relationships - tasks grouped by person
router.get('/relationships', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, value, attribute, requested_by, expires_at, status, created_at
       FROM memory_graph
       WHERE user_id = $1 AND requested_by IS NOT NULL
       ORDER BY requested_by, created_at DESC`,
      [req.user.userId]
    );
    const grouped = {};
    result.rows.forEach(r => {
      if (!grouped[r.requested_by]) grouped[r.requested_by] = [];
      grouped[r.requested_by].push({
        id: r.id,
        content: r.value || r.attribute,
        deadline: r.expires_at,
        status: r.status,
      });
    });
    res.json({
      relationships: Object.entries(grouped).map(([person, items]) => ({
        person,
        items,
        pendingCount: items.filter(i => i.status === 'pending').length,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/mind-map - thoughts grouped by theme with connections
router.get('/mind-map', authMiddleware, async (req, res) => {
  try {
    const { period, category, status } = req.query;
    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.userId];
    let paramIdx = 2;

    if (period === 'today') {
      whereClause += ` AND created_at > NOW() - INTERVAL '1 day'`;
    } else if (period === 'week') {
      whereClause += ` AND created_at > NOW() - INTERVAL '7 days'`;
    } else if (period === 'month') {
      whereClause += ` AND created_at > NOW() - INTERVAL '30 days'`;
    }
    if (category) {
      whereClause += ` AND category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }
    if (status === 'active') {
      whereClause += ` AND archived = false AND (expires_at IS NULL OR expires_at > NOW())`;
    } else if (status === 'expired') {
      whereClause += ` AND expires_at < NOW() AND archived = false`;
    }

    const result = await pool.query(
      `SELECT id, content, value, attribute, category, theme, urgency_tier,
              half_life_hours, expires_at, status, created_at, related_person,
              emotional_tone, brain_area
       FROM memory_graph
       ${whereClause}
       ORDER BY created_at DESC LIMIT 200`,
      params
    );

    const thoughts = result.rows.map(r => ({
      id: r.id,
      content: r.content || r.value || r.attribute,
      category: r.category || 'general',
      theme: r.theme || r.category || 'general',
      urgencyTier: r.urgency_tier,
      halfLifeHours: r.half_life_hours,
      expiresAt: r.expires_at,
      status: r.status,
      relatedPerson: r.related_person,
      emotionalTone: r.emotional_tone,
      brainArea: r.brain_area,
      createdAt: r.created_at,
    }));

    // Group by theme
    const themes = {};
    thoughts.forEach(t => {
      const key = t.theme || t.category;
      if (!themes[key]) themes[key] = { theme: key, thoughts: [], count: 0 };
      themes[key].thoughts.push(t);
      themes[key].count++;
    });

    // Build connections (thoughts sharing theme, person, or category)
    const connections = [];
    const themeKeys = Object.keys(themes);
    themeKeys.forEach(theme => {
      const group = themes[theme];
      if (group.thoughts.length > 1) {
        for (let i = 0; i < Math.min(group.thoughts.length, 5); i++) {
          for (let j = i + 1; j < Math.min(group.thoughts.length, 5); j++) {
            connections.push({ from: group.thoughts[i].id, to: group.thoughts[j].id, type: 'theme', label: theme });
          }
        }
      }
    });

    // Summary stats
    const urgent = thoughts.filter(t => t.urgencyTier === 'critical' || t.urgencyTier === 'high').length;
    const commitments = thoughts.filter(t => t.category === 'commitment').length;

    res.json({
      thoughts,
      themes: Object.values(themes),
      connections: connections.slice(0, 50),
      stats: {
        total: thoughts.length,
        themes: themeKeys.length,
        urgent,
        commitments,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/swarm-logs - Get real background task logs
router.get('/swarm-logs', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT action, resource_type, resource_id, created_at 
       FROM audit_log 
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.user.userId]
    );
    
    // Fallback if no logs exist yet
    if (result.rows.length === 0) {
      return res.json({
        logs: [
          { message: 'Scanning unanchored commitments...', agent: 'System', timestamp: new Date().toISOString() }
        ]
      });
    }

    const logs = result.rows.map(r => {
      let agent = 'NanoClaw-4';
      if (r.action.includes('ARCHIVE') || r.action.includes('EXPIRE')) agent = 'Hermes-3';
      if (r.action.includes('WAITLIST') || r.action.includes('BILLING')) agent = 'System';
      if (r.action.includes('IMPORT') || r.action.includes('EXPORT')) agent = 'OpenClaw-2';

      let msg = `${r.action} on ${r.resource_type}`;
      if (r.action === 'WAITLIST_SIGNUP') msg = `User added to waitlist: ${r.resource_id}`;
      else if (r.action === 'IMPORT_MEMORIES') msg = `Imported memories: ${r.resource_id}`;

      return {
        message: msg,
        agent,
        timestamp: r.created_at,
      };
    });

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/drift-status - Get true drift status based on urgency
router.get('/drift-status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT urgency_tier, COUNT(*) as count 
       FROM memory_graph 
       WHERE user_id = $1 AND status = 'pending'
       GROUP BY urgency_tier`,
      [req.user.userId]
    );

    let criticalCount = 0;
    let highCount = 0;
    result.rows.forEach(r => {
      if (r.urgency_tier === 'critical') criticalCount = parseInt(r.count);
      if (r.urgency_tier === 'high') highCount = parseInt(r.count);
    });

    const isHighRisk = (criticalCount + highCount) > 2;

    res.json({
      isHighRisk,
      prediction: isHighRisk ? '+28% (Severe)' : 'Stable',
      trend: isHighRisk 
        ? 'Critical load detected. Congestion spikes predicted for Tuesday. We suggest immediate task pruning or witness escalation.' 
        : 'Cognitive bandwidth is optimal. Your mental drift pattern is balanced. Keep capturing thoughts to maintain clarity.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/features/thought-vortex - Get memory nodes for vortex visualization
router.get('/thought-vortex', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, tags FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 300`,
      [req.user.userId]
    );

    const brandColors = [
      '#a3e635', '#ccff00', '#ffffff', '#94a3b8', '#38bdf8', '#f472b6', '#fbbf24', '#c084fc', '#f87171'
    ];

    // Seeded random function based on string
    const seededRandom = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
      return () => {
        hash = Math.imul(741103597, hash) + 1957655071 | 0;
        return (hash >>> 0) / 4294967296;
      };
    };

    const nodes = result.rows.map(row => {
      const tag = (row.tags && row.tags.length > 0) ? row.tags[0].toLowerCase() : 'casual_chat';
      const rng = seededRandom(tag);
      const nodeRng = seededRandom(row.id.toString());
      
      // Hash tag to an angle (hub)
      const baseAngle = rng() * Math.PI * 2;
      const colorIndex = Math.floor(rng() * brandColors.length);
      
      // Scatter point around hub
      const distance = 40 + (nodeRng() * 100); // 40 to 140 radius from center
      const angleOffset = (nodeRng() - 0.5) * 0.8; // jitter around the base angle
      
      const finalAngle = baseAngle + angleOffset;
      const x = Math.cos(finalAngle) * distance;
      const y = Math.sin(finalAngle) * distance;

      return {
        id: row.id,
        content: row.content.length > 60 ? row.content.substring(0, 60) + '...' : row.content,
        tag: tag,
        x: x,
        y: y,
        color: brandColors[colorIndex]
      };
    });

    res.json({ nodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
