# Thought GPS: Voice Processing & Audio Engine

## 🎤 Zero-Cost Voice Pipeline

### Architecture Overview

```
User Voice Input
      ↓
Whisper (Speech-to-Text) [Free tier]
      ↓
Text Processing + Intent Detection
      ↓
Agent Processing + Response Generation
      ↓
pyttsx3 / Piper TTS (Text-to-Speech) [Local, lightweight]
      ↓
Voice Output to User's Channel
```

**Cost**: $0 (No external TTS APIs needed)

---

## 1. SPEECH-TO-TEXT (Whisper)

### Why Whisper?

- ✅ OpenAI Whisper (free via local model or Featherless)
- ✅ 99% accuracy on common accents
- ✅ Supports 99 languages
- ✅ Handles background noise well
- ✅ Fast inference (2-3 seconds for 30s audio)

### Implementation

```typescript
// packages/multimodal-processor/voice-engine.ts

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

export class VoiceToTextEngine {
  private anthropic: Anthropic;
  private whisperCache: Map<string, TranscriptionResult> = new Map();

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.FEATHERLESS_API_KEY,
    });
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    userId: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    try {
      // 1. Validate audio
      this.validateAudioFormat(audioBuffer);

      // 2. Check cache (avoid re-processing)
      const cacheKey = this.generateCacheKey(audioBuffer);
      if (this.whisperCache.has(cacheKey)) {
        return this.whisperCache.get(cacheKey)!;
      }

      // 3. Compress audio if needed (reduce payload)
      const optimizedAudio = await this.optimizeAudio(audioBuffer);

      // 4. Transcribe with Whisper
      const transcript = await this.callWhisper(optimizedAudio, options);

      // 5. Post-process (clean up, detect language, etc)
      const processed = this.postProcessTranscript(transcript);

      // 6. Cache result
      this.whisperCache.set(cacheKey, processed);

      // 7. Log
      await this.logTranscription(userId, processed);

      return processed;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  private async callWhisper(
    audioBuffer: Buffer,
    options?: TranscriptionOptions
  ): Promise<string> {
    // Using Featherless.ai Whisper endpoint
    const response = await fetch('https://api.featherless.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
      },
      body: this.createFormData(audioBuffer),
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }

  private validateAudioFormat(audioBuffer: Buffer): void {
    // Check for valid audio signatures
    const header = audioBuffer.subarray(0, 12);
    
    const isWav = header.toString('utf8', 0, 4) === 'RIFF';
    const isWebm = header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    const isMp3 = header.subarray(0, 3).equals(Buffer.from([0xff, 0xfb]));
    const isOgg = header.toString('utf8', 0, 4) === 'OggS';

    if (!isWav && !isWebm && !isMp3 && !isOgg) {
      throw new Error('Invalid audio format. Expected WAV, WebM, MP3, or OGG.');
    }

    // Size check (max 25MB for Whisper)
    if (audioBuffer.length > 25 * 1024 * 1024) {
      throw new Error('Audio file too large (max 25MB).');
    }
  }

  private async optimizeAudio(audioBuffer: Buffer): Promise<Buffer> {
    // Compress audio to reduce payload
    // Using ffmpeg or node-wav library
    // Goal: Reduce 5MB file to <1MB without losing quality
    
    // For now, return as-is (Whisper handles it)
    // Future: Implement compression if needed
    return audioBuffer;
  }

  private postProcessTranscript(transcript: string): TranscriptionResult {
    return {
      text: transcript.trim(),
      language: this.detectLanguage(transcript),
      confidence: 0.95, // Whisper doesn't provide per-word confidence
      duration_ms: 0, // Would be calculated from audio
      timestamp: new Date().toISOString(),
    };
  }

  private generateCacheKey(audioBuffer: Buffer): string {
    return createHash('sha256').update(audioBuffer).digest('hex');
  }

  private detectLanguage(text: string): string {
    // Simple heuristic or use language-detect library
    // For now, default to English
    return 'en';
  }

  private async logTranscription(userId: string, result: TranscriptionResult): Promise<void> {
    await db.query(
      `INSERT INTO transcriptions (user_id, text, language, created_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, result.text, result.language, result.timestamp]
    );
  }

  private createFormData(audioBuffer: Buffer): FormData {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }));
    formData.append('model', 'whisper-1');
    return formData;
  }
}
```

---

## 2. TEXT-TO-SPEECH (Local, Lightweight)

### Why Piper + pyttsx3?

- ✅ Piper: 50MB per voice model (vs 500MB+ for others)
- ✅ pyttsx3: System TTS fallback (Windows/Mac/Linux)
- ✅ Natural sounding voices
- ✅ Low latency (1-2 seconds)
- ✅ Zero cost
- ✅ Works offline

### Installation

```bash
# Piper TTS (lightweight)
npm install @piper-tts/core

