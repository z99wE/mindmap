/**
 * MEMORY GRAPH SYSTEM
 * Knowledge graph using PostgreSQL/pgvector
 * Real embeddings via Groq or HuggingFace free inference
 * Stores facts as typed triples: {entity, attribute, value, embedding}
 */

const https = require('https');
const http = require('http');
const { embeddingRouter } = require('./src/embedding-router');

// ============================================
// 1. MEMORY GRAPH SCHEMA
// ============================================

const MEMORY_GRAPH_TABLE = `
CREATE TABLE IF NOT EXISTS memory_graph (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  entity VARCHAR(255) NOT NULL DEFAULT 'user',
  attribute VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536),
  
  -- Phase 8: Neuro-diverse productivity features
  requested_by VARCHAR(255),
  context_note TEXT,
  emotional_weight_score INTEGER CHECK (emotional_weight_score BETWEEN 1 AND 5),
  trigger_type VARCHAR(50),
  trigger_value TEXT,
  destination_coords POINT,
  deadline_epoch BIGINT,
  travel_duration_minutes INTEGER,
  
  -- Thought Half-Life Classifier
  half_life_hours INTEGER,
  urgency_tier VARCHAR(50),
  action_verb VARCHAR(50),
  is_actionable BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  notified_tier INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  archived BOOLEAN DEFAULT false,

  -- Commitment Witness
  witness_contact TEXT,
  witness_notified BOOLEAN DEFAULT false,
  
  -- Intent classification from LLM
  intent VARCHAR(100),
  llm_response TEXT,
  
  UNIQUE(user_id, attribute, value)
);
`;

const PHASE_8_MIGRATIONS = `
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS context_note TEXT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS emotional_weight_score INTEGER CHECK (emotional_weight_score BETWEEN 1 AND 5);
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50);
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS trigger_value TEXT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS destination_coords POINT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS deadline_epoch BIGINT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS travel_duration_minutes INTEGER;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS half_life_hours INTEGER;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS urgency_tier VARCHAR(50);
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS action_verb VARCHAR(50);
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS is_actionable BOOLEAN;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS notified_tier INTEGER DEFAULT 0;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS witness_contact TEXT;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS witness_notified BOOLEAN DEFAULT false;
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS llm_response TEXT;

-- Door Rule dedup: last departure brief timestamp on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_departure_brief_sent_at TIMESTAMP WITH TIME ZONE;
`;

const CREATE_INDEX = `
CREATE INDEX IF NOT EXISTS memory_graph_user_idx ON memory_graph (user_id);
CREATE INDEX IF NOT EXISTS memory_graph_embedding_idx ON memory_graph 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS memory_graph_category_idx ON memory_graph (user_id, category);
CREATE INDEX IF NOT EXISTS memory_graph_status_idx ON memory_graph (user_id, status);
`;

// ============================================
// 2. EMBEDDING GENERATOR (uses EmbeddingRouter)
// ============================================
// The EmbeddingRouter handles multi-provider failover (Groq → NVIDIA NIM → HuggingFace → OpenAI → hash fallback)
// and per-user caching. See src/embedding-router.js for the full implementation.

class EmbeddingGenerator {
  constructor() {
    this.router = embeddingRouter;
  }

