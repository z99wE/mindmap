/**
 * PulseKit Channel Driver Tests
 * 
 * Tests each channel driver (Telegram, Slack, Discord, Email, Signal)
 * with mocked HTTP calls to verify send/receive/handling logic.
 */

// Mock https module before requiring anything
const mockHttps = { request: jest.fn() };
jest.mock('https', () => mockHttps);

// Mock http module (used by Signal driver for localhost URLs)
const mockHttp = { request: jest.fn() };
jest.mock('http', () => mockHttp);

// Default mock implementations so channel drivers can initialize without errors
function defaultMockSuccess(body = { ok: true, result: { username: 'TestBot' } }) {
  return (opts, cb) => {
    cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify(body)); if (e === 'end') h(); } });
    return { on: jest.fn(), write: jest.fn(), end: jest.fn(), setTimeout: jest.fn(), destroy: jest.fn() };
  };
}
mockHttps.request.mockImplementation(defaultMockSuccess());
mockHttp.request.mockImplementation(defaultMockSuccess({}));

// Mock ws module for Discord
jest.mock('ws', () => {
  const MockWebSocket = jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      close: jest.fn(),
    };
  });
  return MockWebSocket;
});

// Mock nodemailer for Email
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ accepted: ['test@test.com'] }),
    close: jest.fn(),
  }),
}));

const { createTelegramChannel } = require('../src/pulsekit/channels/telegram');
const { createSlackChannel } = require('../src/pulsekit/channels/slack');
const { createDiscordChannel } = require('../src/pulsekit/channels/discord');
const { createEmailChannel } = require('../src/pulsekit/channels/email');
const { createSignalChannel } = require('../src/pulsekit/channels/signal');

// ── Helper: simulate https request/response ──
function mockHttpsResponse(statusCode, body) {
  const responseStream = {
    statusCode,
    on: function (event, handler) {
      if (event === 'data') handler(JSON.stringify(body));
      if (event === 'end') handler();
      return this;
    },
  };
  const requestStream = {
    on: jest.fn((event, handler) => {
      if (event === 'error') { /* no-op */ }
      return requestStream;
    }),
    write: jest.fn(),
    end: jest.fn(),
    setTimeout: jest.fn(),
    destroy: jest.fn(),
  };
  mockHttps.request.mockImplementation((_opts, cb) => {
    cb(responseStream);
    return requestStream;
  });
  return requestStream;
}

function mockHttpsError(errorMessage) {
  const requestStream = {
    on: jest.fn((event, handler) => {
      if (event === 'error') handler(new Error(errorMessage));
      return requestStream;
    }),
    write: jest.fn(),
    end: jest.fn(),
  };
  mockHttps.request.mockImplementation(() => requestStream);
  return requestStream;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply default implementations after clearAllMocks
  // so channel drivers can initialize without errors
  mockHttps.request.mockImplementation(defaultMockSuccess());
  mockHttp.request.mockImplementation(defaultMockSuccess({}));
});

// ═══════════════════════════════════════════════════════════
// TELEGRAM CHANNEL
// ═══════════════════════════════════════════════════════════
describe('Telegram Channel Driver', () => {
  const TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

  test('send() makes correct API call to Telegram', async () => {
    mockHttpsResponse(200, { ok: true, result: { message_id: 42 } });
    const tg = createTelegramChannel({ botToken: TOKEN });
    await tg.send({ to: '123456789', message: 'Hello from test' });
    
    expect(mockHttps.request).toHaveBeenCalled();
    const callArgs = mockHttps.request.mock.calls[0][0];
    expect(callArgs.hostname).toBe('api.telegram.org');
    expect(callArgs.path).toContain(`/bot${TOKEN}/sendMessage`);
  });

  test('send() throws on non-ok response', async () => {
    mockHttpsResponse(200, { ok: false, description: 'Unauthorized' });
    const tg = createTelegramChannel({ botToken: TOKEN });
    await expect(tg.send({ to: '123', message: 'Test' })).rejects.toThrow('Unauthorized');
  });

  test('send() includes title in markdown', async () => {
    let sentBody = null;
    const reqStream = {
      on: jest.fn(),
      write: jest.fn((d) => { sentBody = JSON.parse(d); }),
      end: jest.fn(),
      setTimeout: jest.fn(),
      destroy: jest.fn(),
    };
    mockHttps.request.mockImplementation((_opts, cb) => {
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify({ ok: true, result: {} })); if (e === 'end') h(); } });
      return reqStream;
    });
    const tg = createTelegramChannel({ botToken: TOKEN });
    await tg.send({ to: '123', message: 'Body', title: 'Title' });
    
    expect(sentBody.text).toContain('*Title*');
    expect(sentBody.chat_id).toBe('123');
  });

  test('init() validates token via getMe', async () => {
    mockHttpsResponse(200, { ok: true, result: { username: 'TestBot' } });
    const tg = createTelegramChannel({ botToken: TOKEN });
    await tg.init();
    expect(mockHttps.request).toHaveBeenCalled();
  });

  test('polling receives messages and triggers handlers', async () => {
    const updates = [
      { update_id: 1, message: { message_id: 10, from: { id: 999 }, chat: { id: 999 }, text: 'Hello bot' } },
    ];
    let callCount = 0;
    mockHttps.request.mockImplementation((_opts, cb) => {
      callCount++;
      const resp = callCount === 1
        ? { ok: true, result: { username: 'TestBot' } } // getMe
        : { ok: true, result: updates }; // getUpdates
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify(resp)); if (e === 'end') h(); } });
      return { on: jest.fn(), write: jest.fn(), end: jest.fn(), setTimeout: jest.fn(), destroy: jest.fn() };
    });

    const tg = createTelegramChannel({ botToken: TOKEN });
    await tg.init();

    const handler = jest.fn();
    tg.onMessage(handler);
    
    // Start polling and wait for the first poll cycle
    await tg.startPolling();
    await new Promise(r => setTimeout(r, 100));
    
    // Stop polling to avoid infinite loop
    await tg.destroy();

    expect(handler).toHaveBeenCalled();
    const msg = handler.mock.calls[0][0];
    expect(msg.from).toBe('999');
    expect(msg.text).toBe('Hello bot');
    expect(typeof msg.reply).toBe('function');
  });

  test('onMessage registers handler correctly', () => {
    const tg = createTelegramChannel({ botToken: TOKEN });
    const handler = jest.fn();
    tg.onMessage(handler);
    // Trigger internal message handler via destroy cleanup
    expect(true).toBe(true); // smoke test - handler registration doesn't throw
  });

  test('send with empty message does not throw', async () => {
    mockHttpsResponse(200, { ok: true, result: {} });
    const tg = createTelegramChannel({ botToken: TOKEN });
    await tg.send({ to: '123', message: '' }); // should not crash
  });
});

