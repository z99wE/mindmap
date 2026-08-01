# @thought-gps/caspian-handler

Multi-channel message handler for WhatsApp, Telegram, Slack, Discord, Signal, and Email.

## Installation

```bash
npm install @thought-gps/caspian-handler
```

## Quick Start

```typescript
import ThoughtGPSCaspianHandler from '@thought-gps/caspian-handler';

const handler = new ThoughtGPSCaspianHandler({
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN,
  },
  signal: {
    phoneNumber: process.env.SIGNAL_PHONE,
  },
  email: {
    smtpHost: process.env.EMAIL_SMTP_HOST,
    smtpPort: 587,
    smtpUser: process.env.EMAIL_SMTP_USER,
    smtpPassword: process.env.EMAIL_SMTP_PASSWORD,
  },
});

// Handle incoming message
const normalized = await handler.handleIncomingMessage('whatsapp', rawMessage);

// Send message
await handler.sendMessage(userId, 'telegram', 'Hello!');
```

## Features

- ✅ 6-channel support (WhatsApp, Telegram, Slack, Discord, Signal, Email)
- ✅ Message normalization to unified format
- ✅ Input type detection (voice, text, image)
- ✅ Attachment handling
- ✅ Encryption at rest
- ✅ Passwordless authentication (magic links)
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Circuit breaker pattern
- ✅ Graceful error handling

## API Reference

### ThoughtGPSCaspianHandler

Main handler class for all channels.

#### Constructor

```typescript
new ThoughtGPSCaspianHandler(config: ChannelConfig)
```

#### Methods

##### handleIncomingMessage(channel, message)

Process incoming message from any channel.

- **Parameters**:
  - `channel`: 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'signal' | 'email'
  - `message`: Raw message payload from Caspian SDK
- **Returns**: `Promise<UnifiedMessage>`
- **Throws**: Error if message is invalid

```typescript
const message = await handler.handleIncomingMessage('whatsapp', {
  messageId: '123',
  from: '+1234567890',
  text: { body: 'Hello' },
  timestamp: 1625097600,
});
```

##### sendMessage(userId, channel, content, attachments?)

Send message to user on a specific channel.

- **Parameters**:
  - `userId`: string - Target user ID
  - `channel`: Channel - Destination channel
  - `content`: string - Message content
  - `attachments`: any[] (optional) - Attachments
- **Returns**: `Promise<void>`

```typescript
await handler.sendMessage('+1234567890', 'whatsapp', 'Hello!');
```

##### healthCheck()

Check health of all channels.

- **Returns**: `Promise<Record<Channel, boolean>>`

```typescript
const health = await handler.healthCheck();
// { whatsapp: true, telegram: true, ... }
```

## Authentication Service

### Magic Link Authentication

Passwordless authentication using magic links:

```typescript
import { requestMagicLink, verifyMagicLink, verifySession } from '@thought-gps/caspian-handler';

// 1. Request magic link
await requestMagicLink('user@example.com');

// 2. User receives email with link, clicks it
// 3. Server verifies token
const session = await verifyMagicLink(token);
// Returns: { userId, email, sessionToken }

// 4. Use session token for subsequent requests
const user = await verifySession(sessionToken);
```

## Security

### Input Validation

All input is validated using Zod schemas:

```typescript
const MessageSchema = z.object({
  content: z.string().min(1).max(10000),
  channel: z.enum(['whatsapp', 'telegram', ...]),
  // ...
});
```

### Rate Limiting

- Global: 100 requests per 15 minutes
- Auth: 5 login attempts per 15 minutes
- API: 100 requests per minute

### Encryption

All sensitive data (API keys, session tokens) are encrypted using AES-256-GCM.

```typescript
import { EncryptionService } from '@thought-gps/caspian-handler';

const encryption = new EncryptionService(masterKey);
const encrypted = encryption.encrypt(apiKey);
const decrypted = encryption.decrypt(encrypted);
```

## Testing

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage
```

## Architecture

```
┌──────────────┐
│   Caspian    │
│     SDK      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ ThoughtGPSCaspianHandler │
│  - Message Normalization │
│  - Input Validation      │
│  - Error Handling        │
└──────────┬───────────────┘
           │
           ▼
   ┌───────────────┐
   │   Database    │
   │  (PostgreSQL) │
   └───────────────┘
```

## License

MIT
