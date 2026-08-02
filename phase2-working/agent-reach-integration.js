/**
 * AGENT-REACH INTEGRATION (Enhanced)
 * Real-time world information and live thought processing
 * Uses DuckDuckGo, Wikipedia API, and Open-Meteo for free web enrichment.
 * Wired into the orchestrator pipeline for context-enriched LLM calls.
 */

const https = require('https');
const http = require('http');

// ============================================
// 1. LIVE INFO SYSTEM (Enhanced Web Scraping)
// ============================================

class LiveInfoSystem {
  constructor() {
    this.thoughts = [];
    this.connected = false;
    this.rateLimiter = {
      lastCall: 0,
      minInterval: 2000, // 2s between external calls
      callsToday: 0,
      maxDaily: 200,
    };
  }

  async initialize() {
    this.connected = true;
    console.log('\u2705 Agent-Reach initialized (DuckDuckGo + Wikipedia + Open-Meteo + Tavily/Firecrawl/SearXNG)');
    return true;
  }

  /**
   * Check rate limits before making external calls
   */
  _canMakeCall() {
    const now = Date.now();
    if (now - this.rateLimiter.lastCall < this.rateLimiter.minInterval) return false;
    if (this.rateLimiter.callsToday >= this.rateLimiter.maxDaily) return false;
    this.rateLimiter.lastCall = now;
    this.rateLimiter.callsToday++;
    return true;
  }

  /**
   * Reset daily counter (call from cron or timer)
   */
  resetDailyCounter() {
    this.rateLimiter.callsToday = 0;
  }