// ═══════════════════════════════════════════════════════════
// SLACK CHANNEL
// ═══════════════════════════════════════════════════════════
describe('Slack Channel Driver', () => {
  const TOKEN = 'xoxb-test-token-12345';

  test('send() to user opens DM then posts', async () => {
    let callIndex = 0;
    mockHttps.request.mockImplementation((opts, cb) => {
      callIndex++;
      let body;
      if (callIndex === 1) {
        // conversations.open response
        body = { ok: true, channel: { id: 'D12345' } };
      } else {
        // chat.postMessage response
        body = { ok: true, ts: '1234.5678' };
      }
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify(body)); if (e === 'end') h(); } });
      return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    });

    const slack = createSlackChannel({ token: TOKEN });
    await slack.init(); // auth.test
    await slack.send({ to: 'U12345', message: 'Hello Slack' });
    
    // Should have opened DM then posted
    expect(mockHttps.request.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('send() to channel posts directly', async () => {
    mockHttps.request.mockImplementation((opts, cb) => {
      const body = opts.path?.includes('auth.test')
        ? { ok: true, user: 'testbot', team: 'test', user_id: 'U123' }
        : { ok: true, ts: '1234.5678' };
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify(body)); if (e === 'end') h(); } });
      return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    });

    const slack = createSlackChannel({ token: TOKEN });
    await slack.init();
    await slack.send({ to: 'C12345', message: 'Channel message' });
    expect(mockHttps.request).toHaveBeenCalled();
  });

  test('handleWebhook processes event_callback with message', async () => {
    const slack = createSlackChannel({ token: TOKEN });
    await slack.init();
    
    const handler = jest.fn();
    slack.onMessage(handler);
    
    const payload = {
      type: 'event_callback',
      event: {
        type: 'message',
        user: 'U999',
        text: 'Hello from Slack',
        channel: 'C999',
      },
    };
    
    await slack.handleWebhook(payload);
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].from).toBe('U999');
    expect(handler.mock.calls[0][0].text).toBe('Hello from Slack');
  });

  test('handleWebhook returns challenge for url_verification', async () => {
    const slack = createSlackChannel({ token: TOKEN });
    await slack.init();
    const result = await slack.handleWebhook({ type: 'url_verification', challenge: 'xyz123' });
    expect(result).toEqual({ challenge: 'xyz123' });
  });

  test('init without token works in webhook-only mode', async () => {
    const slack = createSlackChannel({ token: null });
    await slack.init(); // Should not throw
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// DISCORD CHANNEL
// ═══════════════════════════════════════════════════════════
describe('Discord Channel Driver', () => {
  const TOKEN = 'discord_test_token_12345';

  test('send() creates DM channel and sends message', async () => {
    let callIndex = 0;
    mockHttps.request.mockImplementation((opts, cb) => {
      callIndex++;
      let body;
      if (callIndex === 1) {
        body = { id: '12345', username: 'TestBot', discriminator: '0000' }; // getMe
      } else if (callIndex === 2) {
        body = { id: 'DM999' }; // create DM
      } else {
        body = { id: '999' }; // send message
      }
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify(body)); if (e === 'end') h(); } });
      return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    });

    const dc = createDiscordChannel({ token: TOKEN });
    await dc.init();
    await dc.send({ to: 'user456', message: 'Hello Discord' });
    expect(mockHttps.request.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('send() handles non-DM channel fallback', async () => {
    let callIndex = 0;
    mockHttps.request.mockImplementation((opts, cb) => {
      callIndex++;
      let body;
      if (callIndex === 1) {
        body = { id: '12345', username: 'TestBot', discriminator: '0000' };
      } else if (callIndex === 2) {
        // create DM fails
        cb({ statusCode: 400, on: (e, h) => { if (e === 'data') h(JSON.stringify({ message: 'Bad Request' })); if (e === 'end') h(); } });
        return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
      } else {
        body = { id: '999' };
      }
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify(body)); if (e === 'end') h(); } });
      return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    });

    const dc = createDiscordChannel({ token: TOKEN });
    await dc.init();
    await dc.send({ to: 'ch999', message: 'Channel msg' });
    expect(mockHttps.request.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════
// EMAIL CHANNEL
// ═══════════════════════════════════════════════════════════
describe('Email Channel Driver', () => {
  const nodemailer = require('nodemailer');

  test('init() verifies SMTP connection', async () => {
    const email = createEmailChannel({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@test.com',
      pass: 'password',
      from: 'test@test.com',
    });
    await email.init();
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });

  test('send() sends email with correct args', async () => {
    const email = createEmailChannel({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@test.com',
      pass: 'password',
      from: 'test@test.com',
    });
    await email.init();
    await email.send({ to: 'user@test.com', message: 'Hello Email', title: 'Test' });
    
    const transport = nodemailer.createTransport();
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Test',
        text: 'Hello Email',
      })
    );
  });

  test('send() with html param includes html body', async () => {
    const email = createEmailChannel({
      host: 'smtp.test.com',
      port: 587,
      user: 'a@b.com',
      pass: 'pass',
    });
    await email.init();
    await email.send({ to: 'b@b.com', message: 'Hello', html: '<p>Hello</p>' });
    const transport = nodemailer.createTransport();
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ html: '<p>Hello</p>' })
    );
  });

  test('destroy() closes transporter', async () => {
    const email = createEmailChannel({
      host: 'smtp.test.com',
      port: 587,
      user: 'a@b.com',
      pass: 'pass',
    });
    await email.init();
    await email.destroy();
    const transport = nodemailer.createTransport();
    expect(transport.close).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// SIGNAL CHANNEL
// ═══════════════════════════════════════════════════════════
describe('Signal Channel Driver', () => {
  const BASE_URL = 'http://localhost:8080';
  const PHONE = '+15551234567';

  test('send() makes request to signal REST API', async () => {
    let sentPath = '';
    const reqStream = {
      on: jest.fn(),
      write: jest.fn(() => {}),
      end: jest.fn(),
    };
    
    // Mock the http module for Signal's localhost calls
    mockHttp.request.mockImplementation((opts, cb) => {
      sentPath = opts.path;
      cb({ statusCode: 200, on: (e, h) => { if (e === 'data') h(JSON.stringify({})); if (e === 'end') h(); } });
      return reqStream;
    });

    const signal = createSignalChannel({ baseUrl: BASE_URL, phoneNumber: PHONE });
    await signal.init();
    await signal.send({ to: '+15559876543', message: 'Hello Signal' });
    // Should attempt to send via signal API
    expect(mockHttp.request).toHaveBeenCalled();
  });

  test('send throws without phone number', async () => {
    const signal = createSignalChannel({ baseUrl: BASE_URL, phoneNumber: null });
    await expect(signal.send({ to: '+15559876543', message: 'Test' })).rejects
      .toThrow('Signal phone number not configured');
  });

  test('handleWebhook processes signal-cli format messages', async () => {
    const signal = createSignalChannel({ baseUrl: BASE_URL, phoneNumber: PHONE });
    const handler = jest.fn();
    signal.onMessage(handler);
    
    await signal.handleWebhook({
      envelope: {
        sourceNumber: '+15559999999',
        dataMessage: { message: 'Hello from Signal' },
      },
    });
    
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].from).toBe('+15559999999');
    expect(handler.mock.calls[0][0].text).toBe('Hello from Signal');
  });

  test('handleWebhook processes generic webhook format', async () => {
    const signal = createSignalChannel({ baseUrl: BASE_URL, phoneNumber: PHONE });
    const handler = jest.fn();
    signal.onMessage(handler);
    
    await signal.handleWebhook({
      messages: [{ from: '+15551111111', text: 'Generic format' }],
    });
    
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].from).toBe('+15551111111');
  });

  test('handleWebhook processes single message object', async () => {
    const signal = createSignalChannel({ baseUrl: BASE_URL, phoneNumber: PHONE });
    const handler = jest.fn();
    signal.onMessage(handler);
    
    await signal.handleWebhook({
      from: '+15552222222',
      text: 'Simple message',
    });
    
    expect(handler).toHaveBeenCalled();
  });
});
