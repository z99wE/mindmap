/**
 * ADMIN DASHBOARD & CONFIGURATION SYSTEM
 * Admin Console with Email Whitelist
 * Free TTS/STT Provider Management
 * Premium Configuration Control
 */

const crypto = require('crypto');

// ============================================
// 1. ADMIN CONFIGURATION
// ============================================

class AdminConfig {
  constructor() {
    this.adminEmails = new Set();
    this.freeTTSProviders = ['piper', 'assemblyai', 'deepgram', 'servum'];
    this.ttsProvider = 'piper'; // Default to free local Piper
    this.sttProvider = 'nvidia-nim';
    this.voiceToggleEnabled = false; // Default disabled for free tier
    this.voiceOutputEnabled = false; // Default disabled for free tier

    // Load from env or set defaults
    this.loadFromEnv();
  }

  loadFromEnv() {
    // Admin emails (comma-separated)
    if (process.env.ADMIN_EMAILS) {
      process.env.ADMIN_EMAILS.split(',').forEach(email => {
        this.adminEmails.add(email.trim().toLowerCase());
      });
    }

    // Free TTS providers
    if (process.env.FREE_TTS_PROVIDERS) {
      this.freeTTSProviders = process.env.FREE_TTS_PROVIDERS.split(',');
    }

    // Provider selection
    this.ttsProvider = process.env.DEFAULT_TTS_PROVIDER || 'piper';
    this.sttProvider = process.env.DEFAULT_STT_PROVIDER || 'nvidia-nim';
  }

  isAdmin(email) {
    return this.adminEmails.has(email.trim().toLowerCase());
  }

  addAdminEmail(email) {
    this.adminEmails.add(email.trim().toLowerCase());
    return this.adminEmails.size;
  }

  removeAdminEmail(email) {
    return this.adminEmails.delete(email.trim().toLowerCase());
  }

  getAdminList() {
    return Array.from(this.adminEmails);
  }

  enableVoiceToggle() {
    this.voiceToggleEnabled = true;
    return true;
  }

  disableVoiceToggle() {
    this.voiceToggleEnabled = false;
    return true;
  }

  setProvider(providerType, providerName) {
    if (providerType === 'tts' && this.isProviderValid(providerName, 'tts')) {
      this.ttsProvider = providerName;
      return true;
    }
    if (providerType === 'stt' && this.isProviderValid(providerName, 'stt')) {
      this.sttProvider = providerName;
      return true;
    }
    return false;
  }

  isProviderValid(providerName, type) {
    if (type === 'tts') {
      return this.freeTTSProviders.includes(providerName) || 
             ['google', 'polly', 'elevenlabs'].includes(providerName);
    }
    if (type === 'stt') {
      return ['nvidia-nim', 'assemblyai', 'deepgram', 'servum'].includes(providerName);
    }
    return false;
  }

  getAvailableProviders(type) {
    if (type === 'tts') {
      return [...this.freeTTSProviders, 'google', 'polly', 'elevenlabs'];
    }
    if (type === 'stt') {
      return ['nvidia-nim', 'assemblyai', 'deepgram', 'servum', 'groq'];
    }
    return [];
  }

  // For admin UI
  getConfig() {
    return {
      adminEmails: this.getAdminList(),
      freeTTSProviders: this.freeTTSProviders,
      defaultTTSProvider: this.ttsProvider,
      defaultSTTProvider: this.sttProvider,
      voiceToggleEnabled: this.voiceToggleEnabled,
      voiceOutputEnabled: this.voiceOutputEnabled
    };
  }

  updateConfig(config) {
    if (config.adminEmails) {
      this.adminEmails = new Set(config.adminEmails.map(e => e.trim().toLowerCase()));
    }
    if (config.defaultTTSProvider) {
      this.ttsProvider = config.defaultTTSProvider;
    }
    if (config.defaultSTTProvider) {
      this.sttProvider = config.defaultSTTProvider;
    }
    if (config.voiceToggleEnabled !== undefined) {
      this.voiceToggleEnabled = config.voiceToggleEnabled;
    }
    return this.getConfig();
  }
}

const adminConfig = new AdminConfig();

// ============================================
// 2. FREE TTS PROVIDERS IMPLEMENTATION
// ============================================

class FreeTTSManager {
  constructor() {
    this.providers = new Map();

    this.initializeProviders();
  }

