/**
 * KNOWLEDGE GRAPH — Auto-construction from user thoughts
 *
 * Extracts entities (people, places, projects, organizations) and
 * relationships from every thought using NLP patterns + LLM when available.
 * Builds a queryable knowledge graph stored in PostgreSQL.
 *
 * Tables:
 *   knowledge_entities    — extracted entities (person, org, project, etc.)
 *   knowledge_relationships — connections between entities
 *   knowledge_mentions    — links thoughts to entities
 *
 * Cost: $0 (regex + LLM-assisted extraction using existing key pool)
 */

'use strict';

const { pool } = require('./db');
const { callProvider } = require('./llm-provider');
const { keyRouter } = require('./key-router');

// ── Schema ─────────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('person', 'organization', 'project', 'location', 'topic', 'tool', 'event', 'other')),
  metadata JSONB DEFAULT '{}',
  mention_count INT DEFAULT 1,
  first_mentioned TIMESTAMPTZ DEFAULT NOW(),
  last_mentioned TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_ke_user ON knowledge_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_ke_type ON knowledge_entities(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ke_name ON knowledge_entities(user_id, name text_pattern_ops);
`;

const RELATIONSHIPS_SCHEMA = `
CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100) NOT NULL,
  strength FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_entity_id, target_entity_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_kr_user ON knowledge_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_kr_source ON knowledge_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_kr_target ON knowledge_relationships(target_entity_id);
`;

const MENTIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS knowledge_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thought_id INT REFERENCES memory_graph(id) ON DELETE SET NULL,
  entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_km_user ON knowledge_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_km_entity ON knowledge_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_km_thought ON knowledge_mentions(thought_id);
`;

// ── Entity Extraction (NLP patterns) ───────────────────────────────────────

