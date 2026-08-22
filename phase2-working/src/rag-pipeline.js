/**
 * RAG PIPELINE — Retrieval-Augmented Generation
 *
 * Searches the user's memory graph semantically before every LLM call and
 * injects the most relevant memories as context. This makes the LLM respond
 * with awareness of the user's full history.
 *
 * Flow:
 *   User sends thought
 *     → Generate embedding for the thought
 *     → Semantic search against memory_graph (pgvector cosine distance)
 *     → Combine top-K results with text fallback
 *     → Inject as "Related memories" in LLM context
 *     → LLM responds with full awareness of user history
 *
 * Cost: $0 (uses existing Groq embeddings + existing LLM calls)
 */

'use strict';

const { embeddingRouter } = require('./embedding-router');
const { pool } = require('./db');

// ── Configuration ──────────────────────────────────────────────────────────
const RAG_CONFIG = {
  // Number of semantic results to retrieve
  semanticLimit: 8,
  // Number of text-fallback results (ILIKE) when embeddings are degraded
  textFallbackLimit: 5,
  // Maximum similarity distance (lower = more similar). Values above this
  // are considered irrelevant and filtered out.
  maxDistance: 1.2,
  // Minimum similarity threshold for inclusion in context
  minSimilarity: 0.3,
  // Maximum total memories to inject into LLM context (keep prompt tight)
  maxContextMemories: 6,
  // Maximum characters per memory in context (truncate long thoughts)
  maxMemoryChars: 200,
};

/**
 * Search for semantically related memories using pgvector cosine distance.
 * Falls back to ILIKE text search when embeddings are degraded (hash-based).
 */
async function semanticSearch(userId, query, limit = RAG_CONFIG.semanticLimit) {
  try {
    // Generate embedding for the query
    const embedding = await embeddingRouter.generate(query);
    if (!embedding || embedding.length === 0) return [];

    // Check if embeddings are real or hash-based (degraded)
    // Hash-based embeddings produce values in [-1, 1] with high variance
    // Real embeddings have a different distribution
    const isDegraded = _isHashEmbedding(embedding);

    if (!isDegraded) {
      // Real semantic search via pgvector cosine distance
      const vectorStr = `[${embedding.join(',')}]`;
      const result = await pool.query(
        `SELECT id, content, category, urgency_tier, action_verb,
                is_actionable, created_at,
                embedding <=> $1::vector AS distance
         FROM memory_graph
         WHERE user_id = $2
           AND embedding IS NOT NULL
           AND status != 'archived'
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        [vectorStr, userId, limit]
      );

      // Filter by distance threshold
      return result.rows
        .filter(r => r.distance <= RAG_CONFIG.maxDistance)
        .map(r => ({
          id: r.id,
          content: r.content,
          category: r.category,
          urgencyTier: r.urgency_tier,
          actionVerb: r.action_verb,
          isActionable: r.is_actionable,
          createdAt: r.created_at,
          similarity: 1 - r.distance, // convert distance to similarity
          source: 'semantic',
        }));
    }

    // Degraded embeddings — fall through to text search
    return await textSearch(userId, query, RAG_CONFIG.textFallbackLimit);
  } catch (err) {
    console.warn(`[RAG] Semantic search failed: ${err.message}`);
    // Fallback to text search
    return await textSearch(userId, query, RAG_CONFIG.textFallbackLimit);
  }
}

/**
 * Text-based search using ILIKE (always works, no embeddings needed).
 */
async function textSearch(userId, query, limit = RAG_CONFIG.textFallbackLimit) {
  try {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 5); // limit to 5 keywords

    if (keywords.length === 0) return [];

    const conditions = keywords.map((_, i) => `content ILIKE $${i + 3}`).join(' OR ');
    const params = [userId, ...keywords.map(k => `%${k}%`)];

    const result = await pool.query(
      `SELECT id, content, category, urgency_tier, action_verb,
              is_actionable, created_at
       FROM memory_graph
       WHERE user_id = $1 AND (${conditions})
         AND status != 'archived'
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return result.rows.map(r => ({
      id: r.id,
      content: r.content,
      category: r.category,
      urgencyTier: r.urgency_tier,
      actionVerb: r.action_verb,
      isActionable: r.is_actionable,
      createdAt: r.created_at,
      similarity: 0.5, // text match, unknown similarity
      source: 'text',
    }));
  } catch (err) {
    console.warn(`[RAG] Text search failed: ${err.message}`);
    return [];
  }
}

/**
 * Combined RAG search: tries semantic first, supplements with text results
 * to ensure good coverage even with degraded embeddings.
 */
async function ragSearch(userId, query) {
  // Run both searches in parallel
  const [semanticResults, textResults] = await Promise.all([
    semanticSearch(userId, query, RAG_CONFIG.semanticLimit),
    textSearch(userId, query, RAG_CONFIG.textFallbackLimit),
  ]);

  // Merge and deduplicate (semantic results take priority)
  const seen = new Set();
  const merged = [];

  for (const r of semanticResults) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r);
    }
  }

  for (const r of textResults) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r);
    }
  }

  // Sort by similarity (semantic first, then text)
  merged.sort((a, b) => b.similarity - a.similarity);

  return merged.slice(0, RAG_CONFIG.maxContextMemories);
}

/**
 * Format RAG results into a context string for the LLM.
 */
function formatRAGContext(memories) {
  if (!memories || memories.length === 0) return '';

  const lines = memories.map(m => {
    const truncated = m.content.length > RAG_CONFIG.maxMemoryChars
      ? m.content.substring(0, RAG_CONFIG.maxMemoryChars) + '…'
      : m.content;
    const meta = [];
    if (m.category) meta.push(m.category);
    if (m.urgencyTier) meta.push(m.urgencyTier);
    if (m.isActionable) meta.push('actionable');
    const metaStr = meta.length > 0 ? ` (${meta.join(', ')})` : '';
    const simStr = m.source === 'semantic' ? ` [sim:${m.similarity.toFixed(2)}]` : '';
    return `- ${truncated}${metaStr}${simStr}`;
  });

  return `\n\nRelated memories from your history (most relevant first):\n${lines.join('\n')}`;
}

/**
 * Detect if an embedding is hash-based (degraded) vs real API embedding.
 * Hash embeddings have a characteristic uniform distribution in [-1, 1].
 */
function _isHashEmbedding(embedding) {
  if (!embedding || embedding.length < 100) return true;
  // Sample first 100 values — hash embeddings are uniformly distributed
  const sample = embedding.slice(0, 100);
  const mean = sample.reduce((s, v) => s + v, 0) / sample.length;
  const variance = sample.reduce((s, v) => s + (v - mean) ** 2, 0) / sample.length;
  // Hash embeddings have variance close to 0.33 (uniform [-1,1])
  // Real embeddings have lower variance and non-uniform distribution
  return variance > 0.25;
}

/**
 * Get RAG status for the health endpoint.
 */
function getRAGStatus() {
  const embeddingStatus = embeddingRouter.status();
  const hasRealEmbeddings = embeddingStatus.totalKeys > 0 &&
    embeddingStatus.providers.some(p => p.id === 'groq' || p.id === 'nvidia_nim' || p.id === 'openai');
  return {
    mode: hasRealEmbeddings ? 'semantic' : 'text-fallback',
    embeddingProviders: embeddingStatus.providers.length,
    totalKeys: embeddingStatus.totalKeys,
    config: RAG_CONFIG,
  };
}

module.exports = {
  semanticSearch,
  textSearch,
  ragSearch,
  formatRAGContext,
  getRAGStatus,
  RAG_CONFIG,
};
