/**
 * THOUGHT CLUSTERING — Auto-group related thoughts into projects/topics
 *
 * Uses semantic embeddings to automatically cluster related thoughts
 * without user tagging. Detects emergent topics and tracks cluster
 * evolution over time.
 *
 * Algorithm:
 *   1. Fetch recent unclustered thoughts with embeddings
 *   2. Compute pairwise cosine similarity
 *   3. Group using single-linkage clustering with threshold
 *   4. Auto-label clusters by most common keywords
 *   5. Store cluster assignments in knowledge_clusters table
 *
 * Cost: $0 (math on existing embeddings, no API calls)
 */

'use strict';

const { pool } = require('./db');

// ── Configuration ──────────────────────────────────────────────────────────
const CONFIG = {
  // Cosine similarity threshold for clustering (lower = more aggressive)
  similarityThreshold: 0.65,
  // Minimum thoughts in a cluster to be meaningful
  minClusterSize: 2,
  // Maximum clusters per user
  maxClusters: 50,
  // How many recent thoughts to analyze
  analysisWindow: 200,
  // Re-cluster every N hours
  reclusterIntervalHours: 6,
};

// ── Schema ─────────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS knowledge_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  thought_count INT DEFAULT 0,
  keywords JSONB DEFAULT '[]',
  first_thought_at TIMESTAMPTZ,
  last_thought_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kc_user ON knowledge_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_kc_active ON knowledge_clusters(user_id, is_active);

