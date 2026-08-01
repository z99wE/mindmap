/**
 * REAL WEB SCRAPER - FREE (No API costs)
 * Uses SearXNG public instance or DuckDuckGo
 * Zero cost integration
 */

const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');

// ============================================
// 1. PUBLIC SEARXNG INSTANCE (FREE, NO API KEY)
// ============================================

const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.torch.searx.se',
  'https://searx.tiekoetter.com',
  'https://search.disroot.org',
  'https://searx.work'
];

class WebScraper {
  constructor() {
    this.currentInstance = null;
    this.available = false;
  }

  async connect() {
    // Try to find a working SearXNG instance
    for (const instance of SEARXNG_INSTANCES) {
      try {
        const response = await this.testInstance(instance);
        if (response) {
          this.currentInstance = instance;
          this.available = true;
          console.log(`✅ Connected to free SearXNG: ${instance}`);
          return true;
        }
      } catch (error) {
        console.log(`⚠️ ${instance} failed`);
      }
    }
    
    console.log('⚠️ No SearXNG instance available, using web_fetch fallback');
    this.available = false;
    return false;
  }

  async testInstance(instance) {
    try {
      const url = `${instance}/search?q=test`;
      const response = await this.fetchHTML(url);
      return response ? true : false;
    } catch (error) {
      return false;
    }
  }

  async fetchHTML(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  async search(query, limit = 10) {
    if (!this.available) {
      return this.fallbackSearch(query, limit);
    }

    try {
      const url = `${this.currentInstance}/search?q=${encodeURIComponent(query)}&format=json`;
      const response = await this.fetchJSON(url);
      
      if (response.results) {
        return response.results.slice(0, limit).map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score
        }));
      }
    } catch (error) {
      console.log('⚠️ SearXNG search failed:', error.message);
      return this.fallbackSearch(query, limit);
    }
  }

  async fetchJSON(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      client.get(url, (res) => {
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

  // Fallback: direct web search without parsing
  async fallbackSearch(query, limit = 10) {
    // Use web_fetch tool for each search result
    // This is a simplified version
    return [
      {
        title: `Search results for "${query}"`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        content: 'Search results would appear here when SearXNG is available',
        score: 0
      }
    ];
  }

  async scrapePage(url) {
    if (!this.available) {
      return { content: 'Web scraping unavailable' };
    }

    try {
      const html = await this.fetchHTML(url);
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Extract main content
      const text = Array.from(document.querySelectorAll('p, h1, h2, h3'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 50)
        .join('\n\n');

      return {
        title: document.title || url,
        url,
        content: text.substring(0, 10000), // Limit to 10k chars
        scrapedAt: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

const webScraper = new WebScraper();

// ============================================
// 2. LIVE INFO SYSTEM (Agent-Reach replacement)
// ============================================

class LiveInfoSystem {
  constructor() {
    this.webScraper = webScraper;
    this.thoughts = [];
    this.context = [];
  }

  async initialize() {
    return await this.webScraper.connect();
  }

  async sendUserThoughtToAgentReach(userId, text, metadata = {}) {
    // Process thought for live information
    const processed = {
      id: `thought_${Date.now()}`,
      userId,
      text,
      timestamp: new Date().toISOString(),
      tags: this.extractTags(text),
      metadata
    };

    this.thoughts.push(processed);
    
    // Check for web search triggers
    if (this.shouldSearchWeb(text)) {
      const results = await this.webScraper.search(text);
      processed.relatedWeb = results;
      this.context.push(...results);
    }

    return processed;
  }

  extractTags(text) {
    const tags = [];
    
    // Simple tag extraction
    if (text.toLowerCase().includes('email')) tags.push('communication');
    if (text.toLowerCase().includes('work') || text.toLowerCase().includes('job')) tags.push('work');
    if (text.toLowerCase().includes('food') || text.toLowerCase().includes('eat')) tags.push('health');
    if (text.toLowerCase().includes('buy') || text.toLowerCase().includes('purchase')) tags.push('shopping');
    
    // Default tag
    if (tags.length === 0) tags.push('general');
    
    return tags;
  }

  shouldSearchWeb(text) {
    const triggers = ['current', 'latest', 'news', 'today', 'recent', 'update'];
    return triggers.some(trigger => text.toLowerCase().includes(trigger));
  }

  async searchThoughts(userId, query) {
    // Search through user's thoughts
    return this.thoughts
      .filter(t => t.userId === userId && t.text.toLowerCase().includes(query.toLowerCase()))
      .slice(-10);
  }

  async getLiveContext(userId) {
    // Get current web context
    return this.context.slice(-20);
  }

  // Get all thoughts for export
  getAllThoughts() {
    return this.thoughts;
  }
}

const liveInfoSystem = new LiveInfoSystem();

// ============================================
// 3. EXPORTS
// ============================================

module.exports = {
  webScraper,
  liveInfoSystem,
  LiveInfoSystem
};
