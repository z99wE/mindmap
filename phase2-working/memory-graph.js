/**
 * MEMORY GRAPH SYSTEM
 * Knowledge graph using PostgreSQL/pgvector (no Pinecone)
 * Stores facts as typed triples: {entity, attribute, value, embedding}
 * 
 * Free for production - uses pgvector extension on Render PostgreSQL
 */

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
  UNIQUE(user_id, attribute, value)
);
`;

// Create index for semantic search
const CREATE_INDEX = `
CREATE INDEX IF NOT EXISTS memory_graph_user_idx ON memory_graph (user_id);
CREATE INDEX IF NOT EXISTS memory_graph_embedding_idx ON memory_graph 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
`;

// ============================================
// 2. KNOWLEDGE EXTRACTOR
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

Examples:
Input: "I fast on Fridays"
Output: {"entity": "user", "attribute": "health.diet.fasting", "value": "Fridays", "category": "health"}

Input: "I cycle to work"
Output: {"entity": "user", "attribute": "transport.preferred", "value": "bicycle", "category": "transport"}

Input: "Buy milk from the store"
Output: {"entity": "user", "attribute": "shopping.list", "value": "milk", "category": "shopping"}

Input: "Call mom tomorrow at 5pm"
Output: {"entity": "user", "attribute": "communication.reminder", "value": "Call mom tomorrow at 5pm", "category": "tasks"}

Rules:
- Always set entity to "user" unless explicitly named
- Use dot-notated paths for attributes (e.g., "health.diet")
- Keep values concise but complete
- Extract tasks, preferences, facts, and intentions
`;
  }

  async extractFacts(text, userId) {
    // In production, use your LLM to parse the text
    // For now, return mock data - integrate with your LLM router
    
    const facts = [];
    
    // Extract tasks
    const taskPatterns = [
      /remind.*to\s+(\w+)\s+at\s+(\d+:?\d*)/i,
      /pick up (\w+) from/i,
      /buy (.*) for/i
    ];
    
    for (const pattern of taskPatterns) {
      const match = text.match(pattern);
      if (match) {
        facts.push({
          entity: 'user',
          attribute: 'tasks.pending',
          value: match[0],
          category: 'tasks'
        });
      }
    }
    
    // Extract preferences
    const prefPatterns = [
      /I (prefer|like) (.*)/i,
      /I (use|drive|cycle|walk) (.*)/i
    ];
    
    for (const pattern of prefPatterns) {
      const match = text.match(pattern);
      if (match) {
        facts.push({
          entity: 'user',
          attribute: 'preferences.' + (match[1].toLowerCase() === 'prefer' ? 'likes' : 'transport'),
          value: match[2],
          category: 'preferences'
        });
      }
    }
    
    return facts.length > 0 ? facts : [{
      entity: 'user',
      attribute: 'general.thought',
      value: text,
      category: 'general'
    }];
  }
}

const knowledgeExtractor = new KnowledgeExtractor();

// ============================================
// 3. MEMORY GRAPH MANAGER
// ============================================

class MemoryGraphManager {
  constructor(pool) {
    this.pool = pool;
    this.extractor = knowledgeExtractor;
  }

  async createTable() {
    const client = await this.pool.connect();
    try {
      await client.query(MEMORY_GRAPH_TABLE);
      await client.query(CREATE_INDEX);
      console.log('✅ Memory graph table created');
    } finally {
      client.release();
    }
  }

  async addFact(userId, text) {
    const facts = await this.extractor.extractFacts(text, userId);
    
    const results = [];
    for (const fact of facts) {
      // Generate embedding (in production, use OpenAI embeddings)
      const embedding = this.generateEmbedding(fact.attribute + ' ' + fact.value);
      
      const query = `
        INSERT INTO memory_graph (user_id, entity, attribute, value, category, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        ON CONFLICT (user_id, attribute, value) DO NOTHING
        RETURNING *
      `;
      
      const client = await this.pool.connect();
      try {
        const result = await client.query(query, [
          userId, fact.entity, fact.attribute, fact.value, fact.category, `[${embedding.join(',')}]`
        ]);
        results.push(result.rows[0]);
      } finally {
        client.release();
      }
    }
    
    return results;
  }

  async searchMemories(userId, query, limit = 10) {
    const embedding = this.generateEmbedding(query);
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT *, embedding <=> $1::vector AS similarity
        FROM memory_graph
        WHERE user_id = $2
        ORDER BY similarity DESC
        LIMIT $3
      `, [`[${embedding.join(',')}]`, userId, limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getGraph(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT entity, attribute, value, category, created_at
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

  async exportJSONLD(userId) {
    const facts = await this.getGraph(userId);
    
    return {
      '@context': 'https://www.w3.org/ns/json-ld',
      '@graph': facts.map((fact, i) => ({
        '@id': `urn:memory:${userId}:${fact.id}`,
        '@type': 'memory.Fact',
        'entity': fact.entity,
        'attribute': fact.attribute,
        'value': fact.value,
        'category': fact.category,
        'timestamp': fact.created_at.toISOString()
      }))
    };
  }

  generateEmbedding(text) {
    // Generate a simple 1536-dim vector for demo
    // In production, use OpenAI embeddings
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 1536 }, () => Math.sin(hash + Math.random()));
  }
}

// ============================================
// 4. EXPORTS
// ============================================

module.exports = {
  MEMORY_GRAPH_TABLE,
  knowledgeExtractor,
  MemoryGraphManager
};
