/**
 * AGENT PREFERENCES ROUTES — Personal Agent Fine-Tuning
 * 
 * Each user can configure how their personal agent behaves:
 * - Response style (concise, detailed, bullet points)
 * - Quiet hours (don't nudge after X)
 * - Nudge frequency
 * - Custom instructions
 * 
 * These preferences are injected into the LLM system prompt
 * during processing so the agent adapts to each user.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

// Default agent preferences
const DEFAULT_PREFERENCES = {
  response_style: 'concise',
  bullet_points: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  nudge_frequency: 'normal', // 'low' | 'normal' | 'high'
  custom_instructions: '',
  preferred_channel: null,
};

// GET /api/agent/preferences — get current user's agent preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT agent_preferences FROM users WHERE id = $1",
      [req.user.userId]
    );
    const prefs = { ...DEFAULT_PREFERENCES, ...(result.rows[0]?.agent_preferences || {}) };
    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agent/preferences — update agent preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    // Validate response_style if provided
    if (updates.response_style && !['concise', 'detailed', 'casual', 'formal'].includes(updates.response_style)) {
      return res.status(400).json({ error: 'Invalid response_style. Use: concise, detailed, casual, or formal' });
    }
    // Validate nudge_frequency if provided
    if (updates.nudge_frequency && !['low', 'normal', 'high'].includes(updates.nudge_frequency)) {
      return res.status(400).json({ error: 'Invalid nudge_frequency. Use: low, normal, or high' });
    }

    // Merge with existing preferences
    const existing = await pool.query(
      "SELECT agent_preferences FROM users WHERE id = $1",
      [req.user.userId]
    );
    const current = existing.rows[0]?.agent_preferences || {};
    const merged = { ...current, ...updates };

    await pool.query(
      'UPDATE users SET agent_preferences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(merged), req.user.userId]
    );

    res.json({ success: true, preferences: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Utility: Build agent instruction string from user preferences
function buildAgentInstructions(prefs) {
  const parts = [];
  const p = { ...DEFAULT_PREFERENCES, ...(prefs || {}) };

  if (p.response_style === 'concise') parts.push('Keep responses brief and to the point.');
  else if (p.response_style === 'detailed') parts.push('Provide thorough, detailed responses.');
  else if (p.response_style === 'casual') parts.push('Use a casual, friendly tone.');
  else if (p.response_style === 'formal') parts.push('Use a professional, formal tone.');

  if (p.bullet_points) parts.push('Use bullet points when listing items.');
  if (p.custom_instructions) parts.push(p.custom_instructions);

  return parts.join(' ');
}

// Utility: Check if nudges are allowed based on quiet hours
function areNudgesAllowed(prefs) {
  const p = { ...DEFAULT_PREFERENCES, ...(prefs || {}) };
  if (!p.quiet_hours_enabled) return true;
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  const start = p.quiet_hours_start.split(':').map(Number);
  const end = p.quiet_hours_end.split(':').map(Number);
  const current = hour * 60 + min;
  const startMin = start[0] * 60 + (start[1] || 0);
  const endMin = end[0] * 60 + (end[1] || 0);
  if (startMin <= endMin) {
    return current < startMin || current >= endMin;
  }
  return current >= endMin && current < startMin;
}

module.exports = router;
module.exports.buildAgentInstructions = buildAgentInstructions;
module.exports.areNudgesAllowed = areNudgesAllowed;
module.exports.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