  // ── Tavily API Search (BYO key) ──────────────────────────────────────────
  async searchTavily(query, apiKey) {
    if (!this._canMakeCall() || !apiKey) return { query, results: [], rateLimited: true };
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query, max_results: 5, include_answer: true }),
      });
      if (!resp.ok) return { query, results: [], error: `Tavily ${resp.status}` };
      const data = await resp.json();
      const results = (data.results || []).map(r => ({
        title: r.title || query, url: r.url || '', content: (r.content || '').slice(0, 500),
        source: 'Tavily', timestamp: new Date().toISOString(),
      }));
      if (data.answer) results.unshift({ title: `Answer: ${query}`, url: '', content: data.answer.slice(0, 600), source: 'Tavily AI', timestamp: new Date().toISOString() });
      return { query, results };
    } catch (error) { return { query, results: [], error: error.message }; }
  }

  // ── Firecrawl Web Scraping (BYO key) ─────────────────────────────────────
  async searchFirecrawl(query, apiKey) {
    if (!this._canMakeCall() || !apiKey) return { query, results: [], rateLimited: true };
    try {
      const resp = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ query, limit: 5 }),
      });
      if (!resp.ok) return { query, results: [], error: `Firecrawl ${resp.status}` };
      const data = await resp.json();
      const results = (data.data || []).map(r => ({
        title: r.title || r.metadata?.title || query, url: r.url || '',
        content: (r.markdown || r.content || '').slice(0, 500), source: 'Firecrawl', timestamp: new Date().toISOString(),
      }));
      return { query, results };
    } catch (error) { return { query, results: [], error: error.message }; }
  }

  // ── SearXNG Self-hosted Instance ──────────────────────────────────────────
  async searchSearXNG(query, instanceUrl) {
    if (!this._canMakeCall() || !instanceUrl) return { query, results: [], rateLimited: true };
    try {
      const url = `${instanceUrl.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}&format=json`;
      const result = await this._httpsGet(url, 8000);
      if (!result) return { query, results: [] };
      const parsed = JSON.parse(result);
      const results = (parsed.results || []).slice(0, 5).map(r => ({
        title: r.title || query, url: r.url || '', content: (r.content || '').slice(0, 500),
        source: 'SearXNG', timestamp: new Date().toISOString(),
      }));
      return { query, results };
    } catch (error) { return { query, results: [], error: error.message }; }
  }

  // ── Priority Search (uses best available source) ──────────────────────────
  async searchPriority(query, userKeys = {}) {
    if (userKeys.tavily) {
      const r = await this.searchTavily(query, userKeys.tavily);
      if (r.results?.length > 0) return r;
    }
    if (userKeys.firecrawl) {
      const r = await this.searchFirecrawl(query, userKeys.firecrawl);
      if (r.results?.length > 0) return r;
    }
    if (userKeys.searxng_url) {
      const r = await this.searchSearXNG(query, userKeys.searxng_url);
      if (r.results?.length > 0) return r;
    }
    const [ddgResult, wikiResult] = await Promise.all([
      this.searchWeb(query),
      this.searchWikipedia(this._extractKeyTerms(query)),
    ]);
    return { query, results: [...(ddgResult.results || []).slice(0, 3), ...(wikiResult.results || []).slice(0, 2)] };
  }

  // ── Web Search via DuckDuckGo Instant Answer API ──────────────────────────
  async searchWeb(query) {
    if (!this._canMakeCall()) {
      return { query, results: [], rateLimited: true };
    }

    try {
      // Use DuckDuckGo Instant Answer API (free, no key needed)
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

      const result = await this._httpsGet(url, 8000);
      if (!result) return { query, results: [] };

      const parsed = JSON.parse(result);
      const results = [];

      // Abstract
      if (parsed.Abstract) {
        results.push({
          title: parsed.Heading || query,
          url: parsed.AbstractURL || '',
          content: parsed.Abstract.slice(0, 500),
          source: parsed.AbstractSource || 'DuckDuckGo',
          timestamp: new Date().toISOString(),
        });
      }

      // Answer
      if (parsed.Answer) {
        results.push({
          title: `Answer: ${query}`,
          url: '',
          content: String(parsed.Answer).slice(0, 300),
          source: 'DuckDuckGo Instant',
          timestamp: new Date().toISOString(),
        });
      }

      // Related topics
      if (parsed.RelatedTopics?.length > 0) {
        parsed.RelatedTopics.slice(0, 5).forEach(topic => {
          if (topic.Text) {
            results.push({
              title: topic.Text.slice(0, 80),
              url: topic.FirstURL || '',
              content: topic.Text.slice(0, 300),
              source: 'DuckDuckGo Related',
              timestamp: new Date().toISOString(),
            });
          }
        });
      }

      return { query, results };
    } catch (error) {
      return { query, results: [], error: error.message };
    }
  }

  // ── Wikipedia Summary API (free, no key) ──────────────────────────────────
  async searchWikipedia(query) {
    if (!this._canMakeCall()) return { query, results: [], rateLimited: true };

    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const result = await this._httpsGet(url, 8000);
      if (!result) return { query, results: [] };

      const parsed = JSON.parse(result);
      if (parsed.extract) {
        return {
          query,
          results: [{
            title: parsed.title || query,
            url: parsed.content_urls?.desktop?.page || '',
            content: parsed.extract.slice(0, 600),
            source: 'Wikipedia',
            thumbnail: parsed.thumbnail?.source || null,
            timestamp: new Date().toISOString(),
          }],
        };
      }
      return { query, results: [] };
    } catch {
      return { query, results: [] };
    }
  }

  // ── Weather via Open-Meteo (free, no key) ─────────────────────────────────
  async getWeather(lat, lon) {
    if (!this._canMakeCall()) return null;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
      const result = await this._httpsGet(url, 5000);
      if (!result) return null;

      const parsed = JSON.parse(result);
      const current = parsed.current;
      if (!current) return null;

      const weatherCodes = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
      };

      return {
        temperature: current.temperature_2m,
        unit: '°C',
        condition: weatherCodes[current.weather_code] || 'Unknown',
        wind: current.wind_speed_10m,
        precipitation: current.precipitation,
        location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      };
    } catch {
      return null;
    }
  }

  // ── Process thought and enrich with web context ───────────────────────────
  async processThought(userId, text, metadata = {}) {
    const thought = {
      id: `thought_${Date.now()}`,
      userId,
      text,
      timestamp: new Date().toISOString(),
      tags: this.extractTags(text),
      webContext: [],
      weather: null,
      metadata,
    };

    // Enrich with web search if needed
    if (this.needsWebSearch(text)) {
      const [ddgResult, wikiResult] = await Promise.all([
        this.searchWeb(text),
        this.searchWikipedia(this._extractKeyTerms(text)),
      ]);

      thought.webContext = [
        ...(ddgResult.results || []).slice(0, 3),
        ...(wikiResult.results || []).slice(0, 2),
      ];
    }

    // Enrich with weather if location metadata provided
    if (metadata.lat && metadata.lon) {
      thought.weather = await this.getWeather(metadata.lat, metadata.lon);
    }

    this.thoughts.push(thought);

    // Keep only last 1000 thoughts per user
    this.thoughts = this.thoughts.filter(t =>
      t.userId !== userId || this.thoughts.filter(x => x.userId === userId).length < 1000
    );

    return thought;
  }

  /**
   * Batch enrichment: fetch context for multiple queries
   */
  async batchEnrich(queries) {
    const results = {};
    for (const query of queries.slice(0, 5)) { // Max 5 concurrent enrichments
      results[query] = await this.searchWeb(query);
    }
    return results;
  }

  // ── Text Analysis Helpers ─────────────────────────────────────────────────

  extractTags(text) {
    const tags = [];
    const lower = text.toLowerCase();
    if (lower.includes('email') || lower.includes('message')) tags.push('communication');
    if (lower.includes('work') || lower.includes('job') || lower.includes('project')) tags.push('work');
    if (lower.includes('food') || lower.includes('eat') || lower.includes('health')) tags.push('health');
    if (lower.includes('buy') || lower.includes('purchase') || lower.includes('shop')) tags.push('shopping');
    if (lower.includes('remind') || lower.includes('deadline') || lower.includes('task')) tags.push('tasks');
    if (lower.includes('travel') || lower.includes('flight') || lower.includes('trip')) tags.push('travel');
    if (lower.includes('weather') || lower.includes('rain') || lower.includes('temperature')) tags.push('weather');
    if (lower.includes('money') || lower.includes('pay') || lower.includes('budget')) tags.push('finance');
    if (tags.length === 0) tags.push('general');
    return tags;
  }

  needsWebSearch(text) {
    const triggers = ['current', 'latest', 'news', 'today', 'recent', 'update', 'now', 'what is', 'who is', 'how does'];
    return triggers.some(trigger => text.toLowerCase().includes(trigger));
  }

  _extractKeyTerms(text) {
    // Extract noun phrases for Wikipedia search
    const words = text.split(/\s+/).filter(w => w.length > 3);
    return words.slice(0, 3).join(' ');
  }

  // ── HTTP Helper ───────────────────────────────────────────────────────────

  _httpsGet(url, timeout = 5000) {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          this._httpsGet(res.headers.location, timeout).then(resolve);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(timeout, () => { req.destroy(); resolve(null); });
    });
  }

  // ── Thought Management ────────────────────────────────────────────────────

  getUserThoughts(userId) {
    return this.thoughts.filter(t => t.userId === userId);
  }

  searchThoughts(userId, query) {
    return this.thoughts
      .filter(t => t.userId === userId && t.text.toLowerCase().includes(query.toLowerCase()))
      .slice(-10);
  }

  getAllThoughts() {
    return this.thoughts;
  }

  getContext(thoughtId) {
    return this.thoughts.find(t => t.id === thoughtId)?.webContext || [];
  }

  async connect() { this.connected = true; return true; }
  disconnect() { this.connected = false; }

  getStatus() {
    return {
      connected: this.connected,
      thoughtsStored: this.thoughts.length,
      rateLimiter: { ...this.rateLimiter },
    };
  }
}