  /**
   * Generate a 1536-dim embedding for text
   * Routes through the EmbeddingRouter with automatic failover
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return this.router._fallbackEmbed('');
    }
    return this.router.generate(text);
  }
}

// ============================================
// 3. KNOWLEDGE EXTRACTOR (uses LLM when available)
// ============================================

class KnowledgeExtractor {
  constructor() {
    this.systemPrompt = `Extract facts from user input as structured triples.
Return JSON with format:
{
  "entity": "user" or specific entity name,
  "attribute": "category.subcategory" (dot-notated path),
  "value": "the fact value",
  "category": "health", "work", "transport", "food", "tasks", etc.
}
Rules:
- Always set entity to "user" unless explicitly named
- Use dot-notated paths for attributes
- Keep values concise but complete
- Extract tasks, preferences, facts, and intentions`;
  }

  async extractFacts(text, userId) {
    const facts = [];

    // Pattern-based extraction (works without LLM)
    const taskPatterns = [
      { regex: /remind.*to\s+(\w[\w\s]*?)(?:\s+at\s+(\d+:?\d*|tomorrow|today))?$/i, attr: 'tasks.reminder' },
      { regex: /pick up (\w[\w\s]*?) from/i, attr: 'tasks.pickup' },
      { regex: /buy (.+?)(?:\s+for\s+(.+))?$/i, attr: 'shopping.list' },
      { regex: /call (\w[\w\s]*?)(?:\s+(at|tomorrow|today)\s*(\d*:?\d*))?$/i, attr: 'tasks.call' },
      { regex: /meet (\w[\w\s]*?)(?:\s+(at|on|tomorrow)\s*(.+))?$/i, attr: 'tasks.meeting' },
      { regex: /deadline[:\s]+(.+?)(?:\s+by\s+(.+))?$/i, attr: 'tasks.deadline' },
    ];

    for (const { regex, attr } of taskPatterns) {
      const match = text.match(regex);
      if (match) {
        facts.push({
          entity: 'user',
          attribute: attr,
          value: match[0].trim(),
          category: attr.startsWith('tasks') ? 'tasks' : 'shopping',
        });
      }
    }

    const prefPatterns = [
      { regex: /I (prefer|like|love) (.+)/i, attr: 'preferences.likes' },
      { regex: /I (use|drive|cycle|walk|take) (.+)/i, attr: 'preferences.transport' },
      { regex: /I (hate|dislike|avoid) (.+)/i, attr: 'preferences.dislikes' },
      { regex: /I (always|usually|often) (.+)/i, attr: 'preferences.habits' },
    ];

    for (const { regex, attr } of prefPatterns) {
      const match = text.match(regex);
      if (match) {
        facts.push({
          entity: 'user',
          attribute: attr,
          value: match[0].trim(),
          category: 'preferences',
        });
      }
    }

    // Commitment detection
    const commitPatterns = [
      /I (promise|commit|will|swear)\s+to\s+(.+)/i,
      /I('ll| will)\s+(.+)/i,
    ];
    for (const regex of commitPatterns) {
      const match = text.match(regex);
      if (match) {
        facts.push({
          entity: 'user',
          attribute: 'commitment.active',
          value: match[0].trim(),
          category: 'commitment',
        });
      }
    }

    // Default: store as general thought
    if (facts.length === 0) {
      facts.push({
        entity: 'user',
        attribute: 'general.thought',
        value: text.trim(),
        category: 'general',
      });
    }

    return facts;
  }
}

const knowledgeExtractor = new KnowledgeExtractor();
const embeddingGenerator = new EmbeddingGenerator();

// ============================================
// 4. MEMORY GRAPH MANAGER
// ============================================

class MemoryGraphManager {
  constructor(pool) {
    this.pool = pool;
    this.extractor = knowledgeExtractor;
    this.embedder = embeddingGenerator;
  }

  async createTable() {
    const client = await this.pool.connect();
    try {
      await client.query(MEMORY_GRAPH_TABLE);
      await client.query(PHASE_8_MIGRATIONS);
      await client.query(CREATE_INDEX);
      console.log('✅ Memory graph table created and migrated');
    } finally {
      client.release();
    }
  }

  async addFact(userId, text, extraFields = {}) {
    const facts = await this.extractor.extractFacts(text, userId);
    const results = [];

    for (const fact of facts) {
      const embedding = await this.embedder.generateEmbedding(fact.attribute + ' ' + fact.value);

      const query = `
        INSERT INTO memory_graph (
          user_id, entity, attribute, value, category, embedding,
          intent, llm_response, half_life_hours, urgency_tier,
          action_verb, is_actionable, expires_at, status,
          witness_contact, context_note, requested_by,
          cognitive_load, theme, brain_area, emotional_tone,
          related_person, location_tag
        )
        VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (user_id, attribute, value) DO NOTHING
        RETURNING *
      `;

      const client = await this.pool.connect();
      try {
        const result = await client.query(query, [
          userId, fact.entity, fact.attribute, fact.value, fact.category,
          `[${embedding.join(',')}]`,
          extraFields.intent || null,
          extraFields.llmResponse || null,
          extraFields.halfLifeHours || null,
          extraFields.urgencyTier || null,
          extraFields.actionVerb || null,
          extraFields.isActionable || false,
          extraFields.expiresAt || null,
          extraFields.status || 'pending',
          extraFields.witnessContact || null,
          extraFields.contextNote || null,
          extraFields.requestedBy || null,
          extraFields.cognitiveLoad || null,
          extraFields.theme || null,
          extraFields.brainArea || null,
          extraFields.emotionalTone || null,
          extraFields.relatedPerson || null,
          extraFields.locationTag || null,
        ]);
        results.push(result.rows[0]);
      } finally {
        client.release();
      }
    }

    return results;
  }

  async searchMemories(userId, query, limit = 10) {
    const embedding = await this.embedder.generateEmbedding(query);

    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT *, embedding <=> $1::vector AS similarity
        FROM memory_graph
        WHERE user_id = $2
        ORDER BY similarity ASC
        LIMIT $3
      `, [`[${embedding.join(',')}]`, userId, limit]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async searchByText(userId, query, limit = 20) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM memory_graph
        WHERE user_id = $1
          AND (value ILIKE $2 OR attribute ILIKE $2 OR category ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3
      `, [userId, `%${query}%`, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getGraph(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT entity, attribute, value, category, created_at, intent, status
        FROM memory_graph
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getStats(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(DISTINCT category) as categories,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days
        FROM memory_graph
        WHERE user_id = $1
      `, [userId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getByCategory(userId, category) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM memory_graph
        WHERE user_id = $1 AND category = $2
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId, category]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async deleteMemory(userId, memoryId) {
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM memory_graph WHERE id = $1 AND user_id = $2`, [memoryId, userId]);
      return true;
    } finally {
      client.release();
    }
  }

  async updateMemoryStatus(userId, memoryId, status) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE memory_graph SET status = $1 WHERE id = $2 AND user_id = $3`,
        [status, memoryId, userId]
      );
      return true;
    } finally {
      client.release();
    }
  }

  async exportJSONLD(userId) {
    const facts = await this.getGraph(userId);
    return {
      '@context': 'https://www.w3.org/ns/json-ld',
      '@graph': facts.map((fact) => ({
        '@id': `urn:memory:${userId}:${fact.id}`,
        '@type': 'memory.Fact',
        'entity': fact.entity,
        'attribute': fact.attribute,
        'value': fact.value,
        'category': fact.category,
        'timestamp': fact.created_at?.toISOString?.() || fact.created_at
      }))
    };
  }
}

// ============================================
// 5. EXPORTS
// ============================================

module.exports = {
  MEMORY_GRAPH_TABLE,
  PHASE_8_MIGRATIONS,
  CREATE_INDEX,
  knowledgeExtractor,
  embeddingGenerator,
  MemoryGraphManager,
  EmbeddingGenerator,
};
