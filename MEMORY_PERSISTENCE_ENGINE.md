# Thought GPS: Advanced Memory & Persistence Engine

## 🧠 Multi-Layer Memory Architecture (Inspired by Logseq + Hermes)

### Overview

```
Immediate Memory (Redis) [L1]
       ↓
Working Memory (PostgreSQL) [L2]
       ↓
Long-term Memory (Embeddings + Semantic Search) [L3]
       ↓
Archive Memory (IPFS + Arweave) [L4]
```

---

## Layer 1: Immediate Memory (Redis)

### Purpose
- Active conversation context (last 5 minutes)
- User attention state (awake/asleep mode)
- Real-time notification queue
- Session data

```typescript
// packages/memory-service/immediate-memory.ts

export class ImmediateMemory {
  async storeActiveThought(
    userId: string,
    thought: {
      id: string;
      content: string;
      channel: string;
      timestamp: Date;
      intent: string;
    }
  ): Promise<void> {
    const key = `active_thought:${userId}:${thought.id}`;
    
    // Store in Redis with 5-minute TTL
    await redis.setex(
      key,
      300, // 5 minutes
      JSON.stringify(thought)
    );

    // Track in user's active queue
    await redis.lpush(`active_queue:${userId}`, thought.id);
    await redis.ltrim(`active_queue:${userId}`, 0, 19); // Keep last 20
  }

  async getActiveContext(userId: string): Promise<Thought[]> {
    const queue = await redis.lrange(`active_queue:${userId}`, 0, 19);
    const thoughts: Thought[] = [];

    for (const thoughtId of queue) {
      const key = `active_thought:${userId}:${thoughtId}`;
      const data = await redis.get(key);
      if (data) {
        thoughts.push(JSON.parse(data));
      }
    }

    return thoughts;
  }

  async setUserState(userId: string, state: UserState): Promise<void> {
    await redis.hset(
      `user_state:${userId}`,
      'awake_hours_start',
      state.awake_hours_start.toString()
    );
    await redis.hset(
      `user_state:${userId}`,
      'awake_hours_end',
      state.awake_hours_end.toString()
    );
    await redis.hset(
      `user_state:${userId}`,
      'is_active_now',
      state.is_active_now ? '1' : '0'
    );
    await redis.hset(
      `user_state:${userId}`,
      'focus_mode_enabled',
      state.focus_mode_enabled ? '1' : '0'
    );
  }

  async getUserState(userId: string): Promise<UserState> {
    const state = await redis.hgetall(`user_state:${userId}`);
    return {
      awake_hours_start: parseInt(state.awake_hours_start) || 9,
      awake_hours_end: parseInt(state.awake_hours_end) || 23,
      is_active_now: state.is_active_now === '1',
      focus_mode_enabled: state.focus_mode_enabled === '1',
    };
  }
}
```

---

## Layer 2: Working Memory (PostgreSQL)

### Purpose
- All user thoughts (structured)
- Conversation threads
- User metadata and settings
- Workflow executions
- Note dumps and attachments

```sql
-- Comprehensive schema

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  
  -- Memory settings
  memory_retention_days INT DEFAULT 365,
  auto_archive_days INT DEFAULT 90,
  
  -- Personality/preferences
  timezone VARCHAR(50),
  awake_hours_start INT DEFAULT 9,
  awake_hours_end INT DEFAULT 23,
  preferred_language VARCHAR(10) DEFAULT 'en',
  focus_mode_enabled BOOLEAN DEFAULT false
);

CREATE TABLE thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  raw_input TEXT NOT NULL,
  normalized_text TEXT,
  intent VARCHAR(50), -- 'search', 'book', 'remind', 'task', etc
  channel VARCHAR(20), -- 'whatsapp', 'telegram', etc
  
  -- Metadata
  source_metadata JSONB, -- channel-specific data
  attachments JSONB[], -- URLs to attachments
  
  -- Processing
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  workflow_id UUID,
  
  -- Retrieval
  embedding vector(1536), -- pgvector for semantic search
  tags VARCHAR(50)[],
  
  -- Tracking
  created_at TIMESTAMP DEFAULT now(),
  processed_at TIMESTAMP,
  expires_at TIMESTAMP, -- For GDPR retention
  
  INDEX idx_user_created ON (user_id, created_at DESC),
  INDEX idx_embedding ON (embedding),
  INDEX idx_status ON (user_id, status)
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  format VARCHAR(20) DEFAULT 'markdown', -- markdown, plain, html
  
  -- Organization (Logseq-inspired)
  parent_note_id UUID REFERENCES notes(id),
  linked_note_ids UUID[] DEFAULT '{}',
  tags VARCHAR(50)[],
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Search
  embedding vector(1536),
  
  INDEX idx_user_notes ON (user_id, created_at DESC)
);

CREATE TABLE note_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  backup_type VARCHAR(20), -- 'manual', 'scheduled', 'auto'
  backup_date DATE,
  
  -- File storage
  local_file_path VARCHAR(255),
  ipfs_hash VARCHAR(255), -- Optional: backed up to IPFS
  arweave_tx_id VARCHAR(255), -- Optional: logged to Arweave
  
  file_size INT,
  file_count INT,
  
  created_at TIMESTAMP DEFAULT now(),
  
  INDEX idx_user_backups ON (user_id, backup_date DESC)
);

CREATE TABLE thought_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_thought_id UUID REFERENCES thoughts(id) ON DELETE CASCADE,
  target_thought_id UUID REFERENCES thoughts(id) ON DELETE CASCADE,
  
  connection_type VARCHAR(50), -- 'similar', 'references', 'contradicts', etc
  strength FLOAT, -- 0.0-1.0 confidence
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE memory_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  insight_type VARCHAR(50), -- 'pattern', 'gap', 'opportunity'
  description TEXT,
  related_thoughts UUID[],
  
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Layer 3: Long-Term Memory (Embeddings + Semantic Search)

### Purpose
- Remember user patterns and preferences
- Semantic similarity matching
- Knowledge graph construction
- User-specific insights

```typescript
// packages/memory-service/semantic-memory.ts

