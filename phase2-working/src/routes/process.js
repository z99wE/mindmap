// Process Routes - Message processing pipeline with cognitive classifiers
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { keyPool } = require('../key-pool');
const { createTrace, createSpan, endSpan } = require('../thought-tracer');
const { classifyHalfLife } = require('../../features/thought-half-life');
const { detectCommitment } = require('../../features/commitment-witness');
const { detectIntent, detectUnanchored, applyRevivalHours, scheduleRevival } = require('../../features/thought-interceptor');
const { liveInfoSystem } = require('../../agent-reach-integration');
const { callLLM } = require('../llm-provider');
const rateLimit = require('express-rate-limit');

// Abuse filter to prevent API key and LLM spam/leakage
const processLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Limit each IP to 15 requests per minute
  message: { error: 'Too many requests. Please wait a minute before sending more thoughts.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/process/message - main thought processing endpoint
router.post('/message', authMiddleware, processLimiter, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const userId = req.user.userId;
    const { message, localMemories, attachment } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Check daily run limit
    const userRes = await client.query(
      'SELECT daily_runs_used, daily_runs_limit, tier, api_keys, data_sharing FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    let usingBooster = false;
    let activeBoosterId = null;

    if (user.daily_runs_used >= user.daily_runs_limit) {
      // Fallback check: do they have unexpired booster top-up runs?
      const boosterRes = await client.query(
        `SELECT id, total_runs, runs_used FROM user_boosters 
         WHERE user_id = $1 AND expires_at > NOW() AND runs_used < total_runs 
         ORDER BY expires_at LIMIT 1`,
        [userId]
      );
      if (boosterRes.rows.length > 0) {
        usingBooster = true;
        activeBoosterId = boosterRes.rows[0].id;
      } else {
        return res.status(429).json({
          error: 'Daily run limit reached',
          limit: user.daily_runs_limit,
          used: user.daily_runs_used,
          tier: user.tier,
          upgradeUrl: '/credits',
          isEligibleForBooster: user.tier !== 'free',
        });
      }
    }

    // Langfuse trace
    const trace = createTrace(userId, null, message);

    // 1. Parse input - run Thought Interceptor FIRST
    const parseSpan = createSpan(trace, 'parse_input', { message });
    const intent = classifyIntent(message);
    const intentContent = detectIntent(message);
    let unanchoredResult = null;
    if (intentContent) {
      unanchoredResult = detectUnanchored(message, intentContent);
      // Apply urgency-based revival hours after half-life classification
    }
    endSpan(parseSpan, { intent: intent, unanchored: unanchoredResult?.is_unanchored });

    // 2. Check memory for related context
    const memSpan = createSpan(trace, 'check_memory', { message });
    const relatedMemories = await searchRelatedMemories(userId, message);
    endSpan(memSpan, { count: relatedMemories.length });

    // 3. Enrich with live data (if web search enabled). The Key Router builds
    // the full ordered chain (every Tavily key → Firecrawl → SearXNG → keyless
    // DuckDuckGo/Wikipedia) and handles cooldowns automatically.
    let liveContext = [];
    let sources = [];
    try {
      if (liveInfoSystem.needsWebSearch(message)) {
        const searchResult = await liveInfoSystem.searchPriority(message, user);
        liveContext = searchResult.results || [];
        sources = liveContext.map(r => ({ title: r.title, url: r.url, source: r.source }));
      }
    } catch (e) {
      console.log('[Process] Live data enrichment failed:', e.message);
    }

    // 4. Process with LLM (only if data_sharing is enabled)
    let finalMessage = message;
    if (attachment && user.tier !== 'free') {
      if (attachment.type?.startsWith('image/')) {
        finalMessage += `\n\n[Attached Image: ${attachment.name}]`;
      } else {
        const snippet = attachment.content?.substring(0, 15000);
        finalMessage += `\n\n[Attached File Content "${attachment.name}"]: ${snippet}`;
      }
    }

    const llmSpan = createSpan(trace, 'process_llm', { message: finalMessage, intent, liveContextCount: liveContext.length });
    let llmResponse = null;
    if (user.data_sharing !== false) {
      llmResponse = await callLLM(user, finalMessage, relatedMemories, intent, liveContext, Array.isArray(localMemories) ? localMemories : []);
    } else {
      llmResponse = 'Your thought has been saved. LLM enrichment is disabled in your privacy settings.';
    }
    endSpan(llmSpan, { response: llmResponse?.substring(0, 200), dataSharing: user.data_sharing !== false });

    // 5. Run cognitive classifiers + store enriched memory
    const storeSpan = createSpan(trace, 'update_memory', { message });
    // Pass client down so it uses the transaction
    const classification = await storeMemoryEnriched(client, userId, message, intent, llmResponse, unanchoredResult, liveContext);
    if (classification.memoryId) {
      trace.updateThoughtId(classification.memoryId);
    }
    endSpan(storeSpan, { stored: true, category: classification.category, halfLifeHours: classification.halfLifeHours });

    // Increment run counter
    if (usingBooster && activeBoosterId) {
      await client.query(
        'UPDATE user_boosters SET runs_used = runs_used + 1 WHERE id = $1',
        [activeBoosterId]
      );
    } else {
      await client.query(
        'UPDATE users SET daily_runs_used = daily_runs_used + 1, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    }

    await client.query('COMMIT'); // Success! Commit transaction (debts run)

    const latency = Date.now() - startTime;
    
    let runsRemaining = Math.max(0, user.daily_runs_limit - user.daily_runs_used - (usingBooster ? 0 : 1));
    if (usingBooster) {
      const bLeft = await client.query(
        'SELECT SUM(total_runs - runs_used) as left FROM user_boosters WHERE user_id = $1 AND expires_at > NOW()',
        [userId]
      );
      runsRemaining = parseInt(bLeft.rows[0]?.left || '0');
    }

    res.json({
      response: llmResponse,
      intent,
      relatedMemories: relatedMemories.slice(0, 5),
      runsUsed: usingBooster ? (user.daily_runs_limit + 1) : (user.daily_runs_used + 1),
      runsRemaining,
      latency,
      usingBooster,
      // Classification metadata for frontend display
      classification: {
        halfLifeHours: classification.halfLifeHours,
        urgencyTier: classification.urgencyTier,
        category: classification.category,
        actionVerb: classification.actionVerb,
        isActionable: classification.isActionable,
        expiresAt: classification.expiresAt,
      },
      // Commitment detection result
      commitment: classification.commitment || null,
      // Unanchored intention result
      unanchored: unanchoredResult?.is_unanchored ? unanchoredResult : null,
      // Live data sources used
      sources: sources.length > 0 ? sources.slice(0, 5) : undefined,
    });
  } catch (err) {
    await client.query('ROLLBACK'); // LLM failed, rollback memory and run deduction
    throw err; // Pass to globalErrorHandler to mask
  } finally {
    client.release();
  }
}));

// Run all classifiers and store enriched memory
async function storeMemoryEnriched(client, userId, message, intent, llmResponse, unanchoredResult, liveContext = []) {
  // Half-life classifier
  const halfLife = classifyHalfLife(message);

  // Compute expires_at
  const expiresAt = new Date(Date.now() + halfLife.half_life_hours * 60 * 60 * 1000).toISOString();

  // Commitment classifier
  const commitment = detectCommitment(message);

  // If interceptor found unanchored intent, apply revival hours based on urgency
  if (unanchoredResult?.is_unanchored) {
    applyRevivalHours(unanchoredResult, halfLife.urgency_tier);
  }

  // Determine status
  let status = 'pending';
  if (unanchoredResult?.is_unanchored) status = 'pending_clarification';

  try {
    const result = await client.query(
      `INSERT INTO memory_graph (
        user_id, content, category, source,
        intent, llm_response, importance,
        half_life_hours, urgency_tier, action_verb, is_actionable, expires_at, status,
        witness_contact, metadata
       ) VALUES (
        $1, $2, $3, 'user',
        $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14
       )
       RETURNING id`,
      [
        userId,
        message,
        halfLife.category,
        intent,
        llmResponse?.slice(0, 1000) || null,
        0.5,
        halfLife.half_life_hours,
        halfLife.urgency_tier,
        halfLife.action_verb,
        halfLife.is_actionable,
        expiresAt,
        status,
        commitment?.ask_for_witness ? null : null, // witness set later via endpoint
        liveContext.length > 0 ? JSON.stringify({ sources: liveContext.slice(0, 3).map(r => ({ title: r.title, url: r.url, source: r.source })) }) : '{}',
      ]
    );

    // Schedule revival if unanchored
    if (unanchoredResult?.is_unanchored && result.rows[0]?.id) {
      await scheduleRevival(
        client,
        userId,
        result.rows[0].id,
        message,
        unanchoredResult.auto_revival_hours || 12
      );
    }
    
    return {
      memoryId: result.rows[0]?.id,
      halfLifeHours: halfLife.half_life_hours,
      urgencyTier: halfLife.urgency_tier,
      category: halfLife.category,
      actionVerb: halfLife.action_verb,
      isActionable: halfLife.is_actionable,
      expiresAt,
      commitment: commitment?.is_commitment ? commitment : null,
    };
  } catch (err) {
    console.error('[Store] Memory insert error:', err.message);
  }

  return {
    halfLifeHours: halfLife.half_life_hours,
    urgencyTier: halfLife.urgency_tier,
    category: halfLife.category,
    actionVerb: halfLife.action_verb,
    isActionable: halfLife.is_actionable,
    expiresAt,
    commitment: commitment?.is_commitment ? commitment : null,
  };
}

// Simple intent classification (keyword-based)
function classifyIntent(message) {
  const msg = message.toLowerCase();
  if (msg.includes('remember') || msg.includes('note') || msg.includes('save')) return 'memory';
  if (msg.includes('remind') || msg.includes('deadline') || msg.includes('due')) return 'commitment';
  if (msg.includes('help') || msg.includes('how') || msg.includes('what')) return 'question';
  if (msg.includes('idea') || msg.includes('think') || msg.includes('wonder')) return 'thought';
  if (msg.includes('plan') || msg.includes('schedule') || msg.includes('tomorrow')) return 'planning';
  return 'general';
}

// Search related memories using text similarity
async function searchRelatedMemories(userId, message) {
  try {
    const keywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (keywords.length === 0) return [];
    const conditions = keywords.map((_, i) => `content ILIKE $${i + 3}`).join(' OR ');
    const params = [userId, ...keywords.map(k => `%${k}%`)];
    const result = await pool.query(
      `SELECT id, content, category, importance FROM memory_graph
       WHERE user_id = $1 AND (${conditions})
       ORDER BY importance DESC LIMIT 10`,
      params
    );
    return result.rows;
  } catch {
    return [];
  }
}



module.exports = router;