# Fallback: pyttsx3 (Python, system-wide)
pip install pyttsx3

# Audio handling
npm install wav-encoder pcm-player
```

### Implementation

```typescript
// packages/multimodal-processor/text-to-speech-engine.ts

import PiperTTS from '@piper-tts/core';
import { spawn } from 'child_process';
import * as fs from 'fs';

export class TextToSpeechEngine {
  private piperTts: PiperTTS | null = null;
  private voiceModels: Map<string, string> = new Map([
    ['en-us', 'path/to/en_US-lessac-medium.onnx'],
    ['es-es', 'path/to/es_ES-carme-x-low.onnx'],
    ['fr-fr', 'path/to/fr_FR-siwis-medium.onnx'],
  ]);

  async initialize(): Promise<void> {
    try {
      this.piperTts = await PiperTTS.create();
      console.log('✓ Piper TTS initialized');
    } catch (error) {
      console.warn('⚠ Piper TTS initialization failed, will use fallback');
      // Fallback to pyttsx3
    }
  }

  async synthesizeSpeech(
    text: string,
    userId: string,
    options?: TTSOptions
  ): Promise<AudioBuffer> {
    try {
      // 1. Validate input
      if (text.length > 5000) {
        text = text.substring(0, 5000) + '...';
      }

      // 2. Choose language
      const language = options?.language || 'en-us';
      const modelPath = this.voiceModels.get(language);

      if (!modelPath) {
        throw new Error(`Language ${language} not supported`);
      }

      // 3. Synthesize with Piper
      let audioBuffer: Buffer;
      try {
        audioBuffer = await this.synthesizeWithPiper(text, modelPath);
      } catch (piperError) {
        console.warn('Piper TTS failed, falling back to pyttsx3');
        audioBuffer = await this.synthesizeWithPyttsx3(text, language);
      }

      // 4. Optimize audio
      const optimized = await this.optimizeAudio(audioBuffer);

      // 5. Cache for reuse
      await this.cacheAudio(text, language, optimized);

      return optimized;
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw new Error(`Failed to synthesize speech: ${error.message}`);
    }
  }

  private async synthesizeWithPiper(
    text: string,
    modelPath: string
  ): Promise<Buffer> {
    if (!this.piperTts) {
      throw new Error('Piper TTS not initialized');
    }

    // Piper synthesis
    const audioData = await this.piperTts.textToSpeech(text, {
      modelPath,
      speakerIdOrName: 0, // Default speaker
      length_scale: 1.0, // Speed
    });

    return Buffer.from(audioData);
  }

