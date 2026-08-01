# 🚀 Phase 2: Multimodal Processing Implementation Guide

**Project**: Thought GPS - Multi-channel AI Agent  
**Phase**: 2 (Multimodal Processing & Context Retrieval)  
**Date Started**: August 2, 2026  
**Duration**: 3 days (Days 4-6 of 15-day timeline)  
**Status**: 🟢 **IN PROGRESS**  
**Version Target**: v0.2.0

---

## 📋 Phase 2 Overview

### What Phase 2 Delivers
```
✅ Voice transcription with Whisper API
✅ Image understanding with Claude Vision
✅ Semantic embeddings generation
✅ Context retrieval system
✅ Message enrichment pipeline
✅ Vector database integration
✅ Memory system foundation
```

### Phase 2 Goals
1. Process voice messages from all 6 channels
2. Extract text and insights from images
3. Generate semantic embeddings for context
4. Build retrieval system for similar thoughts
5. Enrich messages with multimodal data

### Why Phase 2 Matters
- Enables AI to understand voice and images, not just text
- Creates embeddings for semantic search
- Foundation for Phase 3 LLM routing
- Enables Requirement #1 (intelligent routing)

---

## 🎯 Phase 2 Architecture

### Components to Build

#### 1. Voice Processing Service
```typescript
// packages/multimodal/src/voice/
├── transcriber.ts         # Whisper API integration
├── audio-processor.ts     # Format handling
├── confidence-scorer.ts   # Confidence tracking
└── fallback-handler.ts    # Error handling
```

#### 2. Image Processing Service
```typescript
// packages/multimodal/src/image/
├── vision.ts              # Claude Vision integration
├── image-analyzer.ts      # Image understanding
├── ocr-handler.ts         # Text extraction
└── metadata-extractor.ts  # Image metadata
```

#### 3. Embeddings Service
```typescript
// packages/multimodal/src/embeddings/
├── embedder.ts            # Embedding generation
├── vector-storage.ts      # Vector DB ops
├── similarity-search.ts   # Semantic search
└── batch-processor.ts     # Batch embeddings
```

#### 4. Context Retrieval Service
```typescript
// packages/multimodal/src/context/
├── retriever.ts           # Context retrieval
├── ranker.ts              # Relevance ranking
├── temporal-filter.ts     # Time-based filtering
└── user-filter.ts         # User-based filtering
```

---

## 📅 Day 4-6 Breakdown

### Day 4 (Voice & Image Processing)
**Focus**: Integrate Whisper and Claude Vision

#### Morning Tasks (4 hours)
- [ ] Create @thought-gps/multimodal package
- [ ] Set up Whisper API client
- [ ] Implement voice transcription
- [ ] Add audio format handling
- [ ] Create voice tests

#### Afternoon Tasks (4 hours)
- [ ] Set up Claude Vision API client
- [ ] Implement image analysis
- [ ] Add image format handling
- [ ] Extract OCR text from images
- [ ] Create image tests

### Day 5 (Embeddings & Context)
**Focus**: Semantic understanding and retrieval

#### Morning Tasks (4 hours)
- [ ] Choose embedding model (OpenAI Embeddings)
- [ ] Implement embedding generation
- [ ] Set up vector storage (Pinecone/local)
- [ ] Batch processing setup
- [ ] Create embedding tests

#### Afternoon Tasks (4 hours)
- [ ] Build similarity search
- [ ] Implement context retrieval
- [ ] Add temporal filtering
- [ ] Add user-based filtering
- [ ] Create retrieval tests

### Day 6 (Integration & Optimization)
**Focus**: Message enrichment and production ready

#### Morning Tasks (4 hours)
- [ ] Database schema updates
- [ ] Message enrichment pipeline
- [ ] API integration (POST /process endpoint)
- [ ] Integration tests
- [ ] Error handling

#### Afternoon Tasks (4 hours)
- [ ] Performance optimization
- [ ] Documentation (README, JSDoc)
- [ ] Quality verification (lint, test, build)
- [ ] Final testing
- [ ] GitHub preparation

---

## 🔧 Technical Implementation

### Voice Transcription (Day 4 - AM)

#### Whisper API Setup

```typescript
// packages/multimodal/src/voice/transcriber.ts
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export interface TranscriptionOptions {
  language?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export class VoiceTranscriber {
  private apiKey: string;
  private maxRetries: number = 3;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const { language, temperature = 0, maxRetries = this.maxRetries } = options;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const form = new FormData();
        form.append('file', fs.createReadStream(audioPath));
        form.append('model', 'whisper-1');
        form.append('temperature', temperature.toString());
        
        if (language) {
          form.append('language', language);
        }

        const response = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          form,
          {
            headers: {
              ...form.getHeaders(),
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 60000, // 60 seconds
          }
        );

        return {
          text: response.data.text,
          confidence: 0.95, // Whisper doesn't return confidence
          language: language || 'en',
          duration: this.getAudioDuration(audioPath),
        };
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        await this.exponentialBackoff(attempt);
      }
    }

    throw new Error('Transcription failed after retries');
  }

  private getAudioDuration(filePath: string): number {
    // Use ffprobe or similar to get duration
    // For now, return estimated duration
    return 0;
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### Image Analysis (Day 4 - PM)

```typescript
// packages/multimodal/src/image/vision.ts
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export interface ImageAnalysis {
  description: string;
  text: string; // OCR extracted text
  objects: string[];
  scene: string;
  confidence: number;
}