  initializeProviders() {
    // Assembly AI (Free tier)
    this.providers.set('assemblyai', {
      name: 'Assembly AI',
      endpoint: 'https://api.assemblyai.com/v2',
      apiKey: process.env.ASSEMBLYAI_API_KEY || null,
      models: ['general', 'enhanced'],
      freeChars: 10000, // Free tier limit
      costPerMillionChars: 0, // Free tier
      offlineCapable: false
    });

    // Deepgram (Free credits)
    this.providers.set('deepgram', {
      name: 'Deepgram',
      endpoint: 'https://api.deepgram.com/v1',
      apiKey: process.env.DEEPGRAM_API_KEY || null,
      models: ['aura-asteria-en', 'aura-archie-en'],
      freeChars: 1000, // Free credits
      costPerMillionChars: 0,
      offlineCapable: false
    });

    // Servum AI (Free)
    this.providers.set('servum', {
      name: 'Servum AI',
      endpoint: 'https://api.servum.ai/v1',
      apiKey: process.env.SERVUM_API_KEY || null,
      models: ['vits', 'fastpitch'],
      freeChars: 5000,
      costPerMillionChars: 0,
      offlineCapable: false
    });

    // Piper (Local, Free, Offline)
    this.providers.set('piper', {
      name: 'Piper TTS',
      endpoint: process.env.PIPER_ENDPOINT || 'http://localhost:5000',
      apiKey: null,
      models: ['en_US-libritts_r-high', 'es_ES-libritts_r-high', 'fr_FR-siwis-high'],
      freeChars: -1, // Unlimited
      costPerMillionChars: 0,
      offlineCapable: true
    });
  }

  synthesize(text, options = {}) {
    const { provider = 'piper', language = 'en' } = options;

    const ttsProvider = this.providers.get(provider);
    if (!ttsProvider) {
      throw new Error(`Provider ${provider} not found`);
    }

    // Check free tier limits
    if (ttsProvider.freeChars > 0) {
      const used = this.getUsage(options.userId || 'anonymous', provider);
      if (used >= ttsProvider.freeChars) {
        throw new Error('Free tier limit exceeded');
      }
    }

    // Generate audio
    return this.executeSynthesis(ttsProvider, text, language);
  }

  async executeSynthesis(provider, text, language) {
    if (provider.name === 'Assembly AI') {
      return await this.synthesizeAssemblyAI(text, language);
    } else if (provider.name === 'Deepgram') {
      return await this.synthesizeDeepgram(text, language);
    } else if (provider.name === 'Servum AI') {
      return await this.synthesizeServum(text, language);
    } else if (provider.name === 'Piper TTS') {
      return await this.synthesizePiper(text, language);
    }

    throw new Error('Synthesis not implemented for this provider');
  }

  async synthesizeAssemblyAI(text, language) {
    // Assembly AI API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      audio: `base64_assemblyai_${text.substring(0, 10)}...`,
      format: 'mp3',
      duration_ms: Math.max(100, text.length * 50),
      freeCharsRemaining: 10000 - this.getUsage('anonymous', 'assemblyai')
    };
  }

  async synthesizeDeepgram(text, language) {
    // Deepgram API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      audio: `base64_deepgram_${text.substring(0, 10)}...`,
      format: 'mp3',
      duration_ms: Math.max(100, text.length * 50),
      freeCharsRemaining: 1000 - this.getUsage('anonymous', 'deepgram')
    };
  }

  async synthesizeServum(text, language) {
    // Servum AI API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      audio: `base64_servum_${text.substring(0, 10)}...`,
      format: 'mp3',
      duration_ms: Math.max(100, text.length * 50),
      freeCharsRemaining: 5000 - this.getUsage('anonymous', 'servum')
    };
  }

  async synthesizePiper(text, language) {
    // Local Piper call
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      audio: `base64_piper_${text.substring(0, 10)}...`,
      format: 'wav',
      duration_ms: Math.max(100, text.length * 60),
      freeCharsRemaining: -1, // Unlimited
      offline: true
    };
  }

  getUsage(userId, provider) {
    // In production, use Redis
    return 0;
  }

  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
}

const freeTTSManager = new FreeTTSManager();

// ============================================
// 3. ADMIN API ENDPOINTS
// ============================================

