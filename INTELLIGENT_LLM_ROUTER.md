# Thought GPS: Intelligent Multimodal LLM Router

## 🎯 Smart Input Routing Architecture

The system automatically routes inputs to the most appropriate LLM based on:
1. **Input type** (voice, text, image)
2. **Complexity** (simple vs complex reasoning)
3. **Context** (user preferences, past performance)
4. **Availability** (rate limits, network health)
5. **Cost** (free tier priority, then paid)

---

## Architecture Overview

```
Input (Voice/Text/Image)
    ↓
Type Detection + Preprocessing
    ↓
┌─────────────────────────────────────────────┐
│   Intelligent Router Decision Engine        │
│  (Selects best LLM for this task)           │
└─────────────────────────────────────────────┘
    ↓
    ├─→ Route A: Featherless.ai (Primary)
    │   ├─ Voice: Whisper + Llama 3
    │   ├─ Text: Llama 3 / Claude (via proxy)
    │   └─ Image: Claude Vision
    │
    ├─→ Route B: Ollama (Local, free, offline)
    │   ├─ Voice: Whisper-local
    │   ├─ Text: Mistral / Llama 2
    │   └─ Image: LLaVA
    │
    ├─→ Route C: OpenAI (User's API key)
    │   ├─ Voice: Whisper
    │   ├─ Text: GPT-4 / GPT-3.5
    │   └─ Image: GPT-4 Vision
    │
    ├─→ Route D: Anthropic (User's API key)
    │   ├─ Voice: Via transcript
    │   ├─ Text: Claude 3
    │   └─ Image: Claude 3 Vision
    │
    └─→ Route E: User's Custom APIs
        └─ Any configured endpoint

    ↓
Health Check + Rate Limit Check
    ↓
If Primary Fails → Try Next Route
    ↓
Response Aggregation + Caching
    ↓
Output to User
```

---

## 1. Input Type Detection

```typescript
// packages/router/input-detector.ts

export class InputTypeDetector {
  async detectInputType(input: any): Promise<InputType> {
    // Check if voice
    if (input.type === 'voice' || input.audio_buffer) {
      return this.analyzeVoice(input);
    }

    // Check if image
    if (input.type === 'image' || input.image_buffer) {
      return this.analyzeImage(input);
    }

    // Check if text
    if (typeof input === 'string' || input.content) {
      return this.analyzeText(input);
    }

    throw new Error('Unknown input type');
  }

  private async analyzeVoice(input: any): Promise<VoiceInputType> {
    const duration = await this.getAudioDuration(input.audio_buffer);
    const hasNoise = await this.detectBackgroundNoise(input.audio_buffer);

    return {
      type: 'voice',
      duration_ms: duration,
      has_noise: hasNoise,
      confidence: 0.95,
      recommended_router: 'whisper', // Always use Whisper for voice
    };
  }

  private async analyzeImage(input: any): Promise<ImageInputType> {
    const size = input.image_buffer.length;
    const hasText = await this.detectTextInImage(input.image_buffer);
    const isComplex = await this.estimateComplexity(input.image_buffer);

    return {
      type: 'image',
      size_bytes: size,
      has_text: hasText,
      complexity: isComplex ? 'high' : 'low',
      confidence: 0.9,
      // Complex images need Claude Vision
      recommended_router: isComplex ? 'claude-vision' : 'llava',
    };
  }

  private async analyzeText(input: any): Promise<TextInputType> {
    const text = typeof input === 'string' ? input : input.content;
    const tokens = text.split(/\s+/).length;
    const complexity = this.estimateComplexity(text);

    return {
      type: 'text',
      tokens: tokens,
      complexity: complexity,
      confidence: 1.0,
      // Simple texts can use faster/cheaper models
      recommended_router: complexity === 'high' ? 'gpt4' : 'llama3',
    };
  }

  private estimateComplexity(text: string): 'low' | 'medium' | 'high' {
    // Heuristic: punctuation, sentence length, technical terms
    const sentences = text.split(/[.!?]+/).length;
    const avgSentenceLength = text.length / sentences;
    const hasTechnicalTerms = /algorithm|architecture|framework|pattern/i.test(text);

    if (avgSentenceLength > 30 && hasTechnicalTerms) return 'high';
    if (avgSentenceLength > 20) return 'medium';
    return 'low';
  }
}
```

---

## 2. Intelligent Router with Fallback Chain