  private async synthesizeWithPyttsx3(
    text: string,
    language: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import pyttsx3
import sys
import base64

engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Speed
engine.setProperty('volume', 1)  # Volume

# Save to temp file
temp_file = '/tmp/tts_output.wav'
engine.save_to_file('${text}', temp_file)
engine.runAndWait()

# Read and encode
with open(temp_file, 'rb') as f:
    sys.stdout.buffer.write(f.read())
`;

      const python = spawn('python3', ['-c', pythonScript]);
      const chunks: Buffer[] = [];

      python.stdout.on('data', (data) => {
        chunks.push(data);
      });

      python.stderr.on('data', (data) => {
        reject(new Error(data.toString()));
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pyttsx3 failed with code ${code}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });

      python.on('error', reject);
    });
  }

  private async optimizeAudio(audioBuffer: Buffer): Promise<Buffer> {
    // Compress audio to MP3 or OGG for smaller payload
    // Using ffmpeg or node libraries
    // Target: Keep audio high quality but reduce file size
    
    // For now, return as-is
    // Implement compression if needed for bandwidth reasons
    return audioBuffer;
  }

  private async cacheAudio(
    text: string,
    language: string,
    audioBuffer: Buffer
  ): Promise<void> {
    const cacheKey = `tts:${createHash('sha256').update(text + language).digest('hex')}`;
    
    // Store in Redis for 7 days
    await redis.setex(cacheKey, 604800, audioBuffer);

    // Also store file on disk for permanent cache
    const cachePath = path.join(
      process.env.TTS_CACHE_DIR || '/tmp/tts_cache',
      `${cacheKey}.wav`
    );
    
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, audioBuffer);
  }
}
```

---

## 3. VOICE MODE TOGGLE

```typescript
// packages/multimodal-processor/voice-mode-manager.ts

export class VoiceModeManager {
  async setVoiceModePreference(
    userId: string,
    preference: VoicePreference
  ): Promise<void> {
    await db.query(
      `UPDATE users 
       SET voice_mode_enabled = $1,
           voice_language = $2,
           voice_speed = $3,
           voice_gender = $4
       WHERE id = $5`,
      [
        preference.enabled,
        preference.language || 'en-us',
        preference.speed || 1.0,
        preference.gender || 'neutral',
        userId,
      ]
    );
  }

  async processWithVoice(
    thought: string,
    userId: string
  ): Promise<{ text: string; audio?: Buffer }> {
    // Get user preference
    const user = await db.query(
      'SELECT voice_mode_enabled, voice_language FROM users WHERE id = $1',
      [userId]
    );

    if (!user.voice_mode_enabled) {
      return { text: thought };
    }

    // Synthesize response
    const ttsEngine = new TextToSpeechEngine();
    const audio = await ttsEngine.synthesizeSpeech(thought, userId, {
      language: user.voice_language,
    });

    return { text: thought, audio };
  }
}
```

---

## 4. CACHING STRATEGY (Zero Re-Processing)

```typescript
// Cache layer for voice processing

// 1. Input deduplication
const inputCache = new Map<string, TranscriptionResult>();

// 2. Redis cache (1 week TTL)
async function getCachedTranscription(audioHash: string) {
  return await redis.get(`transcription:${audioHash}`);
}

// 3. PostgreSQL long-term storage
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  audio_hash VARCHAR(64) UNIQUE,
  text TEXT NOT NULL,
  language VARCHAR(10),
  created_at TIMESTAMP,
  cached_at TIMESTAMP
);

// 4. TTS caching
CREATE TABLE tts_cache (
  id UUID PRIMARY KEY,
  text_hash VARCHAR(64) UNIQUE,
  language VARCHAR(10),
  audio_blob BYTEA,
  created_at TIMESTAMP
);
```

---

## 5. VOICE QUALITY MONITORING

```typescript
// Monitor voice quality and user satisfaction

export class VoiceMetricsMonitor {
  async trackVoiceInteraction(
    userId: string,
    interaction: VoiceInteraction
  ): Promise<void> {
    await db.query(
      `INSERT INTO voice_metrics (
        user_id, transcription_confidence, tts_quality_rating,
        processing_time_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        interaction.transcription_confidence,
        interaction.tts_quality_rating,
        interaction.processing_time_ms,
        new Date(),
      ]
    );

    // Track metrics
    metrics.histogram('voice.transcription_confidence', 
      interaction.transcription_confidence);
    metrics.histogram('voice.processing_time_ms', 
      interaction.processing_time_ms);
  }

  async getUserVoiceQualityReport(userId: string) {
    return await db.query(
      `SELECT 
        AVG(transcription_confidence) as avg_confidence,
        AVG(tts_quality_rating) as avg_tts_quality,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(*) as total_interactions
       FROM voice_metrics
       WHERE user_id = $1 AND created_at > now() - interval '30 days'
       GROUP BY user_id`,
      [userId]
    );
  }
}
```

---

## ✅ Voice Processing Checklist

- [ ] Whisper integration (free via Featherless)
- [ ] Audio validation (format, size)
- [ ] Transcription caching (Redis + PostgreSQL)
- [ ] Piper TTS initialized
- [ ] pyttsx3 fallback ready
- [ ] Voice mode toggle in user settings
- [ ] TTS caching (avoid re-generation)
- [ ] Language detection
- [ ] Audio compression (optional, for bandwidth)
- [ ] Voice quality metrics tracked
- [ ] Error logging for voice failures
- [ ] Rate limiting on transcription/synthesis
- [ ] Support for 6+ languages