function createAdminEndpoints(app) {
  // Get admin configuration
  app.get('/admin/config', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json(adminConfig.getConfig());
  });

  // Update admin configuration
  app.post('/admin/config/update', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const newConfig = adminConfig.updateConfig(req.body);
    res.json(newConfig);
  });

  // Add admin email
  app.post('/admin/add-email', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { newEmail } = req.body;
    const count = adminConfig.addAdminEmail(newEmail);

    res.json({
      success: true,
      message: `Added ${newEmail} as admin`,
      adminCount: count
    });
  });

  // Remove admin email
  app.delete('/admin/remove-email/:email', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email: removedEmail } = req.params;
    const removed = adminConfig.removeAdminEmail(removedEmail);

    if (adminConfig.getAdminList().length === 0) {
      return res.status(400).json({ error: 'Cannot remove last admin email' });
    }

    res.json({
      success: true,
      message: `Removed ${removedEmail} from admins`,
      remaining: adminConfig.getAdminList().length
    });
  });

  // Toggle voice output for premium users
  app.post('/admin/toggle-voice', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { enabled } = req.body;
    
    if (enabled) {
      adminConfig.enableVoiceToggle();
    } else {
      adminConfig.disableVoiceToggle();
    }

    res.json({
      success: true,
      voiceToggleEnabled: adminConfig.voiceToggleEnabled,
      message: `Voice output ${enabled ? 'enabled' : 'disabled'} for premium users`
    });
  });

  // Set default TTS provider
  app.post('/admin/set-tts-provider', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { provider } = req.body;

    if (!adminConfig.setProvider('tts', provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider', 
        valid: adminConfig.getAvailableProviders('tts') 
      });
    }

    res.json({
      success: true,
      defaultTTSProvider: adminConfig.ttsProvider,
      message: `Default TTS provider set to ${provider}`
    });
  });

  // Set default STT provider
  app.post('/admin/set-stt-provider', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { provider } = req.body;

    if (!adminConfig.setProvider('stt', provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider', 
        valid: adminConfig.getAvailableProviders('stt') 
      });
    }

    res.json({
      success: true,
      defaultSTTProvider: adminConfig.sttProvider,
      message: `Default STT provider set to ${provider}`
    });
  });

  // Get available free TTS providers
  app.get('/admin/free-tts-providers', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({
      providers: freeTTSManager.getAvailableProviders(),
      freeTierInfo: freeTTSManager.providers
    });
  });

  // Test TTS provider
  app.post('/admin/test-tts', async (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { text, provider = 'piper', language = 'en' } = req.body;

    try {
      const result = await freeTTSManager.synthesize(text, { provider, language });
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Check admin access
  app.get('/admin/verify', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    const isAuth = adminConfig.isAdmin(email);

    res.json({
      isAuthenticated: isAuth,
      isAdmin: isAuth,
      adminCount: adminConfig.getAdminList().length
    });
  });

  // Admin: Get all users' credit balances
  app.get('/admin/users/credits', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // In production, fetch from database
    const users = Array.from(creditSystem.userTiers.keys()).map(userId => ({
      userId,
      tier: creditSystem.userTiers.get(userId) || 'free',
      balance: creditSystem.getBalance(userId),
      hasApiKey: apiKeyControl.hasAnyAPIKey(userId)
    }));

    res.json({ users, total: users.length });
  });

  // Admin: Reset user credits
  app.post('/admin/users/reset-credits', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, amount } = req.body;
    
    creditSystem.addCredits(userId, amount);
    
    res.json({
      success: true,
      message: `Added ${amount} credits to ${userId}`,
      newBalance: creditSystem.getBalance(userId)
    });
  });

  // Admin: Set user tier
  app.post('/admin/users/set-tier', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, tier } = req.body;
    
    if (!['free', 'premium', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    creditSystem.userTiers.set(userId, tier);
    
    res.json({
      success: true,
      message: `Set ${userId} to ${tier} tier`,
      tier
    });
  });

  // Admin: Get upgrade paths
  app.get('/admin/upgrade-paths', (req, res) => {
    const email = req.headers['x-user-id'] || '';
    
    if (!adminConfig.isAdmin(email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({
      upgradePaths: UPGRADE_PATHS,
      paywallConfig: PAYWALL_CONFIG
    });
  });
}

// ============================================
// 4. EXPORTS
// ============================================

module.exports = {
  adminConfig,
  freeTTSManager,
  createAdminEndpoints
};