import { Pinecone } from '@pinecone-database/pinecone';

export class SemanticMemory {
  private pinecone: Pinecone;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  async storeThoughtEmbedding(
    userId: string,
    thought: {
      id: string;
      content: string;
      intent: string;
      timestamp: Date;
    }
  ): Promise<void> {
    // Generate embedding
    const embedding = await this.generateEmbedding(thought.content);

    // Store in Pinecone
    const index = this.pinecone.index('thought-gps');
    
    await index.upsert([
      {
        id: `${userId}:${thought.id}`,
        values: embedding,
        metadata: {
          user_id: userId,
          thought_id: thought.id,
          content: thought.content,
          intent: thought.intent,
          timestamp: thought.timestamp.toISOString(),
        },
      },
    ]);

    // Also store in PostgreSQL for backup
    await db.query(
      `UPDATE thoughts SET embedding = $1 WHERE id = $2`,
      [embedding, thought.id]
    );
  }

  async findSimilarThoughts(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<Thought[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Search Pinecone
    const index = this.pinecone.index('thought-gps');
    const results = await index.query({
      vector: queryEmbedding,
      topK: limit,
      filter: {
        user_id: userId, // Only user's own thoughts
      },
    });

    // Fetch full thought data from PostgreSQL
    const thoughtIds = results.matches.map(m => m.metadata.thought_id);
    
    const thoughts = await db.query(
      `SELECT * FROM thoughts WHERE id = ANY($1::uuid[])`,
      [thoughtIds]
    );

    return thoughts;
  }

  async buildKnowledgeGraph(userId: string): Promise<KnowledgeGraph> {
    // Analyze all user thoughts and build graph of concepts
    const thoughts = await db.query(
      `SELECT id, content, intent FROM thoughts 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1000`,
      [userId]
    );

    const concepts = new Set<string>();
    const connections: Array<[string, string, number]> = [];

    for (let i = 0; i < thoughts.length; i++) {
      for (let j = i + 1; j < thoughts.length; j++) {
        const sim = await this.computeSimilarity(
          thoughts[i].content,
          thoughts[j].content
        );

        if (sim > 0.7) {
          connections.push([
            thoughts[i].id,
            thoughts[j].id,
            sim,
          ]);
        }
      }
    }

    return {
      concepts: Array.from(concepts),
      connections,
      generated_at: new Date(),
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use Featherless or OpenAI embeddings
    const response = await fetch('https://api.featherless.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  private async computeSimilarity(text1: string, text2: string): Promise<number> {
    const [emb1, emb2] = await Promise.all([
      this.generateEmbedding(text1),
      this.generateEmbedding(text2),
    ]);

    // Cosine similarity
    return this.cosineSimilarity(emb1, emb2);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

---

## Layer 4: Archive Memory (IPFS + Arweave)

### Purpose
- Permanent backup (user never loses data)
- User can export their entire memory
- Decentralized, censorship-resistant
- Optional blockchain attestation

```typescript
// packages/memory-service/archive-memory.ts

export class ArchiveMemory {
  async exportUserMemory(userId: string): Promise<MemoryExport> {
    // 1. Fetch all user data
    const thoughts = await db.query(
      'SELECT * FROM thoughts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const notes = await db.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const userMetadata = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    // 2. Create export file (JSON Lines format for easy streaming)
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        format_version: '1.0',
        user_id: userId,
      },
      thoughts,
      notes,
      user: userMetadata[0],
    };

    // 3. Compress as JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    const compressed = await compress(jsonString);

    // 4. Upload to IPFS
    const ipfsHash = await this.uploadToIPFS(compressed);

    // 5. Log to Arweave
    const arweaveTxId = await this.logToArweave({
      type: 'memory_export',
      user_id: userId,
      ipfs_hash: ipfsHash,
      file_size: compressed.length,
      timestamp: new Date().toISOString(),
    });

    return {
      ipfs_hash: ipfsHash,
      arweave_tx_id: arweaveTxId,
      file_size: compressed.length,
      exported_at: new Date(),
    };
  }

  async scheduleWeeklyExport(userId: string): Promise<void> {
    // Setup cron job for every Saturday at 2 AM
    const job = new CronJob('0 2 * * 6', async () => {
      try {
        const export_data = await this.exportUserMemory(userId);

        // Store export metadata
        await db.query(
          `INSERT INTO note_backups 
           (user_id, backup_type, backup_date, ipfs_hash, arweave_tx_id, file_size)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            'scheduled',
            new Date(),
            export_data.ipfs_hash,
            export_data.arweave_tx_id,
            export_data.file_size,
          ]
        );

        // Notify user
        await sendNotification(userId, {
          message: `✓ Weekly memory backup complete. ${export_data.file_size} bytes backed up to IPFS.`,
          channels: ['email'],
        });
      } catch (error) {
        console.error('Weekly export failed:', error);
        await sendNotification(userId, {
          message: '⚠ Weekly backup failed. Please contact support.',
          channels: ['email'],
        });
      }
    });

    job.start();
  }

  private async uploadToIPFS(fileBuffer: Buffer): Promise<string> {
    const client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
    });

    const result = await client.add(fileBuffer);
    return result.path; // QmXXX...
  }

  private async logToArweave(data: any): Promise<string> {
    const tx = await arweave.createTransaction({
      data: JSON.stringify(data),
    });

    tx.addTag('type', 'memory_export');
    tx.addTag('service', 'thought-gps');

    await arweave.transactions.sign(tx, arweaveKey);
    await arweave.transactions.submit(tx);

    return tx.id;
  }

  async downloadFromIPFS(ipfsHash: string): Promise<Buffer> {
    const client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
    });

    const chunks = [];
    for await (const chunk of client.cat(ipfsHash)) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