CREATE TABLE IF NOT EXISTS thought_cluster_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thought_id INT NOT NULL REFERENCES memory_graph(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES knowledge_clusters(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thought_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_tca_user ON thought_cluster_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_tca_cluster ON thought_cluster_assignments(cluster_id);
CREATE INDEX IF NOT EXISTS idx_tca_thought ON thought_cluster_assignments(thought_id);
`;

// ── Core Clustering Engine ─────────────────────────────────────────────────

/**
 * Run clustering for a user. Fetches recent thoughts, computes similarity,
 * and groups them into clusters. Idempotent — re-running updates existing clusters.
 */
async function clusterThoughts(userId) {
  // Fetch recent thoughts with embeddings
  const thoughts = await _fetchThoughts(userId);
  if (thoughts.length < CONFIG.minClusterSize) {
    return { clusters: [], newClusters: 0, message: 'Not enough thoughts to cluster yet.' };
  }

  // Build similarity matrix
  const similarityMatrix = _buildSimilarityMatrix(thoughts);

  // Run single-linkage clustering
  const rawClusters = _cluster(similarityMatrix, thoughts);

  // Filter small clusters
  const validClusters = rawClusters.filter(c => c.length >= CONFIG.minClusterSize);

  // Auto-label each cluster
  const labeledClusters = validClusters.map(c => ({
    thoughts: c,
    label: _autoLabel(c),
    keywords: _extractKeywords(c),
  }));

  // Store in database
  const stored = await _storeClusters(userId, labeledClusters);

  return {
    clusters: stored,
    newClusters: stored.length,
    totalThoughts: thoughts.length,
    message: `Found ${stored.length} topic clusters from ${thoughts.length} thoughts.`,
  };
}

/**
 * Get all clusters for a user with their thoughts.
 */
async function getClusters(userId, options = {}) {
  const { includeInactive = false, limit = CONFIG.maxClusters } = options;

  let query = 'SELECT * FROM knowledge_clusters WHERE user_id = $1';
  const params = [userId];

  if (!includeInactive) {
    query += ' AND is_active = true';
  }
  query += ` ORDER BY thought_count DESC, updated_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const clustersResult = await pool.query(query, params);
  const clusters = [];

  for (const cluster of clustersResult.rows) {
    const thoughtsResult = await pool.query(
      `SELECT mg.id, mg.content, mg.category, mg.urgency_tier, mg.is_actionable,
              mg.created_at, mg.status
       FROM thought_cluster_assignments tca
       JOIN memory_graph mg ON mg.id = tca.thought_id
       WHERE tca.cluster_id = $1 AND tca.user_id = $2
       ORDER BY mg.created_at DESC
       LIMIT 20`,
      [cluster.id, userId]
    );

    clusters.push({
      id: cluster.id,
      label: cluster.label,
      thoughtCount: cluster.thought_count,
      keywords: cluster.keywords,
      firstThoughtAt: cluster.first_thought_at,
      lastThoughtAt: cluster.last_thought_at,
      isActive: cluster.is_active,
      thoughts: thoughtsResult.rows,
    });
  }

  return clusters;
}

/**
 * Get cluster stats for the dashboard.
 */
async function getClusterStats(userId) {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total_clusters,
       COUNT(CASE WHEN is_active THEN 1 END) as active_clusters,
       SUM(thought_count) as total_clustered_thoughts,
       AVG(thought_count) as avg_cluster_size
     FROM knowledge_clusters
     WHERE user_id = $1`,
    [userId]
  );

  const recentResult = await pool.query(
    `SELECT label, thought_count, last_thought_at
     FROM knowledge_clusters
     WHERE user_id = $1 AND is_active = true
     ORDER BY last_thought_at DESC
     LIMIT 5`,
    [userId]
  );

  const unclusteredResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM memory_graph mg
     WHERE mg.user_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM thought_cluster_assignments tca
         WHERE tca.thought_id = mg.id AND tca.user_id = $1
       )`,
    [userId]
  );

  return {
    totalClusters: parseInt(result.rows[0]?.total_clusters || '0'),
    activeClusters: parseInt(result.rows[0]?.active_clusters || '0'),
    totalClusteredThoughts: parseInt(result.rows[0]?.total_clustered_thoughts || '0'),
    avgClusterSize: parseFloat(result.rows[0]?.avg_cluster_size || '0'),
    recentClusters: recentResult.rows,
    unclusteredThoughts: parseInt(unclusteredResult.rows[0]?.count || '0'),
  };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

async function _fetchThoughts(userId) {
  const result = await pool.query(
    `SELECT id, content, category, urgency_tier, is_actionable, created_at, status,
            embedding
     FROM memory_graph
     WHERE user_id = $1
       AND embedding IS NOT NULL
       AND status != 'archived'
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, CONFIG.analysisWindow]
  );
  return result.rows;
}

function _parseEmbedding(embedding) {
  if (!embedding) return null;
  if (Array.isArray(embedding)) return embedding;
  if (typeof embedding === 'string') {
    try {
      return JSON.parse(embedding.replace(/^\[/, '[').replace(/\]$/, ']'));
    } catch {
      return null;
    }
  }
  return null;
}

function _cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function _buildSimilarityMatrix(thoughts) {
  const embeddings = thoughts.map(t => _parseEmbedding(t.embedding));
  const n = thoughts.length;
  const matrix = Array.from({ length: n }, () => new Float32Array(n));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;
    for (let j = i + 1; j < n; j++) {
      const sim = _cosineSimilarity(embeddings[i], embeddings[j]);
      matrix[i][j] = sim;
      matrix[j][i] = sim;
    }
  }

  return matrix;
}

function _cluster(similarityMatrix, thoughts) {
  const n = thoughts.length;
  const labels = new Array(n).fill(-1); // -1 = unassigned
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    // BFS from this node
    const cluster = [i];
    labels[i] = clusterId;
    const queue = [i];

    while (queue.length > 0) {
      const current = queue.shift();
      for (let j = 0; j < n; j++) {
        if (labels[j] !== -1) continue;
        if (similarityMatrix[current][j] >= CONFIG.similarityThreshold) {
          labels[j] = clusterId;
          cluster.push(j);
          queue.push(j);
        }
      }
    }

    clusterId++;
  }

  // Group by cluster ID
  const clusters = [];
  for (let c = 0; c < clusterId; c++) {
    const indices = labels
      .map((label, idx) => (label === c ? idx : -1))
      .filter(idx => idx !== -1);
    clusters.push(indices.map(idx => thoughts[idx]));
  }

  return clusters;
}

function _autoLabel(cluster) {
  // Extract most common meaningful words
  const wordCounts = {};
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'and',
    'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
    'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when',
    'where', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'he', 'him',
    'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'about']);

  for (const thought of cluster) {
    const words = thought.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  // Top 3 words become the label
  const sorted = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([word]) => word);

  if (sorted.length === 0) return 'Uncategorized';
  return sorted.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ');
}

function _extractKeywords(cluster) {
  const wordCounts = {};
  for (const thought of cluster) {
    const words = thought.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

async function _storeClusters(userId, labeledClusters) {
  const stored = [];

  // Deactivate existing clusters for this user
  await pool.query(
    'UPDATE knowledge_clusters SET is_active = false WHERE user_id = $1',
    [userId]
  );

  for (const cluster of labeledClusters) {
    try {
      // Create or update cluster
      const clusterResult = await pool.query(
        `INSERT INTO knowledge_clusters (user_id, label, thought_count, keywords, first_thought_at, last_thought_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          userId,
          cluster.label,
          cluster.thoughts.length,
          JSON.stringify(cluster.keywords),
          cluster.thoughts[cluster.thoughts.length - 1]?.created_at || new Date(),
          cluster.thoughts[0]?.created_at || new Date(),
        ]
      );

      const clusterId = clusterResult.rows[0].id;

      // Assign thoughts to cluster
      for (const thought of cluster.thoughts) {
        await pool.query(
          `INSERT INTO thought_cluster_assignments (user_id, thought_id, cluster_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, thought_id, cluster_id) DO NOTHING`,
          [userId, thought.id, clusterId]
        );
      }

      stored.push({
        id: clusterId,
        label: cluster.label,
        thoughtCount: cluster.thoughts.length,
        keywords: cluster.keywords,
      });
    } catch {
      // Skip on error
    }
  }

  return stored;
}

module.exports = {
  clusterThoughts,
  getClusters,
  getClusterStats,
  SCHEMA,
  CONFIG,
};