export class ImageAnalyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(imagePath: string): Promise<ImageAnalysis> {
    try {
      const imageData = this.getImageData(imagePath);

      const response = await this.client.messages.create({
        model: 'claude-3-vision-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: this.getMediaType(imagePath),
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: `Analyze this image and provide:
1. A brief description of what's in the image
2. Any text visible in the image (OCR)
3. Key objects identified
4. Scene context
Format your response as JSON with keys: description, text, objects, scene`,
              },
            ],
          },
        ],
      });

      const analysisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      return this.parseAnalysis(analysisText);
    } catch (error) {
      console.error('Image analysis error:', error);
      throw error;
    }
  }

  private getImageData(imagePath: string): string {
    const buffer = fs.readFileSync(imagePath);
    return buffer.toString('base64');
  }

  private getMediaType(
    imagePath: string
  ): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    const ext = path.extname(imagePath).toLowerCase();
    const mediaTypes: Record<string, any> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mediaTypes[ext] || 'image/jpeg';
  }

  private parseAnalysis(text: string): ImageAnalysis {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          description: text,
          text: '',
          objects: [],
          scene: '',
          confidence: 0.8,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description || '',
        text: parsed.text || '',
        objects: Array.isArray(parsed.objects) ? parsed.objects : [],
        scene: parsed.scene || '',
        confidence: 0.9,
      };
    } catch {
      return {
        description: text,
        text: '',
        objects: [],
        scene: '',
        confidence: 0.6,
      };
    }
  }
}
```

### Embeddings Generation (Day 5 - AM)

```typescript
// packages/multimodal/src/embeddings/embedder.ts
import axios from 'axios';

export interface EmbeddingOptions {
  model?: string;
  maxRetries?: number;
}

export class TextEmbedder {
  private apiKey: string;
  private model: string = 'text-embedding-3-small';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: this.model,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: texts,
          model: this.model,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Sort by index to ensure correct order
      return response.data.data
        .sort((a: any, b: any) => a.index - b.index)
        .map((item: any) => item.embedding);
    } catch (error) {
      console.error('Batch embedding error:', error);
      throw error;
    }
  }
}
```

### Context Retrieval (Day 5 - PM)

```typescript
// packages/multimodal/src/context/retriever.ts
import { PostgresClient } from '@thought-gps/database';

export interface ContextOptions {
  limit?: number;
  threshold?: number;
  timeRange?: number; // days
  userId?: string;
}

export interface RetrievedContext {
  thoughts: Array<{
    id: string;
    text: string;
    similarity: number;
    createdAt: Date;
    channel: string;
  }>;
  totalCount: number;
  avgSimilarity: number;
}

export class ContextRetriever {
  constructor(private db: PostgresClient) {}

  async retrieve(
    embedding: number[],
    options: ContextOptions = {}
  ): Promise<RetrievedContext> {
    const {
      limit = 5,
      threshold = 0.7,
      timeRange = 30,
      userId,
    } = options;

    const query = `
      SELECT 
        id,
        content as text,
        1 - (embedding <-> $1::vector) as similarity,
        created_at,
        channel,
        user_id
      FROM user_thoughts
      WHERE 
        1 - (embedding <-> $1::vector) >= $2
        AND created_at >= NOW() - INTERVAL '${timeRange} days'
        ${userId ? 'AND user_id = $3' : ''}
      ORDER BY similarity DESC
      LIMIT $${userId ? '4' : '3'}
    `;

    const params: any[] = [JSON.stringify(embedding), threshold];
    if (userId) params.push(userId);
    params.push(limit);

    const thoughts = await this.db.query(query, params);

    return {
      thoughts: thoughts.rows,
      totalCount: thoughts.rows.length,
      avgSimilarity:
        thoughts.rows.reduce((sum: number, row: any) => sum + row.similarity, 0) /
        (thoughts.rows.length || 1),
    };
  }
}
```

---

## 💾 Database Schema Updates (Day 6)

```sql
-- Add vector support
CREATE EXTENSION IF NOT EXISTS vector;