const liveInfoSystem = new LiveInfoSystem();

// ============================================
// 2. API ENDPOINTS
// ============================================

function createAgentReachEndpoints(app) {
  // Health check
  app.get('/agent-reach/health', async (req, res) => {
    res.json({
      status: 'healthy',
      mode: 'free',
      webScraping: 'enabled',
      sources: ['DuckDuckGo', 'Wikipedia', 'Open-Meteo'],
      ...liveInfoSystem.getStatus(),
    });
  });

  // Get all thoughts
  app.get('/agent-reach/thoughts', async (req, res) => {
    res.json({
      success: true,
      thoughts: liveInfoSystem.getAllThoughts(),
      count: liveInfoSystem.getAllThoughts().length,
    });
  });

  // Search thoughts
  app.get('/agent-reach/search', async (req, res) => {
    const { userId, query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });
    const results = liveInfoSystem.searchThoughts(userId || 'anonymous', query);
    res.json({ success: true, results, count: results.length });
  });

  // Add thought with enrichment
  app.post('/agent-reach/thought', async (req, res) => {
    const { userId, text, metadata = {} } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    const thought = await liveInfoSystem.processThought(userId || 'anonymous', text, metadata);
    res.json({
      success: true,
      thought,
      webContext: thought.webContext.length,
      weather: thought.weather,
    });
  });

  // Web search only (for testing)
  app.get('/agent-reach/web-search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });
    const results = await liveInfoSystem.searchWeb(query);
    res.json({ success: true, ...results });
  });

  // Wikipedia search only
  app.get('/agent-reach/wiki', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });
    const results = await liveInfoSystem.searchWikipedia(query);
    res.json({ success: true, ...results });
  });

  // Weather only
  app.get('/agent-reach/weather', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
    const weather = await liveInfoSystem.getWeather(parseFloat(lat), parseFloat(lon));
    res.json({ success: true, weather });
  });

  // Get context for thought
  app.get('/agent-reach/context', async (req, res) => {
    const { thoughtId } = req.query;
    const context = liveInfoSystem.getContext(thoughtId);
    res.json({ success: true, context, count: context.length });
  });

  // Export all thoughts (JSON-LD format)
  app.get('/agent-reach/export', async (req, res) => {
    const thoughts = liveInfoSystem.getAllThoughts();
    const jsonld = {
      '@context': 'https://www.w3.org/ns/json-ld',
      '@graph': thoughts.map((thought) => ({
        '@id': `urn:thought:${thought.id}`,
        '@type': 'memory.Thought',
        'text': thought.text,
        'userId': thought.userId,
        'timestamp': thought.timestamp,
        'tags': thought.tags,
        'webContext': thought.webContext,
        'metadata': thought.metadata,
      })),
    };
    res.json({ success: true, format: 'json-ld', data: jsonld, thoughts: thoughts.length });
  });
}

// ============================================
// 3. EXPORTS
// ============================================

module.exports = {
  liveInfoSystem,
  createAgentReachEndpoints,
  LiveInfoSystem,
};