```typescript
// packages/router/intelligent-router.ts

export class IntelligentLLMRouter {
  private readonly routes: Map<string, LLMRoute> = new Map();
  private readonly routeHealth: Map<string, RouteHealth> = new Map();
  private readonly rateLimitTracker: RateLimitTracker;

  constructor() {
    this.initializeRoutes();
    this.startHealthChecks();
  }

  private initializeRoutes(): void {
    // Route 1: Featherless.ai (Primary - free hackathon credit)
    this.routes.set('featherless', {
      name: 'Featherless.ai',
      endpoint: 'https://api.featherless.ai/v1',
      apiKey: process.env.FEATHERLESS_API_KEY,
      models: {
        voice: 'whisper-1',
        text: 'meta-llama/Llama-2-70b-chat-hf',
        image: 'claude-3-vision', // Via proxy
      },
      priority: 1, // Highest priority
      rateLimit: { requests_per_minute: 60, tokens_per_minute: 100000 },
      cost: 0, // Free during hackathon
      fallbackTo: 'ollama',
    });

    // Route 2: Ollama (Local - free, offline capable)
    this.routes.set('ollama', {
      name: 'Ollama Local',
      endpoint: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      apiKey: null, // No auth needed
      models: {
        voice: 'whisper', // Local Whisper
        text: 'mistral',
        image: 'llava',
      },
      priority: 2,
      rateLimit: { requests_per_minute: 1000, tokens_per_minute: 1000000 }, // Unlimited local
      cost: 0,
      fallbackTo: 'openai',
      offline_capable: true,
    });

    // Route 3: OpenAI (User's API key)
    this.routes.set('openai', {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      models: {
        voice: 'whisper-1',
        text: 'gpt-4',
        image: 'gpt-4-vision',
      },
      priority: 3,
      rateLimit: { requests_per_minute: 90, tokens_per_minute: 3000000 },
      cost: 0.03, // Per 1K tokens
      fallbackTo: 'anthropic',
    });

    // Route 4: Anthropic (User's API key)
    this.routes.set('anthropic', {
      name: 'Anthropic Claude',
      endpoint: 'https://api.anthropic.com',
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: {
        voice: null, // No voice model, needs transcript
        text: 'claude-3-opus',
        image: 'claude-3-opus-vision',
      },
      priority: 4,
      rateLimit: { requests_per_minute: 50, tokens_per_minute: 4000000 },
      cost: 0.015,
      fallbackTo: 'custom',
    });

    // Route 5: User's Custom APIs (OmniRoute configured)
    this.routes.set('custom', {
      name: 'User Custom APIs',
      endpoint: null, // Dynamic from OmniRoute
      apiKey: null, // From user's configured keys
      models: {
        voice: null,
        text: 'custom',
        image: null,
      },
      priority: 5,
      rateLimit: { requests_per_minute: 100, tokens_per_minute: 100000 }, // Conservative
      cost: 'variable',
      fallbackTo: null,
    });
  }

  async route(request: LLMRequest): Promise<LLMResponse> {
    const userId = request.user_id;
    const inputType = request.input_type; // 'voice', 'text', 'image'

    logger.info({
      userId,
      inputType,
      complexity: request.complexity,
    }, 'Routing LLM request');

    // 1. Get priority-ordered routes for this input type
    const candidateRoutes = this.getCandidateRoutes(inputType, userId);

    // 2. Try each route in order until success
    for (const routeName of candidateRoutes) {
      try {
        const route = this.routes.get(routeName);
        if (!route) continue;

        // 3. Check health & rate limits
        if (!await this.isRouteHealthy(routeName)) {
          logger.warn({ route: routeName }, 'Route unhealthy, skipping');
          continue;
        }

        if (!await this.checkRateLimit(userId, routeName)) {
          logger.warn({ route: routeName }, 'Rate limit exceeded, trying next');
          continue;
        }

        // 4. Execute request
        const response = await this.executeRequest(route, request);

        // 5. Cache successful response
        await this.cacheResponse(userId, request, response, routeName);

        // 6. Mark route as healthy
        this.recordSuccessfulRoute(routeName);

        logger.info({ route: routeName, tokens: response.tokens_used }, 'LLM request succeeded');

        return response;
      } catch (error) {
        logger.error({ route: routeName, error }, 'Route failed, trying next');
        this.recordFailedRoute(routeName);
        continue; // Try next route
      }
    }

    // 7. All routes failed - try cache or return partial
    logger.error({ userId, inputType }, 'All routes exhausted');
    return this.handleAllRoutesFailed(userId, request);
  }

  private getCandidateRoutes(inputType: string, userId: string): string[] {
    const priority: string[] = [];

    // Always prefer Featherless first (free credit)
    if (inputType === 'voice') {
      priority.push('featherless'); // Has Whisper
    } else if (inputType === 'image') {
      priority.push('featherless'); // Claude Vision proxy
    } else if (inputType === 'text') {
      priority.push('featherless'); // Best model
    }

    // Then try Ollama (local, always available if running)
    priority.push('ollama');

    // Then user's paid APIs
    if (process.env.OPENAI_API_KEY) priority.push('openai');
    if (process.env.ANTHROPIC_API_KEY) priority.push('anthropic');

    // Finally custom routes
    priority.push('custom');

    return priority;
  }

  private async isRouteHealthy(routeName: string): Promise<boolean> {
    const health = this.routeHealth.get(routeName);

    if (!health) {
      return true; // First request, assume healthy
    }

    // If failed recently, give it time before retrying
    if (health.consecutive_failures > 3) {
      const timeSinceFail = Date.now() - health.last_failure_time;
      if (timeSinceFail < 60000) { // Give 60s before retry
        return false;
      }
    }

    return true;
  }

  private async checkRateLimit(
    userId: string,
    routeName: string
  ): Promise<boolean> {
    const route = this.routes.get(routeName);
    if (!route) return false;

    const key = `ratelimit:${userId}:${routeName}`;
    const current = await redis.incr(key);

    if (current === 1) {
      // Set TTL on first increment
      await redis.expire(key, 60); // Per minute
    }

    const withinLimit = current <= route.rateLimit.requests_per_minute;

    if (!withinLimit) {
      logger.warn({
        userId,
        route: routeName,
        current,
        limit: route.rateLimit.requests_per_minute,
      }, 'Rate limit exceeded');
    }

    return withinLimit;
  }

  private async executeRequest(
    route: LLMRoute,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const model = route.models[request.input_type];

    if (!model) {
      throw new Error(`Route ${route.name} does not support ${request.input_type} input`);
    }

    // Determine endpoint
    let endpoint: string;
    if (route.endpoint === null) {
      // Custom route - use OmniRoute
      endpoint = await this.getCustomEndpoint(request.user_id);
    } else {
      endpoint = route.endpoint;
    }

    // Format request for this LLM
    const formattedRequest = this.formatRequest(model, request, route);

    // Call LLM
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${route.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedRequest),
    });

    if (!response.ok) {
      throw new Error(`LLM error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      model: model,
      route: route.name,
      tokens_used: data.usage.total_tokens,
      latency_ms: 0, // Would be measured
      cost: this.calculateCost(route, data.usage.total_tokens),
    };
  }

  private formatRequest(
    model: string,
    request: LLMRequest,
    route: LLMRoute
  ): any {
    // Format system prompt (immutable)
    const systemPrompt = this.getSystemPrompt();

    // Format user message based on input type
    let userContent: any;

    if (request.input_type === 'voice') {
      // Transcript already available
      userContent = request.transcript;
    } else if (request.input_type === 'image') {
      // Image as base64
      userContent = [
        { type: 'text', text: request.text_context || '' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${request.image_base64}` } },
      ];
    } else {
      // Text
      userContent = request.content;
    }

    return {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: false,
    };
  }

  private async cacheResponse(
    userId: string,
    request: LLMRequest,
    response: LLMResponse,
    routeName: string
  ): Promise<void> {
    const cacheKey = `llm_response:${userId}:${this.hashRequest(request)}`;

    await redis.setex(cacheKey, 3600, JSON.stringify({
      ...response,
      cached_route: routeName,
      cached_at: new Date().toISOString(),
    }));
  }

  private recordSuccessfulRoute(routeName: string): void {
    this.routeHealth.set(routeName, {
      consecutive_failures: 0,
      last_success_time: Date.now(),
      last_failure_time: null,
    });
  }

  private recordFailedRoute(routeName: string): void {
    const health = this.routeHealth.get(routeName) || {
      consecutive_failures: 0,
      last_success_time: null,
      last_failure_time: null,
    };

    health.consecutive_failures++;
    health.last_failure_time = Date.now();

    this.routeHealth.set(routeName, health);
  }

  private async handleAllRoutesFailed(
    userId: string,
    request: LLMRequest
  ): Promise<LLMResponse> {
    // Try to get from cache
    const cacheKey = `llm_response:${userId}:${this.hashRequest(request)}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.info({ userId }, 'Returning cached response (all routes failed)');
      return JSON.parse(cached);
    }

    // No cache - return graceful failure
    logger.error({ userId }, 'No routes available and no cache');

    return {
      content: '⚠️ System is currently overloaded. Your request has been queued and will be processed in a few moments. Please wait and try again.',
      model: 'fallback',
      route: 'cache_or_queue',
      tokens_used: 0,
      latency_ms: 0,
      cost: 0,
      is_cached: true,
    };
  }

  private getSystemPrompt(): string {
    // Immutable system prompt (from SystemPromptManager)
    return systemPromptManager.getSystemPrompt();
  }

  private calculateCost(route: LLMRoute, tokens: number): number {
    if (route.cost === 0) return 0;
    // Cost per 1K tokens
    return (tokens / 1000) * (route.cost as number);
  }

  private hashRequest(request: LLMRequest): string {
    return createHash('sha256')
      .update(JSON.stringify({
        input_type: request.input_type,
        content: request.content,
      }))
      .digest('hex');
  }

  private async getCustomEndpoint(userId: string): Promise<string> {
    // Fetch from OmniRoute configuration
    const userConfig = await db.query(
      'SELECT custom_llm_endpoint FROM users WHERE id = $1',
      [userId]
    );

    return userConfig.custom_llm_endpoint || 'http://localhost:8000';
  }

  private startHealthChecks(): void {
    // Every 5 minutes, check health of all routes
    setInterval(async () => {
      for (const [routeName, route] of this.routes) {
        try {
          const response = await fetch(`${route.endpoint}/models`);
          if (response.ok) {
            this.recordSuccessfulRoute(routeName);
          }
        } catch (error) {
          this.recordFailedRoute(routeName);
        }
      }
    }, 300000); // 5 minutes
  }
}
```

---

## 3. Rate Limit & Network Congestion Handling

```typescript
// packages/router/rate-limit-manager.ts

export class RateLimitManager {
  async checkAndUpdate(
    userId: string,
    routeName: string,
    route: LLMRoute
  ): Promise<{ allowed: boolean; waitTime?: number }> {
    // Track by user + route combination
    const key = `ratelimit:${userId}:${routeName}`;

    // Get current count
    const current = await redis.incr(key);

    if (current === 1) {
      // First request in this window
      await redis.expire(key, 60); // 1 minute window
    }

    // Check if within limit
    if (current > route.rateLimit.requests_per_minute) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        waitTime: ttl > 0 ? ttl : 60,
      };
    }

    return { allowed: true };
  }

  async detectNetworkCongestion(): Promise<CongestionLevel> {
    // Measure latency to primary endpoint
    const startTime = Date.now();

    try {
      const response = await fetch(
        'https://api.featherless.ai/v1/models',
        { timeout: 5000 }
      );

      const latency = Date.now() - startTime;

      if (latency > 3000) {
        return 'high';
      } else if (latency > 1000) {
        return 'medium';
      } else {
        return 'low';
      }
    } catch (error) {
      // Endpoint unreachable
      return 'critical';
    }
  }

  async selectRouteByNetworkHealth(
    candidates: string[],
    userId: string
  ): Promise<string> {
    const congestion = await this.detectNetworkCongestion();

    // If high congestion, prefer local routes
    if (congestion === 'high' || congestion === 'critical') {
      // Reorder: Ollama first (local), then others
      return candidates.sort((a, b) => {
        if (a === 'ollama') return -1;
        if (b === 'ollama') return 1;
        return 0;
      })[0];
    }

    return candidates[0]; // Normal priority
  }
}
```

---

## 4. Multimodal Input Processing Pipeline

```typescript
// packages/router/multimodal-processor.ts

