/**
 * PHASE 3 - INTELLIGENT LLM ROUTER
 * 3-Tier Access Control System with Fallback Chain
 * OmniRoute with API Key Management
 */

const crypto = require('crypto');

// ============================================
// 1. ACCESS CONTROL (3-TIER SYSTEM)
// ============================================

class AccessControl {
  constructor() {
    this.userTiers = new Map();
    this.userApiKeys = new Map();
    this.dailyUsage = new Map();
    this.monthlyUsage = new Map();
  }

  // Initialize user tier
  setUserTier(userId, tier) {
    this.userTiers.set(userId, tier);
  }

  // Set user's API key (encrypted)
  setUserApiKey(userId, service, encryptedKey) {
    if (!this.userApiKeys.has(userId)) {
      this.userApiKeys.set(userId, new Map());
    }
    this.userApiKeys.get(userId).set(service, encryptedKey);
  }

  // Get user's API key
  getUserApiKey(userId, service) {
    return this.userApiKeys.get(userId)?.get(service);
  }

  // Check if user has valid API key for service
  hasUserApiKey(userId, service) {
    return this.userApiKeys.get(userId)?.has(service);
  }

  // Track daily usage
  trackDailyUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    if (!this.dailyUsage.has(userId)) {
      this.dailyUsage.set(userId, new Map());
    }
    const usage = this.dailyUsage.get(userId);
    usage.set(today, (usage.get(today) || 0) + 1);
  }

  // Track monthly usage
  trackMonthlyUsage(userId) {
    const month = new Date().toISOString().substring(0, 7);
    if (!this.monthlyUsage.has(userId)) {
      this.monthlyUsage.set(userId, new Map());
    }
    const usage = this.monthlyUsage.get(userId);
    usage.set(month, (usage.get(month) || 0) + 1);
  }

  // Get current usage
  getUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);

    const daily = this.dailyUsage.get(userId)?.get(today) || 0;
    const monthly = this.monthlyUsage.get(userId)?.get(month) || 0;

    return { daily, monthly };
  }

  // Check access based on tier
  checkAccess(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    const { daily, monthly } = this.getUsage(userId);

    let allowed = true;
    let message = '';
    let remaining = -1;

    switch (tier) {
      case 'free':
        if (daily >= 3) {
          allowed = false;
          message = 'Daily limit reached. Upgrade for more runs or connect your own API keys.';
          remaining = 0;
        } else {
          remaining = 3 - daily;
        }
        break;
      case 'premium':
        if (daily >= 100) {
          allowed = false;
          message = 'Daily limit reached. Connect your own API keys for more runs.';
          remaining = 0;
        } else {
          remaining = 100 - daily;
        }
        break;
      case 'enterprise':
        remaining = -1; // Unlimited
        break;
      default:
        remaining = 3 - daily;
    }

    return { allowed, message, tier, remaining, daily, monthly };
  }

  // Upgrade user to premium with their API key
  upgradeUser(userId, service, apiKey) {
    this.setUserTier(userId, 'premium');
    // In production, encrypt the key before storing
    this.setUserApiKey(userId, service, apiKey);
  }
}

const accessControl = new AccessControl();

// ============================================
// 2. LLM ROUTER (5-Level Fallback Chain)
// ============================================

class LLMRouter {
  constructor() {
    this.routes = new Map();
    this.routeHealth = new Map();
    this.rateLimits = new Map();
    this.circuitBreakers = new Map();

    this.initializeRoutes();
    this.startHealthChecks();
  }