// Entity type detection patterns
const ENTITY_PATTERNS = {
  person: [
    /\b(call|email|text|message|meet|talk|ask|tell|contact|schedule with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /\b(with|from|to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
  ],
  organization: [
    /\b(google|microsoft|apple|amazon|meta|openai|anthropic|nvidia|tesla|spacex)\b/gi,
    /\bthe\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(company|team|group|corp|inc|llc|ltd)/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(company|team|group|corp|inc|llc|ltd)/g,
  ],
  project: [
    /\b(project|proposal|report|presentation|design|build|deploy|launch)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /\b(the)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(project|proposal|report)/gi,
  ],
  location: [
    /\b(at|in|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /\b(home|office|work|gym|school|cafe|park|store)\b/gi,
  ],
  topic: [
    /\b(about|regarding|concerning|topic|subject)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ],
};

// Relationship patterns
const RELATIONSHIP_PATTERNS = [
  { pattern: /([A-Z][a-z]+)\s+(works?\s+(at|for|with))\s+([A-Z][a-z]+)/gi, type: 'works_at' },
  { pattern: /([A-Z][a-z]+)\s+(manages?|leads?|runs?|owns?)\s+([A-Z][a-z]+)/gi, type: 'manages' },
  { pattern: /([A-Z][a-z]+)\s+(is\s+a|works\s+on)\s+(.+?)(?:\s+at|\s+for|\s+with|\s*$)/gi, type: 'role' },
  { pattern: /project\s+([A-Z][a-z]+)\s+(for|with|at)\s+([A-Z][a-z]+)/gi, type: 'belongs_to' },
  { pattern: /(deadline|due)\s+(.+?)\s+(for|by)\s+([A-Z][a-z]+)/gi, type: 'deadline_for' },
];

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * Extract entities and relationships from a thought using NLP patterns.
 * Optionally uses LLM for richer extraction when available.
 */
async function extractKnowledge(userId, thoughtId, text, user = null) {
  if (!text || text.length < 5) return { entities: [], relationships: [] };

  // 1. Pattern-based extraction (always works, $0 cost)
  const patternEntities = _extractWithPatterns(text);
  const patternRelationships = _extractRelationships(text, patternEntities);

  // 2. LLM-assisted extraction (richer, uses existing key pool)
  let llmEntities = [];
  let llmRelationships = [];
  if (user) {
    try {
      const llmResult = await _extractWithLLM(text, user);
      llmEntities = llmResult.entities || [];
      llmRelationships = llmResult.relationships || [];
    } catch {
      // LLM unavailable, pattern extraction is sufficient
    }
  }

  // 3. Merge and deduplicate
  const allEntities = _mergeEntities(patternEntities, llmEntities);
  const allRelationships = _mergeRelationships(patternRelationships, llmRelationships);

  // 4. Store in database
  const storedEntities = await _storeEntities(userId, allEntities);
  const storedRelationships = await _storeRelationships(userId, storedEntities, allRelationships);
  await _storeMentions(userId, thoughtId, storedEntities);

  return { entities: storedEntities, relationships: storedRelationships };
}

/**
 * Get the full knowledge graph for a user.
 */
async function getKnowledgeGraph(userId, options = {}) {
  const { entityType, limit = 100 } = options;

  let entityQuery = 'SELECT * FROM knowledge_entities WHERE user_id = $1';
  const params = [userId];

  if (entityType) {
    entityQuery += ' AND entity_type = $2';
    params.push(entityType);
  }
  entityQuery += ` ORDER BY mention_count DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const [entities, relationships] = await Promise.all([
    pool.query(entityQuery, params),
    pool.query(
      `SELECT r.*, 
              s.name as source_name, s.entity_type as source_type,
              t.name as target_name, t.entity_type as target_type
       FROM knowledge_relationships r
       JOIN knowledge_entities s ON s.id = r.source_entity_id
       JOIN knowledge_entities t ON t.id = r.target_entity_id
       WHERE r.user_id = $1
       ORDER BY r.strength DESC
       LIMIT 200`,
      [userId]
    ),
  ]);

  return {
    entities: entities.rows,
    relationships: relationships.rows,
    stats: {
      totalEntities: entities.rows.length,
      totalRelationships: relationships.rows.length,
      byType: entities.rows.reduce((acc, e) => {
        acc[e.entity_type] = (acc[e.entity_type] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

/**
 * Search entities by name.
 */
async function searchEntities(userId, query, limit = 20) {
  const result = await pool.query(
    `SELECT * FROM knowledge_entities
     WHERE user_id = $1 AND name ILIKE $2
     ORDER BY mention_count DESC
     LIMIT $3`,
    [userId, `%${query}%`, limit]
  );
  return result.rows;
}

/**
 * Get entity details with connected entities.
 */
async function getEntityDetails(userId, entityId) {
  const [entity, outgoing, incoming, mentions] = await Promise.all([
    pool.query('SELECT * FROM knowledge_entities WHERE id = $1 AND user_id = $2', [entityId, userId]),
    pool.query(
      `SELECT r.*, t.name as target_name, t.entity_type as target_type
       FROM knowledge_relationships r
       JOIN knowledge_entities t ON t.id = r.target_entity_id
       WHERE r.source_entity_id = $1 AND r.user_id = $2`,
      [entityId, userId]
    ),
    pool.query(
      `SELECT r.*, s.name as source_name, s.entity_type as source_type
       FROM knowledge_relationships r
       JOIN knowledge_entities s ON s.id = r.source_entity_id
       WHERE r.target_entity_id = $1 AND r.user_id = $2`,
      [entityId, userId]
    ),
    pool.query(
      `SELECT m.*, mg.content as thought_content
       FROM knowledge_mentions m
       LEFT JOIN memory_graph mg ON mg.id = m.thought_id
       WHERE m.entity_id = $1 AND m.user_id = $2
       ORDER BY m.created_at DESC LIMIT 20`,
      [entityId, userId]
    ),
  ]);

  return {
    entity: entity.rows[0] || null,
    outgoing: outgoing.rows,
    incoming: incoming.rows,
    mentions: mentions.rows,
  };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

function _extractWithPatterns(text) {
  const entities = [];
  const seen = new Set();

  for (const [type, patterns] of Object.entries(ENTITY_PATTERNS)) {
    for (const regex of patterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const name = (match[2] || match[1] || '').trim();
        if (name.length < 2 || name.length > 50) continue;
        // Skip common false positives
        if (/^(the|and|but|for|with|from|that|this|have|been|will|would|could|should|about|into|onto)$/i.test(name)) continue;
        const key = `${name.toLowerCase()}:${type}`;
        if (!seen.has(key)) {
          seen.add(key);
          entities.push({ name, entityType: type, source: 'pattern' });
        }
      }
    }
  }

  // Detect capitalized words not caught by patterns (potential proper nouns)
  const capitalWords = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
  for (const word of capitalWords) {
    if (word.length < 3) continue;
    const key = `${word.toLowerCase()}:other`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ name: word, entityType: 'other', source: 'pattern' });
    }
  }

  return entities;
}

function _extractRelationships(text, entities) {
  const relationships = [];
  const entityNames = entities.map(e => e.name.toLowerCase());

  for (const { pattern, type } of RELATIONSHIP_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const groups = match.slice(1).filter(Boolean);
      if (groups.length >= 2) {
        const source = groups[0].trim();
        const target = groups[groups.length - 1].trim();
        if (source.length >= 2 && target.length >= 2 && source !== target) {
          relationships.push({ source, target, type, source: 'pattern' });
        }
      }
    }
  }

  return relationships;
}

async function _extractWithLLM(text, user) {
  const prompt = `Extract entities and relationships from this thought. Return JSON only.
Thought: "${text.substring(0, 500)}"

Return:
{
  "entities": [{"name": "...", "type": "person|organization|project|location|topic|tool|event"}],
  "relationships": [{"source": "entity name", "target": "entity name", "type": "works_at|manages|belongs_to|deadline_for|mentions|related_to"}]
}

Rules:
- Only extract clearly identifiable entities (proper nouns, known organizations)
- Keep entity names concise (2-3 words max)
- Don't extract "user" as an entity
- If no entities found, return empty arrays`;

  try {
    const chain = keyRouter.buildChain(user, 'llm');
    for (const route of chain) {
      for (const k of route.keys) {
        try {
          const response = await callProvider(route.provider, k.key, prompt, '', {
            endpoint: k.endpoint,
            model: k.model,
            max_tokens: 512,
          });
          keyRouter.touch(user.id, route.provider, k.id);

          // Parse JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              entities: (parsed.entities || []).map(e => ({
                name: e.name,
                entityType: e.type || 'other',
                source: 'llm',
              })),
              relationships: (parsed.relationships || []).map(r => ({
                source: r.source,
                target: r.target,
                type: r.type || 'related_to',
                source: 'llm',
              })),
            };
          }
          break;
        } catch {
          keyRouter.markCooldown(user.id, route.provider, k.id);
        }
      }
    }
  } catch {
    // LLM unavailable
  }

  return { entities: [], relationships: [] };
}

function _mergeEntities(patternEntities, llmEntities) {
  const merged = new Map();
  for (const e of [...patternEntities, ...llmEntities]) {
    const key = `${e.name.toLowerCase()}:${e.entityType}`;
    if (!merged.has(key)) {
      merged.set(key, e);
    }
  }
  return [...merged.values()];
}

function _mergeRelationships(patternRels, llmRels) {
  const merged = new Map();
  for (const r of [...patternRels, ...llmRels]) {
    const key = `${r.source.toLowerCase()}:${r.target.toLowerCase()}:${r.type}`;
    if (!merged.has(key)) {
      merged.set(key, r);
    }
  }
  return [...merged.values()];
}

async function _storeEntities(userId, entities) {
  const stored = [];
  for (const e of entities) {
    try {
      const result = await pool.query(
        `INSERT INTO knowledge_entities (user_id, name, entity_type, metadata)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, name, entity_type)
         DO UPDATE SET mention_count = knowledge_entities.mention_count + 1,
                       last_mentioned = NOW(),
                       metadata = COALESCE(knowledge_entities.metadata, '{}')
         RETURNING *`,
        [userId, e.name, e.entityType, JSON.stringify({ source: e.source })]
      );
      stored.push(result.rows[0]);
    } catch {
      // Skip on error
    }
  }
  return stored;
}

async function _storeRelationships(userId, entities, relationships) {
  const stored = [];
  for (const r of relationships) {
    try {
      const sourceEntity = entities.find(e => e.name.toLowerCase() === r.source.toLowerCase());
      const targetEntity = entities.find(e => e.name.toLowerCase() === r.target.toLowerCase());
      if (!sourceEntity || !targetEntity) continue;
      if (sourceEntity.id === targetEntity.id) continue;

      const result = await pool.query(
        `INSERT INTO knowledge_relationships (user_id, source_entity_id, target_entity_id, relationship_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, source_entity_id, target_entity_id, relationship_type)
         DO UPDATE SET strength = LEAST(knowledge_relationships.strength + 0.1, 5.0)
         RETURNING *`,
        [userId, sourceEntity.id, targetEntity.id, r.type]
      );
      stored.push(result.rows[0]);
    } catch {
      // Skip on error
    }
  }
  return stored;
}

async function _storeMentions(userId, thoughtId, entities) {
  for (const e of entities) {
    if (!e.id) continue;
    try {
      await pool.query(
        `INSERT INTO knowledge_mentions (user_id, thought_id, entity_id)
         VALUES ($1, $2, $3)`,
        [userId, thoughtId, e.id]
      );
    } catch {
      // Skip on error
    }
  }
}

module.exports = {
  extractKnowledge,
  getKnowledgeGraph,
  searchEntities,
  getEntityDetails,
  SCHEMA,
  RELATIONSHIPS_SCHEMA,
  MENTIONS_SCHEMA,
};
