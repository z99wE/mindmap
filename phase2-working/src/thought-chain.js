/**
 * THOUGHT CHAIN DETECTION
 *
 * Detects when thoughts form logical sequences:
 * - "Write proposal" → "Send proposal" → "Follow up on proposal"
 * - "Buy groceries" → "Cook dinner" → "Clean kitchen"
 * - "Research competitors" → "Write analysis" → "Present to team"
 *
 * When a new thought arrives, the system:
 * 1. Checks if it's the NEXT step in an existing chain
 * 2. Checks if it's the START of a new chain
 * 3. Auto-suggests the next step based on common patterns
 * 4. Tracks chain completion rates
 *
 * Cost: $0 — embedding similarity + keyword extraction
 */

'use strict';

const { pool } = require('./db');

// ── Common Chain Patterns ──────────────────────────────────────────────────
// Pre-defined action sequences that users commonly follow
const COMMON_CHAINS = {
  'write': ['send', 'submit', 'share', 'publish', 'review', 'finalize'],
  'research': ['analyze', 'summarize', 'present', 'decide', 'act'],
  'buy': ['install', 'set up', 'configure', 'test', 'use'],
  'call': ['schedule', 'follow up', 'document', 'decide'],
  'plan': ['execute', 'delegate', 'track', 'review', 'complete'],
  'draft': ['review', 'revise', 'approve', 'send', 'publish'],
  'learn': ['practice', 'apply', 'teach', 'master'],
  'fix': ['test', 'verify', 'deploy', 'monitor'],
  'start': ['continue', 'finish', 'review', 'submit'],
  'create': ['test', 'deploy', 'document', 'share'],
};

// ── Chain Detection ────────────────────────────────────────────────────────

/**
 * Analyze a new thought and detect if it's part of a chain.
 * Returns chain info, suggestions, and similar past thoughts.
 */
async function detectChain(userId, thoughtContent, thoughtId) {
  // 1. Extract action verb and intent from the thought
  const analysis = analyzeThoughtIntent(thoughtContent);

  // 2. Find potentially related existing thoughts (using embeddings + keywords)
  const relatedThoughts = await findRelatedThoughts(userId, thoughtContent, thoughtId);

  // 3. Try to fit this thought into an existing chain
  const existingChain = findExistingChain(analysis, relatedThoughts);

  // 4. If it's part of a chain, suggest the next step
  const nextStep = existingChain ? suggestNextStep(existingChain, analysis) : null;

  // 5. If it's NOT part of a chain, check if it STARTS a new one
  const newChainPotential = !existingChain ? detectNewChainStart(analysis, relatedThoughts) : null;

  return {
    analysis,
    chain: existingChain,
    nextStep,
    newChainPotential,
    relatedThoughts: relatedThoughts.slice(0, 5),
  };
}

/**
 * Analyze a thought's intent: what action is being planned?
 */
function analyzeThoughtIntent(content) {
  const lower = content.toLowerCase();

  // Extract action verb (first verb-like word)
  const words = lower.split(/\s+/);
  let actionVerb = null;
  let intent = 'general';

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    for (const [verb, nextSteps] of Object.entries(COMMON_CHAINS)) {
      if (cleaned === verb || cleaned.startsWith(verb)) {
        actionVerb = verb;
        intent = 'actionable';
        break;
      }
    }
    if (actionVerb) break;
  }

  // Detect if it's a follow-up (has temporal markers)
  const isFollowUp = /\b(follow.?up|next.?step|then|after.?that|now.?do|next)\b/.test(lower);

  // Detect if it references something specific
  const hasReference = /\b(it|that|this|the|those)\b.*\b(from|mentioned|talked|said|wrote|sent)\b/.test(lower);

  // Detect completion words
  const isCompletion = /\b(done|finished|completed|submitted|sent|published|deployed)\b/.test(lower);

  return {
    actionVerb,
    intent,
    isFollowUp,
    hasReference,
    isCompletion,
    keywords: extractKeywords(content),
    wordCount: words.length,
  };
}

/**
 * Find thoughts that might be in the same chain.
 * Uses embedding similarity + keyword matching.
 */