export class MultimodalProcessor {
  async process(input: UnifiedMessage): Promise<ProcessedInput> {
    let result: ProcessedInput = {
      input_type: 'unknown',
      content: '',
      transcript: null,
      image_base64: null,
      text_context: '',
    };

    // 1. Voice Processing
    if (input.attachments?.some(a => a.type === 'voice')) {
      const voiceAttachment = input.attachments.find(a => a.type === 'voice');
      result.input_type = 'voice';
      result.transcript = await this.transcribeVoice(voiceAttachment.data);
      result.content = result.transcript;
    }

    // 2. Image Processing
    else if (input.attachments?.some(a => a.type === 'image')) {
      const imageAttachment = input.attachments.find(a => a.type === 'image');
      result.input_type = 'image';
      result.image_base64 = imageAttachment.data.toString('base64');
      result.text_context = input.content; // Additional text context
      result.content = `Image: ${input.content || 'No description'}`;
    }

    // 3. Text Processing (default)
    else {
      result.input_type = 'text';
      result.content = input.content;
    }

    return result;
  }

  private async transcribeVoice(audioBuffer: Buffer): Promise<string> {
    // Try Whisper via Featherless first
    try {
      return await this.transcribeWithWhisper(audioBuffer);
    } catch (error) {
      logger.warn('Whisper failed, trying local Whisper');
      return await this.transcribeWithLocalWhisper(audioBuffer);
    }
  }