```

---

## Memory Lifecycle Management

```typescript
// packages/memory-service/memory-lifecycle.ts

export class MemoryLifecycleManager {
  async runMaintenanceJob(): Promise<void> {
    // Run daily
    
    // 1. Archive old thoughts (>90 days)
    await this.archiveOldThoughts();

    // 2. Generate memory insights
    await this.generateInsights();

    // 3. Update knowledge graphs
    await this.updateKnowledgeGraphs();

    // 4. Cleanup expired data
    await this.cleanupExpiredData();
  }

  private async archiveOldThoughts(): Promise<void> {
    const thoughts = await db.query(
      `SELECT id, user_id FROM thoughts 
       WHERE created_at < now() - interval '90 days'
       AND status = 'completed'
       LIMIT 1000`
    );

    for (const thought of thoughts) {
      // Move to archive (lower-priority storage)
      await db.query(
        'UPDATE thoughts SET archived_at = now() WHERE id = $1',
        [thought.id]
      );
    }
  }

  private async generateInsights(): Promise<void> {
    // Analyze user patterns
    const users = await db.query('SELECT id FROM users');

    for (const user of users) {
      const insights = await this.analyzeUserPatterns(user.id);

      for (const insight of insights) {
        await db.query(
          `INSERT INTO memory_insights 
           (user_id, insight_type, description, created_at)
           VALUES ($1, $2, $3, $4)`,
          [user.id, insight.type, insight.description, new Date()]
        );
      }
    }
  }

  private async analyzeUserPatterns(userId: string): Promise<Insight[]> {
    // Example insights:
    // - "You mention 'projects' 3x per week"
    // - "Your most productive time is 9-11 AM"
    // - "You forget to follow up on 40% of tasks"
    
    const insights: Insight[] = [];

    // Pattern detection...
    return insights;
  }
}
```

---

## ✅ Memory Persistence Checklist

- [ ] Immediate memory (Redis) for active context
- [ ] Working memory (PostgreSQL) for all thoughts
- [ ] Note storage with hierarchical linking (Logseq-style)
- [ ] Semantic embeddings (Pinecone or pgvector)
- [ ] Knowledge graph generation
- [ ] Weekly automated backups (Saturdays)
- [ ] IPFS integration for decentralized storage
- [ ] Arweave logging for immutable audit
- [ ] User export/download functionality
- [ ] Memory insights generation
- [ ] Automatic archival of old thoughts
- [ ] Data retention policies (GDPR compliant)
- [ ] Recovery mechanisms (restore from IPFS)