  initializeRoutes() {
    // Route 1: NVIDIA NIM (Free - Primary)
    this.routes.set('nvidia-nim', {
      name: 'NVIDIA NIM',
      endpoint: process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1',
      models: {
        text: 'meta/llama-2-70b-chat',
        image: 'nvidia/llama-3-nemotron-70b-instruct',
        voice: 'whisper-large-v3'
      },
      apiKey: process.env.NVIDIA_API_KEY || null,
      priority: 1,
      rateLimit: { requestsPerMinute: 60, tokensPerMinute: 50000 },
      cost: 0,
      freeTier: true
    });

    // Route 2: Groq (Fast fallback)
    this.routes.set('groq', {
      name: 'Groq',
      endpoint: process.env.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1',
      models: {
        text: 'llama-3-70b',
        image: null,
        voice: null
      },
      apiKey: process.env.GROQ_API_KEY || null,
      priority: 2,
      rateLimit: { requestsPerMinute: 30, tokensPerMinute: 14400 },
      cost: 0.0007,
      freeTier: true
    });

    // Route 3: OpenAI (User's API key)
    this.routes.set('openai', {
      name: 'OpenAI',
      endpoint: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
      models: {
        text: 'gpt-4',
        image: 'gpt-4-vision',
        voice: 'whisper-1'
      },
      apiKey: null, // From user's account
      priority: 3,
      rateLimit: { requestsPerMinute: 100, tokensPerMinute: 30000 },
      cost: 0.03,
      freeTier: false
    });

    // Route 4: Anthropic (User's API key)
    this.routes.set('anthropic', {
      name: 'Anthropic',
      endpoint: process.env.ANTHROPIC_ENDPOINT || 'https://api.anthropic.com/v1',
      models: {
        text: 'claude-3-opus',
        image: 'claude-3-opus-20240229',
        voice: null
      },
      apiKey: null, // From user's account
      priority: 4,
      rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 },
      cost: 0.015,
      freeTier: false
    });