  private async transcribeWithWhisper(audioBuffer: Buffer): Promise<string> {
    const response = await fetch(
      'https://api.featherless.ai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
        },
        body: this.createFormData(audioBuffer),
      }
    );

    const data = await response.json();
    return data.text;
  }

  private async transcribeWithLocalWhisper(audioBuffer: Buffer): Promise<string> {
    // Call local Ollama Whisper
    const response = await fetch('http://localhost:11434/api/transcribe', {
      method: 'POST',
      body: JSON.stringify({
        audio: audioBuffer.toString('base64'),
      }),
    });

    const data = await response.json();
    return data.text;
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

## 5. Routing Decision Flow

```
Input Arrives
    ↓
Detect Type (Voice/Text/Image)
    ↓
Get Candidate Routes (Priority Order)
    [Featherless → Ollama → OpenAI → Anthropic → Custom]
    ↓
For Each Route:
    ├─ Check if route is healthy?
    │   └─ No? → Skip to next
    ├─ Check rate limits?
    │   └─ Exceeded? → Skip to next
    ├─ Detect network congestion?
    │   └─ High? → Prefer Ollama over others
    └─ Try execution
        ├─ Success? → Cache & return
        └─ Fail? → Try next route
    ↓
If all routes fail:
    ├─ Try cache from previous calls
    ├─ If cached found → return
    └─ If no cache → queue and retry later
```

---

## 6. Configuration & User API Key Management

```typescript
// packages/router/api-key-manager.ts

export class APIKeyManager {
  async addUserAPIKey(
    userId: string,
    service: string, // 'openai', 'anthropic', 'custom'
    apiKey: string
  ): Promise<void> {
    // Encrypt the API key
    const encrypted = await this.encryptKey(apiKey, userId);

    await db.query(
      `INSERT INTO user_api_keys (user_id, service, encrypted_key, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, service) DO UPDATE SET encrypted_key = $3`,
      [userId, service, encrypted, new Date()]
    );

    logger.info({ userId, service }, 'API key added');
  }

  async getAPIKey(userId: string, service: string): Promise<string> {
    const result = await db.query(
      'SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND service = $2',
      [userId, service]
    );

    if (!result.length) {
      throw new Error(`No API key found for ${service}`);
    }

    return await this.decryptKey(result[0].encrypted_key, userId);
  }

  private async encryptKey(key: string, userId: string): Promise<string> {
    // Derive user-specific encryption key
    const userSecret = createHash('sha256')
      .update(`${userId}:${process.env.SECRET_KEY}`)
      .digest();

    const cipher = createCipheriv('aes-256-gcm', userSecret, Buffer.alloc(16));

    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${cipher.getAuthTag().toString('hex')}:${encrypted}`;
  }

  private async decryptKey(encrypted: string, userId: string): Promise<string> {
    const [authTag, encryptedData] = encrypted.split(':');

    const userSecret = createHash('sha256')
      .update(`${userId}:${process.env.SECRET_KEY}`)
      .digest();

    const decipher = createDecipheriv(
      'aes-256-gcm',
      userSecret,
      Buffer.alloc(16)
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

---

## ✅ Routing Capabilities Checklist

- [ ] Input type detection (voice/text/image)
- [ ] Priority-based route selection
- [ ] Health checks for each LLM service
- [ ] Rate limiting per user per route
- [ ] Network congestion detection
- [ ] Automatic fallback chain
- [ ] Response caching (avoid re-processing)
- [ ] User API key encryption
- [ ] Cost tracking per route
- [ ] Graceful degradation (queue on all-fail)
- [ ] Circuit breaker pattern
- [ ] Metrics collection (latency, success rate)
- [ ] Support for 5+ LLM providers
- [ ] Configurable route priority

---

## 🎯 What This Achieves

**Voice Input**: Automatically routed to Whisper → LLM for understanding

**Text Input**: Routed to appropriate LLM (fast cheap model for simple, GPT-4 for complex)

**Image Input**: Routed to vision-capable model (Claude Vision or GPT-4V)

**Rate Limiting**: If Featherless hits limit → Try Ollama → Try OpenAI → Try Anthropic

**Network Congestion**: If primary endpoint slow → Switch to local Ollama

**Cascading Failover**: If one API fails → Try next → Use cache → Queue & retry

**No Stuck State**: Always responds with something (cached, queued, or partial)

