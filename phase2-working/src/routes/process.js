// Process Routes - Message processing pipeline with cognitive classifiers
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');
const { keyPool } = require('../key-pool');
const { createTrace, createSpan, endSpan } = require('../langfuse');
const { classifyHalfLife } = require('../../features/thought-half-life');
const { detectCommitment } = require('../../features/commitment-witness');
const { detectIntent, detectUnanchored, applyRevivalHours, scheduleRevival } = require('../../features/thought-interceptor');
const { liveInfoSystem } = require('../../agent-reach-integration');
const { getDecryptedKey } = require('./keys');

// POST /api/process/message - main thought processing endpoint
router.post('/message', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user.userId;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Check daily run limit
    const userRes = await pool.query(
      'SELECT daily_runs_used, daily_runs_limit, tier, api_keys, data_sharing FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.daily_runs_used >= user.daily_runs_limit) {
      return res.status(429).json({
        error: 'Daily run limit reached',
        limit: user.daily_runs_limit,
        used: user.daily_runs_used,
        tier: user.tier,
        upgradeUrl: '/credits',
      });
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

    // 3. Enrich with live data (if web search enabled)
    let liveContext = [];
    let sources = [];
    try {
      const userKeys = {};
      const byoKeys = user.api_keys || {};
      if (byoKeys.tavily?.key) userKeys.tavily = require('./keys').getDecryptedKey ? await getDecryptedKey(userId, 'tavily') : null;
      if (byoKeys.firecrawl?.key) userKeys.firecrawl = require('./keys').getDecryptedKey ? await getDecryptedKey(userId, 'firecrawl') : null;
      if (byoKeys.searxng_url?.key) userKeys.searxng_url = require('./keys').getDecryptedKey ? await getDecryptedKey(userId, 'searxng_url') : null;

      if (liveInfoSystem.needsWebSearch(message)) {
        const searchResult = await liveInfoSystem.searchPriority(message, userKeys);
        liveContext = searchResult.results || [];
        sources = liveContext.map(r => ({ title: r.title, url: r.url, source: r.source }));
      }
    } catch (e) {
      console.log('[Process] Live data enrichment failed:', e.message);
    }

    // 4. Process with LLM (only if data_sharing is enabled)
    const llmSpan = createSpan(trace, 'process_llm', { message, intent, liveContextCount: liveContext.length });
    let llmResponse = null;
    if (user.data_sharing !== false) {
      llmResponse = await callLLM(user, message, relatedMemories, intent, liveContext);
    } else {
      llmResponse = 'Your thought has been saved. LLM enrichment is disabled in your privacy settings.';
    }
    endSpan(llmSpan, { response: llmResponse?.substring(0, 200), dataSharing: user.data_sharing !== false });

    // 5. Run cognitive classifiers + store enriched memory
    const storeSpan = createSpan(trace, 'update_memory', { message });
    const classification = await storeMemoryEnriched(userId, message, intent, llmResponse, unanchoredResult, liveContext);
    endSpan(storeSpan, { stored: true, category: classification.category, halfLifeHours: classification.halfLifeHours });

    // Increment run counter
    await pool.query(
      'UPDATE users SET daily_runs_used = daily_runs_used + 1, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    const latency = Date.now() - startTime;
    res.json({
      response: llmResponse,
      intent,
      relatedMemories: relatedMemories.slice(0, 5),
      runsUsed: user.daily_runs_used + 1,
      runsRemaining: user.daily_runs_limit - user.daily_runs_used - 1,
      latency,
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
    console.error('[Process] Error:', err.message);
    res.status(500).json({ error: 'Processing failed: ' + err.message });
  }
});

// Run all classifiers and store enriched memory
async function storeMemoryEnriched(userId, message, intent, llmResponse, unanchoredResult, liveContext = []) {
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
    const result = await pool.query(
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
      scheduleRevival(
        userId,
        result.rows[0].id,
        message,
        unanchoredResult.auto_revival_hours || 12
      );
    }
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

// Call LLM using key pool
async function callLLM(user, message, relatedMemories, intent, liveContext = []) {
  const contextStr = relatedMemories.length > 0
    ? `\n\nRelated memories:\n${relatedMemories.map(m => `- ${m.content}`).join('\n')}`
    : '';
  const liveStr = liveContext.length > 0
    ? `\n\nLive web context:\n${liveContext.slice(0, 3).map(r => `- [${r.source}] ${r.content}`).join('\n')}`
    : '';

  const systemPrompt = `You are Thought GPS, a cognitive coprocessor for ADHD/neurodiverse users.
You help organize thoughts, track commitments, detect patterns, and navigate cognitive load.
Current intent: ${intent}.${contextStr}${liveStr}
Be concise, empathetic, and action-oriented. Format key items as bullet points.`;

  // Try BYO keys first (all tiers)
  const byoKeys = user.api_keys || {};
  for (const [provider, keyData] of Object.entries(byoKeys)) {
    if (keyData?.key) {
      try {
        return await callProvider(provider, keyData.key, systemPrompt, message);
      } catch (e) {
        console.log(`[LLM] BYO ${provider} failed: ${e.message}`);
      }
    }
  }

  // Free tier: require BYO keys, no shared pool
  if (user.tier === 'free') {
    return 'Your thought has been saved! To get AI-powered responses, add your API key (Groq is free) in Mission Control > API Keys. Your message is stored and will be enriched once a key is configured.';
  }

  // Pro/Managed: Fall back to shared pool as emergency backup
  const sharedKey = keyPool.getNextKey('groq') || keyPool.getNextKey('openai');
  if (!sharedKey) {
    return 'Your thought has been saved. LLM services are temporarily unavailable. Your message has been stored for later enrichment.';
  }

  try {
    return await callProvider(sharedKey.provider, sharedKey.key, systemPrompt, message);
  } catch (e) {
    if (e.message.includes('429') || e.message.includes('rate')) {
      keyPool.markCoolingDown(sharedKey.id);
      const nextKey = keyPool.getNextKey(sharedKey.provider);
      if (nextKey) {
        try {
          return await callProvider(nextKey.provider, nextKey.key, systemPrompt, message);
        } catch { /* fall through */ }
      }
    }
    return 'I captured your thought in memory. LLM processing is temporarily unavailable.';
  }
}

// Call a specific LLM provider
async function callProvider(provider, apiKey, systemPrompt, message) {
  const endpoints = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
  };
  const models = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
  };
  const endpoint = endpoints[provider];
  const model = models[provider];
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

module.exports = router;