async function findRelatedThoughts(userId, content, excludeId) {
  // Strategy 1: Keyword-based search (fast, works without embeddings)
  const keywords = extractKeywords(content);
  if (keywords.length === 0) return [];

  // Search for thoughts with overlapping keywords
  const keywordConditions = keywords.map((_, i) =>
    `LOWER(content) ILIKE $${i + 2}`
  ).join(' OR ');

  const keywordParams = keywords.map(kw => `%${kw}%`);

  try {
    const result = await pool.query(`
      SELECT id, content, category, status, urgency_tier, created_at,
             action_verb, expires_at
      FROM memory_graph
      WHERE user_id = $1
        ${excludeId ? `AND id != $${keywords.length + 3}` : ''}
        AND (${keywordConditions})
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId, ...keywordParams, ...(excludeId ? [excludeId] : [])]);

    // Score by relevance (keyword overlap + recency)
    const scored = result.rows.map(t => {
      const tKeywords = extractKeywords(t.content);
      const overlap = keywords.filter(k => tKeywords.includes(k)).length;
      const recency = (Date.now() - new Date(t.created_at).getTime()) / 86400000;
      const score = overlap * 2 - Math.min(recency, 30) * 0.1;
      return { ...t, relevanceScore: score, keywordOverlap: overlap };
    });

    return scored
      .filter(t => t.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (e) {
    return [];
  }
}

/**
 * Try to fit a thought into an existing chain based on related thoughts.
 */
function findExistingChain(analysis, relatedThoughts) {
  if (relatedThoughts.length === 0) return null;

  // Look for a chain pattern: thought A → thought B (current)
  for (const related of relatedThoughts) {
    const relatedAnalysis = analyzeThoughtIntent(related.content);

    // Check if current thought is a follow-up to related thought
    if (analysis.isFollowUp && relatedAnalysis.actionVerb) {
      // "follow up on [related thought's action]"
      return {
        chainId: related.id,
        chainStart: related,
        position: 'continuation',
        chainLength: 2,
      };
    }

    // Check if current thought continues a pattern
    if (relatedAnalysis.actionVerb && analysis.actionVerb) {
      const nextVerbs = COMMON_CHAINS[relatedAnalysis.actionVerb] || [];
      if (nextVerbs.some(v => analysis.actionVerb.startsWith(v) || v.startsWith(analysis.actionVerb))) {
        return {
          chainId: related.id,
          chainStart: related,
          position: 'next_step',
          chainLength: 2,
        };
      }
    }
  }

  return null;
}

/**
 * Suggest the next step in a chain.
 */
function suggestNextStep(chain, currentAnalysis) {
  const verb = currentAnalysis.actionVerb;
  if (!verb) return null;

  const nextVerbs = COMMON_CHAINS[verb] || [];
  if (nextVerbs.length === 0) return null;

  return {
    suggestions: nextVerbs.slice(0, 3),
    basedOn: verb,
    confidence: chain.chainLength >= 2 ? 'high' : 'medium',
  };
}

/**
 * Detect if a thought is the START of a potential new chain.
 */
function detectNewChainStart(analysis, relatedThoughts) {
  if (!analysis.actionVerb) return null;

  // Check if there are thoughts with the same action verb (recurring pattern)
  const sameVerbCount = relatedThoughts.filter(t => {
    const tAnalysis = analyzeThoughtIntent(t.content);
    return tAnalysis.actionVerb === analysis.actionVerb;
  }).length;

  if (sameVerbCount >= 2) {
    return {
      isChainStart: true,
      pattern: `${analysis.actionVerb} appears ${sameVerbCount + 1} times`,
      suggestion: `This looks like a recurring pattern. Consider creating a template for "${analysis.actionVerb}" chains.`,
    };
  }

  return null;
}

/**
 * Get all active chains for a user (thoughts that form sequences).
 */
async function getActiveChains(userId) {
  const result = await pool.query(`
    SELECT id, content, category, status, urgency_tier, created_at,
           action_verb, expires_at
    FROM memory_graph
    WHERE user_id = $1
      AND status IN ('pending', 'in_progress')
    ORDER BY created_at DESC
    LIMIT 100
  `, [userId]);

  const thoughts = result.rows;
  const chains = [];
  const used = new Set();

  // Group by action verb patterns
  for (const thought of thoughts) {
    if (used.has(thought.id)) continue;
    const analysis = analyzeThoughtIntent(thought.content);
    if (!analysis.actionVerb) continue;

    // Find all thoughts with related action verbs
    const chain = [thought];
    used.add(thought.id);

    for (const other of thoughts) {
      if (used.has(other.id)) continue;
      const otherAnalysis = analyzeThoughtIntent(other.content);

      if (otherAnalysis.actionVerb) {
        const nextVerbs = COMMON_CHAINS[analysis.actionVerb] || [];
        const prevVerbs = COMMON_CHAINS[otherAnalysis.actionVerb] || [];

        if (nextVerbs.includes(otherAnalysis.actionVerb) ||
            prevVerbs.includes(analysis.actionVerb)) {
          chain.push(other);
          used.add(other.id);
        }
      }
    }

    if (chain.length >= 2) {
      chains.push({
        thoughts: chain.map(t => ({
          id: t.id,
          content: t.content,
          status: t.status,
          created_at: t.created_at,
        })),
        actionVerb: analysis.actionVerb,
        chainLength: chain.length,
        completedCount: chain.filter(t => t.status === 'completed' || t.status === 'done').length,
      });
    }
  }

  return chains.sort((a, b) => b.chainLength - a.chainLength);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function extractKeywords(content) {
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each',
    'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
    'than', 'too', 'very', 'just', 'also', 'now', 'then', 'here', 'there',
    'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'am', 'if', 'about', 'up', 'out', 'its',
  ]);

  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 8);
}

module.exports = {
  detectChain,
  analyzeThoughtIntent,
  getActiveChains,
  COMMON_CHAINS,
};