-- Update user_thoughts table
ALTER TABLE user_thoughts ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE user_thoughts ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE user_thoughts ADD COLUMN IF NOT EXISTS image_description TEXT;
ALTER TABLE user_thoughts ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE user_thoughts ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_thoughts_embedding ON user_thoughts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_user_thoughts_user_id ON user_thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_thoughts_created_at ON user_thoughts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_thoughts_channel ON user_thoughts(channel);
```

---

## 📦 Package Structure

### Create @thought-gps/multimodal

```bash
mkdir -p packages/multimodal/src/{voice,image,embeddings,context}
mkdir -p packages/multimodal/tests
```

```json
{
  "name": "@thought-gps/multimodal",
  "version": "0.2.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "axios": "^1.6.0",
    "form-data": "^4.0.0",
    "@thought-gps/core": "0.1.0",
    "@thought-gps/database": "0.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Day 5-6)

```typescript
// packages/multimodal/tests/transcriber.test.ts
import { VoiceTranscriber } from '../src/voice/transcriber';

describe('VoiceTranscriber', () => {
  let transcriber: VoiceTranscriber;

  beforeAll(() => {
    transcriber = new VoiceTranscriber(process.env.OPENAI_API_KEY!);
  });

  it('should transcribe audio file', async () => {
    const result = await transcriber.transcribe('test-audio.mp3');
    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle multiple languages', async () => {
    const result = await transcriber.transcribe('test-audio.mp3', {
      language: 'es',
    });
    expect(result.language).toBe('es');
  });
});
```

---

## 🔌 API Integration (Day 6)

### New Endpoint: POST /process

```typescript
// packages/caspian-handler/src/api/routes.ts - New endpoint

router.post('/process', async (req, res) => {
  try {
    const { thoughtId, userId } = req.body;

    // Fetch thought from database
    const thought = await db.query(
      'SELECT * FROM user_thoughts WHERE id = $1 AND user_id = $2',
      [thoughtId, userId]
    );

    if (!thought.rows.length) {
      return res.status(404).json({ error: 'Thought not found' });
    }

    const data = thought.rows[0];

    // Process voice if present
    if (data.voice_url) {
      const transcription = await voiceTranscriber.transcribe(data.voice_url);
      await db.query(
        'UPDATE user_thoughts SET transcription = $1 WHERE id = $2',
        [transcription.text, thoughtId]
      );
    }

    // Process image if present
    if (data.image_url) {
      const analysis = await imageAnalyzer.analyze(data.image_url);
      await db.query(
        'UPDATE user_thoughts SET image_description = $1, extracted_text = $2 WHERE id = $3',
        [analysis.description, analysis.text, thoughtId]
      );
    }

    // Generate embedding
    const embedder = new TextEmbedder(process.env.OPENAI_API_KEY!);
    const embedding = await embedder.embed(data.content);
    await db.query(
      'UPDATE user_thoughts SET embedding = $1 WHERE id = $2',
      [JSON.stringify(embedding), thoughtId]
    );

    // Retrieve context
    const retriever = new ContextRetriever(db);
    const context = await retriever.retrieve(embedding);

    res.json({
      success: true,
      thought: {
        ...data,
        transcription: data.transcription,
        imageDescription: data.image_description,
        extractedText: data.extracted_text,
      },
      context: context.thoughts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## ✅ Quality Checklist (Day 6)

- [ ] All code TypeScript strict mode
- [ ] All functions have JSDoc comments
- [ ] ESLint 0 warnings
- [ ] 80%+ test coverage
- [ ] Error handling on all APIs
- [ ] No hardcoded secrets
- [ ] All dependencies pinned
- [ ] README with examples
- [ ] Build successful (npm run build)
- [ ] Type check passing
- [ ] All tests passing

---

## 📋 Environment Variables (Setup)

```bash
# Whisper API
OPENAI_API_KEY=sk-...

# Claude Vision
ANTHROPIC_API_KEY=sk-ant-...

# Database (PostgreSQL with pgvector extension)
DATABASE_URL=postgresql://user:password@localhost:5432/mindmap
PGVECTOR_ENABLED=true

# Vector Store (if using Pinecone)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=...

# Caching
REDIS_URL=redis://localhost:6379
```

---

## 🔄 Git Workflow for Phase 2

```bash
# Create feature branch
git checkout -b feature/phase-2-multimodal

# Create package
mkdir packages/multimodal
# ... implement code ...

# Commit changes incrementally
git add packages/multimodal/
git commit -m "feat(phase-2): add voice transcription with whisper"

git add packages/multimodal/
git commit -m "feat(phase-2): add image analysis with claude vision"

git add packages/multimodal/
git commit -m "feat(phase-2): add embeddings and semantic search"

# Push feature branch
git push -u origin feature/phase-2-multimodal

# After completion:
git checkout main
git merge feature/phase-2-multimodal
git tag -a v0.2.0 -m "Phase 2: Multimodal Processing & Context Retrieval"
git push origin main
git push origin v0.2.0
```

---

## 📊 Success Criteria

Phase 2 is complete when:

✅ Voice transcription working for all 6 channels
✅ Image analysis returning descriptions and OCR
✅ Embeddings generating for all messages
✅ Context retrieval returning similar thoughts
✅ Database updated with embeddings
✅ All tests passing
✅ Documentation complete
✅ ESLint 0 warnings
✅ Build successful
✅ Pushed to GitHub with v0.2.0 tag

---

## 📞 References

- Whisper API: https://platform.openai.com/docs/api-reference/audio
- Claude Vision: https://docs.anthropic.com/en/docs/vision
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- pgvector: https://github.com/pgvector/pgvector

---

**Phase 2 Implementation Guide Ready**  
**Start Date**: August 2, 2026  
**Target Completion**: August 3, 2026  
**Version**: v0.2.0 (pending)
