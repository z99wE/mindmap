/**
 * THOUGHT SIMILARITY NETWORK
 *
 * Detects when a new thought is similar to one from weeks or months ago.
 * Uses pgvector cosine distance to find historical parallels.
 *
 * "You had a similar thought on March 15 — here's what happened"
 * "This is the 3rd time you've thought about the Acme proposal"
 *
 * Cost: $0 (uses existing embeddings in pgvector)
 */

'use strict';

const { pool } = require('./db');
const { embeddingRouter } = require('./embedding-router');

/**
 * Find similar historical thoughts for a new thought.
 * Returns thoughts from 7+ days ago that are semantically similar.
 */
async function findSimilarHistorical(userId, text, currentThoughtId = null) {
  try {
    const embedding = await embeddingRouter.generate(text);
    if (!embedding || embedding.length === 0) return { similar: [], recurring: false };

    const vectorStr = `[${embedding.join(',')}]`;

    // Find similar thoughts from 7+ days ago
    const result = await pool.query(`
      SELECT id, content, category, urgency_tier, status, created_at,
             llm_response,
             embedding <=> $1::vector AS distance
      FROM memory_graph
      WHERE user_id = $2
        AND embedding IS NOT NULL
        AND created_at < NOW() - INTERVAL '7 days'
        ${currentThoughtId ? 'AND id != $3' : ''}
      ORDER BY embedding <=> $1::vector
      LIMIT 5
    `, currentThoughtId
      ? [vectorStr, userId, currentThoughtId]
      : [vectorStr, userId]
    );

    // Filter to actually similar (distance < 0.5 = very similar)
    const similar = result.rows
      .filter(r => r.distance < 0.5)
      .map(r => ({
        id: r.id,
        content: r.content,
        category: r.category,
        status: r.status,
        createdAt: r.created_at,
        similarity: Math.round((1 - r.distance) * 100),
        daysAgo: Math.round((Date.now() - new Date(r.created_at).getTime()) / 86400000),
        llmResponse: r.llm_response,
      }));

    // Detect if this is a recurring thought (3+ similar instances)
    const recurring = similar.length >= 2;

    return { similar, recurring, count: similar.length + 1 };
  } catch (err) {
    console.warn(`[ThoughtSimilarity] Search failed: ${err.message}`);
    return { similar: [], recurring: false, count: 0 };
  }
}

/**
 * Get the thought recurrence map for a user.
 * Shows which topics keep coming up.
 */
async function getRecurrenceMap(userId) {
  try {
    // Find clusters of similar thoughts using embedding proximity
    const result = await pool.query(`
      SELECT id, content, category, created_at, status,
             embedding
      FROM memory_graph
      WHERE user_id = $1
        AND embedding IS NOT NULL
        AND created_at > NOW() - INTERVAL '180 days'
      ORDER BY created_at DESC
      LIMIT 200
    `, [userId]);

    if (result.rows.length < 3) return { topics: [], totalThoughts: result.rows.length };

    // Group thoughts into recurrence clusters
    const topics = [];
    const used = new Set();

    for (let i = 0; i < result.rows.length && topics.length < 10; i++) {
      if (used.has(result.rows[i].id)) continue;

      const cluster = [result.rows[i]];
      used.add(result.rows[i].id);

      // Find similar thoughts in the cluster
      for (let j = i + 1; j < result.rows.length && cluster.length < 5; j++) {
        if (used.has(result.rows[j].id)) continue;

        // Quick cosine similarity check
        const a = _parseEmbedding(result.rows[i].embedding);
        const b = _parseEmbedding(result.rows[j].embedding);
        if (a && b) {
          const sim = _cosineSimilarity(a, b);
          if (sim > 0.7) {
            cluster.push(result.rows[j]);
            used.add(result.rows[j].id);
          }
        }
      }

      if (cluster.length >= 2) {
        topics.push({
          label: _autoLabel(cluster),
          count: cluster.length,
          firstAt: cluster[cluster.length - 1].created_at,
          lastAt: cluster[0].created_at,
          status: cluster[0].status,
          thoughtIds: cluster.map(t => t.id),
        });
      }
    }

    return {
      topics: topics.sort((a, b) => b.count - a.count),
      totalThoughts: result.rows.length,
    };
  } catch (err) {
    console.warn(`[ThoughtSimilarity] Recurrence map failed: ${err.message}`);
    return { topics: [], totalThoughts: 0 };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _parseEmbedding(embedding) {
  if (!embedding) return null;
  if (Array.isArray(embedding)) return embedding;
  if (typeof embedding === 'string') {
    try { return JSON.parse(embedding); } catch { return null; }
  }
  return null;
}

function _cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function _autoLabel(cluster) {
  const words = {};
  const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'and', 'but', 'or', 'not', 'so', 'yet', 'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'they', 'we', 'about']);
  for (const t of cluster) {
    for (const w of t.content.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)) {
      if (w.length > 2 && !stop.has(w)) words[w] = (words[w] || 0) + 1;
    }
  }
  return Object.entries(words).sort(([,a],[,b]) => b - a).slice(0, 2).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1)).join(', ') || 'Recurring';
}

module.exports = { findSimilarHistorical, getRecurrenceMap };
