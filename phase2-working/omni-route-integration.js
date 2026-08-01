/**
 * OMNIROUTE INTEGRATION
 * Free LLM router - never stop coding with 90+ free providers
 * Auto-fallback: Free tier → User's API keys → Paid tier
 */

// ============================================
// 1. OMNIROUTE CONFIGURATION
// ============================================

const OMNIROUTE_CONFIG = {
  endpoint: process.env.OMNIROUTE_ENDPOINT || 'http://localhost:8080/v1',
  apiKey: process.env.OMNIROUTE_API_KEY || null,
  
  // Free tier providers (no API key needed)
  freeProviders: [
    'openai', 'anthropic', 'google', 'meta', 'microsoft', 
    'groq', 'cohere', 'mistral', 'nvidia', 'deepinfra'
  ],
  
  // Models for each provider
  models: {
    openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-2.1'],
    google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    meta: ['llama-3-70b', 'llama-3-8b', 'llama-2-70b'],
    groq: ['llama-3-70b', 'mixtral-8x7b'],
    nvidia: ['llama-3-70b', 'mixtral-8x7b']
  },
  
  // Priority: free tier first, then user's keys, then paid
  priority: ['free', 'user_keys', 'paid']
};

// ============================================
// 2. OMNIROUTE CLIENT
// ============================================

class OmniRouteClient {
  constructor() {
    this.endpoint = OMNIROUTE_CONFIG.endpoint;
    this.apiKey = OMNIROUTE_CONFIG.apiKey;
    this.connected = false;
  }

  async connect() {
    try {
      // Test connection to OmniRoute
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });

      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to OmniRoute');
        return true;
      }

      console.log('⚠️ OmniRoute health check failed, falling back to direct LLM');
      this.connected = false;
      return false;
    } catch (error) {
      console.log('⚠️ OmniRoute connection failed:', error.message);
      this.connected = false;
      return false;
    }
  }

  async route(request) {
    const { messages, model, maxTokens = 500, temperature = 0.7 } = request;

    // If OmniRoute is connected, use it
    if (this.connected) {
      try {
        const response = await fetch(`${this.endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
          },
          body: JSON.stringify({
            messages,
            model: model || 'auto', // Auto-select best free model
            max_tokens: maxTokens,
            temperature: temperature
          })
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            content: result.choices[0].message.content,
            provider: 'omniroute',
            model: result.model,
            cost: 0 // Free tier
          };
        }
      } catch (error) {
        console.log('⚠️ OmniRoute routing failed, trying fallback:', error.message);
      }
    }

    // Fallback to direct LLM (if user has API key configured)
    return {
      success: false,
      fallback: true,
      reason: 'OmniRoute not available'
    };
  }
}

const omnirouteClient = new OmniRouteClient();

// ============================================
// 3. AUTO-FAILOVER STRATEGY
// ============================================

class AutoFailoverRouter {
  constructor() {
    this.providers = new Map();
    this.setupProviders();
  }

  setupProviders() {
    // Provider 1: OmniRoute (free tier)
    this.providers.set('omniroute', {
      name: 'OmniRoute (Free)',
      client: omnirouteClient,
      cost: 0,
      priority: 1
    });

    // Provider 2: User's configured API keys
    this.providers.set('user_keys', {
      name: 'User API Keys',
      cost: null, // Depends on user's key
      priority: 2
    });

    // Provider 3: Backend admin keys
    this.providers.set('admin_keys', {
      name: 'Admin Keys',
      cost: null,
      priority: 3
    });
  }

  async route(request, userId, accessControl, apiKeyManager) {
    // Try providers in priority order
    const providers = Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);

    for (const provider of providers) {
      let result;

      if (provider.name === 'OmniRoute (Free)') {
        result = await provider.client.route(request);
      } else if (provider.name === 'User API Keys') {
        result = await this.routeWithUserKeys(request, userId, apiKeyManager);
      } else if (provider.name === 'Admin Keys') {
        result = await this.routeWithAdminKeys(request);
      }

      if (result && result.success) {
        console.log(`📊 Request served by ${provider.name}`);
        return {
          success: true,
          response: result,
          provider: provider.name,
          tier: 'free' // Free tier uses OmniRoute
        };
      }
    }

    // All providers failed
    return {
      success: false,
      error: 'All LLM providers exhausted',
      tier: 'free'
    };
  }

  async routeWithUserKeys(request, userId, apiKeyManager) {
    const openaiKey = apiKeyManager.getUserApiKey(userId, 'openai');
    const anthropicKey = apiKeyManager.getUserApiKey(userId, 'anthropic');

    // Try OpenAI first
    if (openaiKey) {
      return await this.callOpenAI(request, openaiKey);
    }

    // Try Anthropic
    if (anthropicKey) {
      return await this.callAnthropic(request, anthropicKey);
    }

    return { success: false };
  }

  async callOpenAI(request, apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: request.messages,
          model: request.model || 'gpt-4o',
          max_tokens: request.maxTokens || 500
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          content: result.choices[0].message.content,
          provider: 'openai',
          model: result.model,
          cost: 'user_key'
        };
      }
    } catch (error) {
      console.log('⚠️ OpenAI failed:', error.message);
    }

    return { success: false };
  }

  async callAnthropic(request, apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          messages: request.messages,
          model: request.model || 'claude-3-opus',
          max_tokens: request.maxTokens || 500
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          content: result.content[0].text,
          provider: 'anthropic',
          model: result.model,
          cost: 'user_key'
        };
      }
    } catch (error) {
      console.log('⚠️ Anthropic failed:', error.message);
    }

    return { success: false };
  }

  async routeWithAdminKeys(request) {
    // Backend admin keys (admin dashboard configuration)
    // This would use the admin-configured keys from admin-dashboard.js
    console.log('⚠️ Admin keys routing not implemented');
    return { success: false };
  }
}

const autoFailoverRouter = new AutoFailoverRouter();

// ============================================
// 4. EXPORTS
// ============================================

module.exports = {
  OMNIROUTE_CONFIG,
  omnirouteClient,
  autoFailoverRouter,
  AutoFailoverRouter
};