    // Route 5: Ollama (Local, always available)
    this.routes.set('ollama', {
      name: 'Ollama',
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/v1',
      models: {
        text: 'llama3',
        image: 'llava',
        voice: 'whisper'
      },
      apiKey: null,
      priority: 5,
      rateLimit: { requestsPerMinute: 1000, tokensPerMinute: 1000000 },
      cost: 0,
      freeTier: true,
      offlineCapable: true
    });
  }

  async route(request) {
    const { inputType, userId, complexity = 'low' } = request;

    // Check access first
    const access = accessControl.checkAccess(userId);
    if (!access.allowed) {
      return {
        success: false,
        route: 'access_denied',
        error: access.message,
        tier: access.tier,
        remaining: access.remaining
      };
    }

    // Update usage
    accessControl.trackDailyUsage(userId);
    accessControl.trackMonthlyUsage(userId);

    // Get candidate routes
    const candidateRoutes = this.getCandidateRoutes(inputType, userId, complexity);
    let lastError = null;

    for (const routeName of candidateRoutes) {
      try {
        const route = this.routes.get(routeName);
        if (!route) continue;

        // Check route health
        if (!await this.checkRouteHealth(routeName)) {
          continue;
        }

        // Check rate limit
        if (!await this.checkRateLimit(userId, routeName)) {
          continue;
        }

        // Execute request
        const result = await this.executeRequest(route, request);
        this.recordSuccess(routeName);

        return {
          success: true,
          route: routeName,
          response: result,
          tier: access.tier,
          remaining: access.remaining - 1,
          cost: this.calculateCost(route, result.tokens)
        };
      } catch (error) {
        lastError = error;
        this.recordFailure(routeName);
        console.log(`Route ${routeName} failed: ${error.message}`);
        continue;
      }
    }

    // All routes failed
    return {
      success: false,
      route: 'queue',
      error: lastError?.message || 'All LLM routes exhausted',
      tier: access.tier,
      remaining: access.remaining,
      queued: true
    };
  }

  getCandidateRoutes(inputType, userId, complexity) {
    const routes = [];

    // Free routes first
    if (inputType === 'voice' && this.routes.get('nvidia-nim')) {
      routes.push('nvidia-nim'); // Has Whisper
    }
    if (inputType === 'image' && this.routes.get('nvidia-nim')) {
      routes.push('nvidia-nim'); // Has vision
    }
    if (this.routes.get('groq')) {
      routes.push('groq');
    }
    if (this.routes.get('ollama')) {
      routes.push('ollama');
    }

    // User's paid API keys
    if (accessControl.hasUserApiKey(userId, 'openai') && inputType !== 'image') {
      routes.push('openai');
    }
    if (accessControl.hasUserApiKey(userId, 'anthropic')) {
      routes.push('anthropic');
    }

    // Circuit breaker fallback
    if (this.circuitBreakers.get('nvidia') > 3) {
      routes.push('ollama'); // Prefer local if primary is failing
    }

    return routes;
  }

  async checkRouteHealth(routeName) {
    const health = this.routeHealth.get(routeName);
    if (!health) return true;

    // Circuit breaker: if 3 consecutive failures, wait
    if (health.failures > 3) {
      const timeSinceFail = Date.now() - health.lastFailTime;
      if (timeSinceFail < 60000) { // 60 seconds cooldown
        return false;
      }
    }

    return true;
  }

  async checkRateLimit(userId, routeName) {
    const key = `ratelimit:${userId}:${routeName}`;
    const current = await this.getRateLimit(key);

    const route = this.routes.get(routeName);
    if (current >= route.rateLimit.requestsPerMinute) {
      return false;
    }

    await this.incrementRateLimit(key);
    return true;
  }

  async executeRequest(route, request) {
    const model = route.models[request.inputType];

    if (!model) {
      throw new Error(`Route ${route.name} doesn't support ${request.inputType}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': route.apiKey ? `Bearer ${route.apiKey}` : ''
    };

    const body = {
      model: model,
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: request.content || '' }
      ],
      temperature: 0.7,
      max_tokens: request.maxTokens || 500
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    return {
      content: `Response from ${route.name} for ${request.inputType}`,
      tokens: Math.floor(Math.random() * 50) + 10,
      latency_ms: 50 + Math.random() * 100
    };
  }

  getSystemPrompt() {
    return 'You are a helpful AI assistant. Provide accurate, concise responses.';
  }

  calculateCost(route, tokens) {
    if (route.freeTier) return 0;
    return (tokens / 1000) * route.cost;
  }

  recordSuccess(routeName) {
    this.routeHealth.set(routeName, { failures: 0, lastFailTime: null });
    this.circuitBreakers.set(routeName, 0);
  }

  recordFailure(routeName) {
    const health = this.routeHealth.get(routeName) || { failures: 0, lastFailTime: null };
    health.failures++;
    health.lastFailTime = Date.now();
    this.routeHealth.set(routeName, health);

    // Increment circuit breaker
    const current = this.circuitBreakers.get(routeName) || 0;
    this.circuitBreakers.set(routeName, current + 1);
  }

  async getRateLimit(key) {
    // In production, use Redis
    return 0;
  }

  async incrementRateLimit(key) {
    // In production, use Redis with TTL
  }

  startHealthChecks() {
    // Check all routes every 5 minutes
    setInterval(async () => {
      for (const [name, route] of this.routes) {
        try {
          // Simulate health check
          await new Promise(resolve => setTimeout(resolve, 10));
          this.recordSuccess(name);
        } catch (error) {
          this.recordFailure(name);
        }
      }
    }, 300000);
  }
}

const llmRouter = new LLMRouter();

// ============================================
// 3. API KEY ENCRYPTION (AES-256)
// ============================================

class APIKeyManager {
  constructor() {
    this.secretKey = process.env.SECRET_KEY || 'default-secret-key';
  }

  encrypt(key, userId) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.deriveKey(userId), iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encrypted, userId) {
    const [ivHex, encryptedData] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.deriveKey(userId), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  deriveKey(userId) {
    return crypto.createHash('sha256')
      .update(`${userId}:${this.secretKey}`)
      .digest();
  }
}

const apiKeyManager = new APIKeyManager();

// ============================================
// 4. SECURITY: LLM JUMPING PREVENTION
// ============================================

class SecurityManager {
  constructor() {
    this.suspiciousPatterns = [
      /system.*override/i,
      /ignore.*previous.*instructions/i,
      /bypass.*security/i,
      /prompt.*injection/i,
      /disposable.*email/i,
      /fake.*user/i
    ];
  }

  checkInputSafety(input) {
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) {
        return { safe: false, reason: 'Suspicious pattern detected' };
      }
    }
    return { safe: true };
  }

  checkUserEmail(email) {
    // Check for disposable email providers
    const disposableDomains = ['tempmail', 'throwaway', '10minutemail', 'guerrilla'];
    const domain = email.split('@')[1]?.toLowerCase();

    if (domain && disposableDomains.some(d => domain.includes(d))) {
      return { valid: false, reason: 'Disposable email not allowed' };
    }

    return { valid: true };
  }
}

const securityManager = new SecurityManager();

// ============================================
// 5. EXPORTS
// ============================================

module.exports = {
  accessControl,
  llmRouter,
  apiKeyManager,
  securityManager
};
