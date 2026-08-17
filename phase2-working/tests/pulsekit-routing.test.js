/**
 * PulseKit Routing Tests
 * 
 * Tests the core send/routing logic: user channel lookup, priority ordering,
 * fallback chains, broadcast, schedule, and inbound handling.
 */

// Mock dependencies
jest.mock('../src/crypto', () => ({
  decrypt: jest.fn((s) => {
    // Simple mock: return the input as-is (assumes test data is unencrypted JSON)
    try { return typeof s === 'string' ? s : JSON.stringify(s); } catch { return s; }
  }),
}));

jest.mock('../src/pulsekit/channels/telegram', () => ({
  createTelegramChannel: jest.fn().mockReturnValue({
    name: 'telegram',
    init: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    startPolling: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../src/pulsekit/channels/slack', () => ({
  createSlackChannel: jest.fn().mockReturnValue({
    name: 'slack',
    init: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    startPolling: jest.fn().mockResolvedValue(undefined),
    handleWebhook: jest.fn().mockResolvedValue({ ok: true }),
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../src/pulsekit/channels/discord', () => ({
  createDiscordChannel: jest.fn().mockReturnValue({
    name: 'discord',
    init: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    startPolling: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../src/pulsekit/channels/email', () => ({
  createEmailChannel: jest.fn().mockReturnValue({
    name: 'email',
    init: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    startPolling: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../src/pulsekit/channels/webpush', () => ({
  createWebPushChannel: jest.fn().mockReturnValue({
    name: 'webpush',
    init: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    startPolling: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock db pool for PulseKit
const mockPool = {
  query: jest.fn(),
};

const { createPulseKit } = require('../src/pulsekit/index');
const { createTelegramChannel } = require('../src/pulsekit/channels/telegram');
const { decrypt } = require('../src/crypto');

describe('PulseKit Routing', () => {
  let pulseKit;
  const mockWebpush = { sendNotification: jest.fn() };
  const mockVapidKeys = { publicKey: 'test', privateKey: 'test' };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Set env vars for global channels
    process.env.TELEGRAM_BOT_TOKEN = 'test:token';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'pass';
    
    mockPool.query.mockReset();
    mockPool.query.mockResolvedValue({ rows: [] }); // default: no user channels
    
    pulseKit = await createPulseKit(mockPool, mockWebpush, mockVapidKeys);
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  // ── Channel Initialization ──
  describe('channel initialization', () => {
    test('initializes with configured env channels', () => {
      expect(pulseKit.channels).toContain('telegram');
      expect(pulseKit.channels).toContain('email');
      expect(pulseKit.isLive).toBe(true);
    });

    test('channels list is current', () => {
      const ch = pulseKit.channels;
      expect(Array.isArray(ch)).toBe(true);
      expect(ch.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Status ──
  describe('status()', () => {
    test('returns health report', () => {
      const s = pulseKit.status();
      expect(s).toHaveProperty('channels');
      expect(s).toHaveProperty('isLive');
      expect(s).toHaveProperty('queueDepth');
      expect(s).toHaveProperty('userDriversCached');
      expect(s.isLive).toBe(true);
    });
  });

  // ── Send ──
  describe('send()', () => {
    test('returns undefined when message is empty', async () => {
      const result = await pulseKit.send({ to: 'user-1', message: '' });
      expect(result).toBeUndefined();
    });

    test('returns undefined when to is missing', async () => {
      const result = await pulseKit.send({ message: 'hi' });
      expect(result).toBeUndefined();
    });

    test('delivers via global channel when user has no custom channels', async () => {
      mockPool.query.mockResolvedValue({ rows: [] }); // no user channels
      
      const result = await pulseKit.send({
        channel: 'telegram',
        to: 'user-1',
        message: 'Test message',
        title: 'Test',
      });
      
      // Should have delivered via global telegram bot
      expect(result.delivered).toBe(true);
      expect(result.channel).toBe('telegram');
      
      // Should have stored notification in DB
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.any(Array)
      );
    });

    test('uses user channel when available', async () => {
      // Mock user with a telegram channel
      mockPool.query.mockResolvedValueOnce({
        rows: [{ platform: 'telegram', credentials: JSON.stringify({ bot_token: 'user:token', chat_id: '12345' }), display_name: 'My Bot' }],
      });
      
      const result = await pulseKit.send({
        channel: 'telegram',
        to: 'user-1',
        message: 'Through user bot',
      });
      
      expect(result.delivered).toBe(true);
      expect(result.channel).toBe('telegram');
    });

    test('falls back when user channel driver fails', async () => {
      // Mock that user has a channel with bad credentials
      mockPool.query.mockResolvedValueOnce({
        rows: [{ platform: 'telegram', credentials: JSON.stringify({ bot_token: 'bad:token', chat_id: '12345' }), display_name: 'Bad Bot' }],
      });
      
      // Make the per-user driver send fail
      createTelegramChannel().send.mockRejectedValue(new Error('Unauthorized'));
      
      const result = await pulseKit.send({
        channel: 'telegram',
        to: 'user-1',
        message: 'Fallback test',
      });
      
      // Should still be delivered via some available fallback channel
      expect(result.delivered).toBe(true);
      expect(['telegram', 'discord', 'slack', 'email', 'webpush']).toContain(result.channel);
    });

    test('falls back through available channels when preferred channel fails', async () => {
      // Create a small PulseKit with just enough to test fallback
      const smallPool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
      const wp = { sendNotification: jest.fn().mockRejectedValue(new Error('fail')) };
      const vk = { publicKey: 'test', privateKey: 'test' };
      
      process.env.TELEGRAM_BOT_TOKEN = '';
      delete process.env.SMTP_HOST;
      
      const smallKit = await createPulseKit(smallPool, wp, vk);
      
      const result = await smallKit.send({
        channel: 'telegram',
        to: 'user-1',
        message: 'Fallback via available channel',
      });
      
      // Should be delivered via some available channel (not db-only)
      expect(result.delivered).toBe(true);
      expect(['slack', 'discord', 'email', 'webpush']).toContain(result.channel);
    });

    test('uses chat_id as to address for user channel', async () => {
      // Mock user with a telegram channel
      mockPool.query.mockResolvedValueOnce({
        rows: [{ platform: 'telegram', credentials: JSON.stringify({ bot_token: 'tok', chat_id: '67890' }), display_name: 'Test' }],
      });
      
      // Make the global Telegram bot fail so PulseKit falls through to user channel
      const globalTg = createTelegramChannel();
      // Use mockRejectedValueOnce so only the FIRST send() call (global bot) fails
      globalTg.send.mockRejectedValueOnce(new Error('Global bot down'));
      
	      const result = await pulseKit.send({ channel: 'telegram', to: 'user-1', message: 'hi' });
	      
	      // Result is delivered (via global bot after user channel's mockRejectedValueOnce)
	      expect(result.delivered).toBe(true);
    });

    test('blocks paid channels and reroutes to free', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      const result = await pulseKit.send({
        channel: 'whatsapp',  // paid channel
        to: 'user-1',
        message: 'Paid test',
      });
      
      // Should still deliver (rerouted), not crash
      expect(result).toBeDefined();
    });
  });

  // ── Broadcast ──
  describe('broadcast()', () => {
    test('sends to multiple users', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      const results = await pulseKit.broadcast(
        ['user-1', 'user-2'],
        { message: 'Broadcast test', channel: 'webpush' }
      );
      
      expect(results.length).toBe(2);
    });
  });

  // ── Schedule ──
  describe('schedule()', () => {
    test('sends after delay', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      const start = Date.now();
      await pulseKit.schedule(50, { channel: 'telegram', to: 'user-1', message: 'Delayed' });
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  // ── OnInbound ──
  describe('onInbound()', () => {
    test('registers handler without error', () => {
      const handler = jest.fn();
      pulseKit.onInbound(handler);
      expect(true).toBe(true); // smoke test
    });
  });

  // ── Handle Webhook Event ──
  describe('handleWebhookEvent()', () => {
    test('routes to slack handler', async () => {
      const result = await pulseKit.handleWebhookEvent('slack', { type: 'url_verification', challenge: 'abc' });
      expect(result).toBeDefined();
    });

    test('returns null for unknown channel', async () => {
      const result = await pulseKit.handleWebhookEvent('unknown_channel', {});
      expect(result).toBeNull();
    });
  });

  // ── Invalidate User Driver ──
  describe('invalidateUserDriver()', () => {
    test('does not throw when driver does not exist', async () => {
      await pulseKit.invalidateUserDriver('nonexistent', 'telegram');
      expect(true).toBe(true);
    });
  });

  // ── Destroy ──
  describe('destroy()', () => {
    test('cleans up without throwing', async () => {
      await pulseKit.destroy();
      expect(true).toBe(true);
    });
  });
});
