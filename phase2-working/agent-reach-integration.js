/**
 * AGENT-REACH INTEGRATION
 * Real-time world information and live thought processing
 * Integration with https://github.com/Panniantong/Agent-Reach.git
 */

const https = require('https');
const http = require('http');

// ============================================
// 1. AGENT-REACH CLIENT
// ============================================

class AgentReachClient {
  constructor() {
    this.endpoint = process.env.AGENT_REACH_ENDPOINT || 'http://localhost:3001';
    this.apiKey = process.env.AGENT_REACH_API_KEY || null;
    this.connected = false;
    this.subscription = null;
  }

  async connect() {
    try {
      // Test connection
      const response = await this.fetchHealth();
      
      if (response.status === 'healthy') {
        this.connected = true;
        console.log('✅ Connected to Agent-Reach');
        
        // Start live updates subscription
        this.subscribeToUpdates();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('⚠️ Agent-Reach connection failed:', error.message);
      this.connected = false;
      return false;
    }
  }

  disconnect() {
    this.connected = false;
    if (this.subscription) {
      this.subscription.close();
      this.subscription = null;
    }
  }

  async fetchHealth() {
    return new Promise((resolve, reject) => {
      const url = new URL('/health', this.endpoint);
      
      http.get(url.href, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  subscribeToUpdates() {
    if (!this.connected) return;

    // WebSocket subscription to live updates
    this.subscription = new WebSocket(`${this.endpoint.replace('http', 'ws')}/live`);
    
    this.subscription.onmessage = (event) => {
      const update = JSON.parse(event.data);
      this.handleLiveUpdate(update);
    };

    this.subscription.onerror = (error) => {
      console.log('⚠️ Agent-Reach subscription error:', error.message);
    };

    this.subscription.onclose = () => {
      console.log('🔄 Reconnecting to Agent-Reach...');
      setTimeout(() => this.subscribeToUpdates(), 5000);
    };
  }

  async handleLiveUpdate(update) {
    // Process live information
    switch (update.type) {
      case 'thought':
        await this.processLiveThought(update.data);
        break;
      case 'news':
        await this.processNews(update.data);
        break;
      case 'social':
        await this.processSocialMedia(update.data);
        break;
      case 'web':
        await this.processWebScrape(update.data);
        break;
    }
  }

  async processLiveThought(thoughtData) {
    // Add to agentic memory with live timestamp
    console.log(`🎯 Live thought: ${thoughtData.text.substring(0, 50)}...`);
    
    // Can integrate with memory system
    return {
      processed: true,
      timestamp: Date.now()
    };
  }

  async processNews(newsData) {
    // Process breaking news
    console.log(`📰 Breaking news: ${newsData.headline}`);
    
    return {
      processed: true,
      category: newsData.category
    };
  }

  async processSocialMedia(postData) {
    // Process social media updates
    console.log(`💬 Social update from ${postData.source}: ${postData.content.substring(0, 50)}...`);
    
    return {
      processed: true,
      platform: postData.platform
    };
  }

  async processWebScrape(scrapeData) {
    // Process web scraping results
    console.log(`🌐 Web scrape: ${scrapeData.url}`);
    
    return {
      processed: true,
      contentLength: scrapeData.content.length
    };
  }

  async getLiveInformation(options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Agent-Reach');
    }

    const params = new URLSearchParams(options);
    const url = `${this.endpoint}/live?${params}`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  async searchLiveInformation(query, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Agent-Reach');
    }

    const url = `${this.endpoint}/search?query=${encodeURIComponent(query)}`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  // Send thought to Agent-Reach for processing
  async sendThought(thought) {
    if (!this.connected) {
      console.log('⚠️ Not connected to Agent-Reach, thought not sent');
      return null;
    }

    try {
      const response = await fetch(`${this.endpoint}/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thought)
      });

      return await response.json();
    } catch (error) {
      console.log('⚠️ Failed to send thought to Agent-Reach:', error.message);
      return null;
    }
  }
}

const agentReach = new AgentReachClient();

// ============================================
// 2. LIVE INFORMATION INTEGRATION
// ============================================

class LiveInformationSystem {
  constructor() {
    this.agentReach = agentReach;
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  async initialize() {
    // Try to connect to Agent-Reach
    const connected = await this.agentReach.connect();
    return connected;
  }

  async getLiveThoughts(userId, options = {}) {
    try {
      const cacheKey = `live_thoughts:${userId}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      // Fetch from Agent-Reach
      const data = await this.agentReach.getLiveInformation({
        type: 'thought',
        limit: options.limit || 10
      });

      // Cache result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.log('⚠️ Failed to get live thoughts:', error.message);
      return [];
    }
  }

  async searchLiveInformation(query) {
    try {
      const cacheKey = `search:${query}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      // Search via Agent-Reach
      const data = await this.agentReach.searchLiveInformation(query);

      // Cache result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.log('⚠️ Search failed:', error.message);
      return null;
    }
  }

  async sendUserThoughtToAgentReach(userId, thoughtText, metadata = {}) {
    try {
      const thought = {
        userId,
        text: thoughtText,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          source: 'thought-gps'
        }
      };

      return await this.agentReach.sendThought(thought);
    } catch (error) {
      console.log('⚠️ Failed to send thought:', error.message);
      return null;
    }
  }

  async getWorldContext(query) {
    // Get real-time context from Agent-Reach
    const liveData = await this.searchLiveInformation(query);
    
    return {
      liveData,
      timestamp: Date.now(),
      freshness: 'real-time'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

const liveInfoSystem = new LiveInformationSystem();

// ============================================
// 3. AGENT-REACH INTEGRATION ENDPOINTS
// ============================================

function createAgentReachEndpoints(app) {
  // Check connection
  app.get('/agent-reach/health', async (req, res) => {
    const status = {
      connected: agentReach.connected,
      endpoint: agentReach.endpoint
    };
    
    if (!agentReach.connected) {
      // Try to connect
      status.connected = await agentReach.connect();
    }
    
    res.json(status);
  });

  // Get live thoughts
  app.get('/agent-reach/thoughts', async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    try {
      const thoughts = await liveInfoSystem.getLiveThoughts(userId, {
        limit: parseInt(req.query.limit) || 10
      });
      
      res.json({ success: true, thoughts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Search live information
  app.get('/agent-reach/search', async (req, res) => {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    try {
      const results = await liveInfoSystem.searchLiveInformation(query);
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send thought to Agent-Reach
  app.post('/agent-reach/thought', async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { text, metadata = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    try {
      const result = await liveInfoSystem.sendUserThoughtToAgentReach(userId, text, metadata);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get world context
  app.get('/agent-reach/context', async (req, res) => {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    try {
      const context = await liveInfoSystem.getWorldContext(query);
      res.json({ success: true, context });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ============================================
// 4. EXPORTS
// ============================================

module.exports = {
  agentReach,
  liveInfoSystem,
  createAgentReachEndpoints
};
