# Phase 1: Caspian Integration & Foundation Setup

**Timeline**: Days 1-3 (15-day hackathon)
**Status**: Ready to start
**Previous Phase**: Phase 0 (v0.0.0) ✅ Complete

---

## 📋 Phase 1 Overview

This phase establishes the multi-channel foundation by:
1. Integrating Caspian SDK for 6-channel support
2. Creating unified message handling
3. Setting up database + authentication
4. Implementing message normalization

**After Phase 1**, your agent will:
- Receive messages on all 6 channels (WhatsApp, Telegram, Slack, Discord, Signal, Email)
- Store user data securely
- Route messages through normalized format
- Ready for Phase 2 (multimodal processing)

**Deliverable**: v0.1.0 tag on GitHub

---

## 🎯 Day 1: Caspian Setup & Database

### Step 1.1: Install Dependencies

```bash
cd /Users/souvikchakraborty/Mindmap/mindmap-build

# Verify Phase 0 works
npm install
npm run build
npm run type-check    # Should pass
npm run lint          # Should pass

# Add Caspian SDK
npm install caspian-sdk
```

### Step 1.2: Create Caspian Handler Package

```bash
# Create directory structure
mkdir -p packages/caspian-handler/src/channels
mkdir -p packages/caspian-handler/src/utils

# Create package.json for caspian-handler
# Create tsconfig.json for caspian-handler
# Create jest.config.js for caspian-handler
```

### Step 1.3: Setup PostgreSQL on Render

**Free Tier Render Database Setup**:
1. Visit https://render.com
2. Create PostgreSQL database
3. Get connection string
4. Add to `.env`:

```bash
DATABASE_URL=postgresql://user:password@dpg-xxx.render-n.com/mindmap-prod
REDIS_URL=redis://...
```

### Step 1.4: Create Database Schema

**File**: `services/db/schema.sql`

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'active'
);

-- Sessions table (for magic link auth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Keys (encrypted)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(100) NOT NULL,  -- 'openai', 'anthropic', 'featherless', etc
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, service)
);

-- Channel Identities (store user's ID on each channel)
CREATE TABLE channel_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,  -- 'whatsapp', 'telegram', etc
  channel_user_id VARCHAR(500) NOT NULL,  -- Phone, chat ID, user handle, etc
  channel_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(channel, channel_user_id)
);

-- User Thoughts (core data)
CREATE TABLE user_thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  original_content TEXT NOT NULL,
  normalized_content TEXT,  -- After processing
  input_type VARCHAR(50),  -- 'voice', 'text', 'image'
  intent VARCHAR(100),  -- Detected intent
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding FLOAT8[],  -- For semantic search (later)
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Audit Log (security trail)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(500),
  status VARCHAR(50),  -- 'success', 'failed'
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_channel_identities_user_id ON channel_identities(user_id);
CREATE INDEX idx_channel_identities_channel ON channel_identities(channel);
CREATE INDEX idx_user_thoughts_user_id ON user_thoughts(user_id);
CREATE INDEX idx_user_thoughts_created_at ON user_thoughts(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

**Run on Render**:
```bash
# Connect to Render database
psql $DATABASE_URL < services/db/schema.sql

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

---

## 🎯 Day 2: Caspian Handler Implementation

### Step 2.1: Create Caspian Handler Core

**File**: `packages/caspian-handler/src/handler.ts`

```typescript
import { CaspianHandler } from 'caspian-sdk';
import { UnifiedMessage, Channel } from '@thought-gps/core';
import { normalizeMessage } from './normalizer';
import * as whatsappHandler from './channels/whatsapp';
import * as telegramHandler from './channels/telegram';
import * as slackHandler from './channels/slack';
import * as discordHandler from './channels/discord';
import * as signalHandler from './channels/signal';
import * as emailHandler from './channels/email';

export class ThoughtGPSCaspianHandler {
  private handler: CaspianHandler;
  private channels: Record<Channel, any>;

  constructor() {
    // Initialize Caspian with all channels
    this.handler = new CaspianHandler({
      whatsapp: {
        accountId: process.env.WHATSAPP_ACCOUNT_ID,
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
        pin: process.env.SIGNAL_PIN,
      },
      email: {
        smtpConfig: {
          host: process.env.EMAIL_SMTP_HOST,
          port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
          user: process.env.EMAIL_SMTP_USER,
          password: process.env.EMAIL_SMTP_PASSWORD,
        },
      },
    });

    this.channels = {
      whatsapp: whatsappHandler,
      telegram: telegramHandler,
      slack: slackHandler,
      discord: discordHandler,
      signal: signalHandler,
      email: emailHandler,
    };
  }

  /**
   * Main entry point: receives message from any channel via Caspian
   */
  async handleIncomingMessage(
    channel: Channel,
    caspianMessage: any
  ): Promise<UnifiedMessage> {
    // Convert channel-specific format to unified format
    const unifiedMessage = await this.normalizeMessage(channel, caspianMessage);

    // Store in database
    await this.storeThought(unifiedMessage);

    return unifiedMessage;
  }

  /**
   * Send message on a specific channel
   */
  async sendMessage(
    userId: string,
    channel: Channel,
    content: string,
    attachments?: any[]
  ): Promise<void> {
    const handler = this.channels[channel];
    
    await handler.send({
      userId,
      content,
      attachments,
    });
  }

  /**
   * Normalize message from channel-specific format
   */
  private async normalizeMessage(
    channel: Channel,
    caspianMessage: any
  ): Promise<UnifiedMessage> {
    return normalizeMessage(channel, caspianMessage);
  }

  /**
   * Store thought in database
   */
  private async storeThought(message: UnifiedMessage): Promise<void> {
    // TODO: Implement in Phase 2 database integration
    console.log(`Storing thought from ${message.channel}:`, message);
  }
}

export default ThoughtGPSCaspianHandler;
```

### Step 2.2: Create Message Normalizer

**File**: `packages/caspian-handler/src/normalizer.ts`

```typescript
import { UnifiedMessage, Channel, InputType } from '@thought-gps/core';

/**
 * Convert channel-specific message to unified format
 */
export async function normalizeMessage(
  channel: Channel,
  caspianMessage: any
): Promise<UnifiedMessage> {
  switch (channel) {
    case 'whatsapp':
      return normalizeWhatsAppMessage(caspianMessage);
    case 'telegram':
      return normalizeTelegramMessage(caspianMessage);
    case 'slack':
      return normalizeSlackMessage(caspianMessage);
    case 'discord':
      return normalizeDiscordMessage(caspianMessage);
    case 'signal':
      return normalizeSignalMessage(caspianMessage);
    case 'email':
      return normalizeEmailMessage(caspianMessage);
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

/**
 * Detect input type from content
 */
export function detectInputType(message: any, channel: Channel): InputType {
  // Voice: audio attachments
  if (message.audio || message.voice) return 'voice';
  
  // Image: image attachments or embedded images
  if (message.image || message.images) return 'image';
  
  // Default to text
  return 'text';
}

// Channel-specific normalizers
function normalizeWhatsAppMessage(msg: any): UnifiedMessage {
  return {
    id: msg.messageId,
    user_id: msg.from,
    channel: 'whatsapp',
    content: msg.text || '',
    attachments: msg.attachments,
    metadata: {
      inputType: detectInputType(msg, 'whatsapp'),
      timestamp: msg.timestamp,
      messageType: msg.type, // 'text', 'image', 'audio', etc
    },
    created_at: new Date(msg.timestamp * 1000),
  };
}

function normalizeTelegramMessage(msg: any): UnifiedMessage {
  return {
    id: msg.message_id.toString(),
    user_id: msg.from.id.toString(),
    channel: 'telegram',
    content: msg.text || msg.caption || '',
    attachments: extractTelegramAttachments(msg),
    metadata: {
      inputType: detectInputType(msg, 'telegram'),
      chatId: msg.chat.id,
      firstName: msg.from.first_name,
    },
    created_at: new Date(msg.date * 1000),
  };
}

function normalizeSlackMessage(msg: any): UnifiedMessage {
  return {
    id: msg.ts,
    user_id: msg.user,
    channel: 'slack',
    content: msg.text || '',
    attachments: msg.files,
    metadata: {
      inputType: 'text',
      channelId: msg.channel,
      threadTs: msg.thread_ts,
    },
    created_at: new Date(parseInt(msg.ts) * 1000),
  };
}

function normalizeDiscordMessage(msg: any): UnifiedMessage {
  return {
    id: msg.id,
    user_id: msg.author.id,
    channel: 'discord',
    content: msg.content || '',
    attachments: msg.attachments,
    metadata: {
      inputType: detectInputType(msg, 'discord'),
      guildId: msg.guildId,
      channelId: msg.channelId,
    },
    created_at: msg.createdTimestamp ? new Date(msg.createdTimestamp) : new Date(),
  };
}

function normalizeSignalMessage(msg: any): UnifiedMessage {
  return {
    id: msg.id,
    user_id: msg.from,
    channel: 'signal',
    content: msg.body || '',
    attachments: msg.attachments,
    metadata: {
      inputType: detectInputType(msg, 'signal'),
      timestamp: msg.timestamp,
    },
    created_at: new Date(msg.timestamp),
  };
}

function normalizeEmailMessage(msg: any): UnifiedMessage {
  return {
    id: msg.messageId,
    user_id: msg.from,
    channel: 'email',
    content: msg.body || msg.subject,
    attachments: msg.attachments,
    metadata: {
      inputType: 'text',
      subject: msg.subject,
      inReplyTo: msg.inReplyTo,
    },
    created_at: new Date(msg.date),
  };
}

function extractTelegramAttachments(msg: any) {
  const attachments = [];
  
  if (msg.photo) {
    attachments.push({
      type: 'image',
      fileId: msg.photo[msg.photo.length - 1].file_id,
    });
  }
  
  if (msg.voice) {
    attachments.push({
      type: 'voice',
      fileId: msg.voice.file_id,
    });
  }
  
  if (msg.audio) {
    attachments.push({
      type: 'audio',
      fileId: msg.audio.file_id,
    });
  }
  
  return attachments.length > 0 ? attachments : undefined;
}
```

### Step 2.3: Create Channel Handlers

**File**: `packages/caspian-handler/src/channels/whatsapp.ts`

```typescript
import { CaspianClient } from 'caspian-sdk';

export async function send(options: {
  userId: string;
  content: string;
  attachments?: any[];
}): Promise<void> {
  const client = new CaspianClient('whatsapp');
  
  await client.send({
    to: options.userId,
    message: options.content,
    attachments: options.attachments,
  });
}
```

Similar files for: `telegram.ts`, `slack.ts`, `discord.ts`, `signal.ts`, `email.ts`

---

## 🎯 Day 3: Authentication & Testing

### Step 3.1: Magic Link Authentication

**File**: `packages/caspian-handler/src/auth/magic-link.ts`

```typescript
import crypto from 'crypto';
import { db } from '@thought-gps/database';
import { sendEmail } from './email';

export async function generateMagicLink(email: string): Promise<string> {
  // Create unique token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Find or create user
  let user = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  
  if (!user) {
    user = await db.query(
      'INSERT INTO users (email) VALUES ($1) RETURNING id',
      [email]
    );
  }
  
  // Create session with 30-min expiry
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  
  await db.query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );
  
  // Generate link
  const magicLink = `${process.env.APP_URL}/auth/verify?token=${token}`;
  
  // Send email
  await sendEmail({
    to: email,
    subject: 'Your Thought GPS Magic Link',
    body: `Click to login: ${magicLink}`,
  });
  
  return magicLink;
}

export async function verifyMagicLink(token: string): Promise<string> {
  const result = await db.query(
    'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  if (!result) {
    throw new Error('Invalid or expired token');
  }
  
  // Delete used token
  await db.query('DELETE FROM sessions WHERE token = $1', [token]);
  
  return result.user_id;
}
```

### Step 3.2: Test Endpoints

**File**: `packages/caspian-handler/src/api/routes.ts`

```typescript
import express from 'express';
import { generateMagicLink, verifyMagicLink } from '../auth/magic-link';
import { ThoughtGPSCaspianHandler } from '../handler';

const router = express.Router();
const handler = new ThoughtGPSCaspianHandler();

// Auth endpoints
router.post('/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    await generateMagicLink(email);
    res.json({ success: true, message: 'Check your email' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/auth/verify', async (req, res) => {
  try {
    const { token } = req.query;
    const userId = await verifyMagicLink(token as string);
    res.json({ success: true, userId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Webhook endpoints (Caspian sends to these)
router.post('/webhook/whatsapp', async (req, res) => {
  try {
    const message = await handler.handleIncomingMessage('whatsapp', req.body);
    res.json({ success: true, messageId: message.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook/telegram', async (req, res) => {
  try {
    const message = await handler.handleIncomingMessage('telegram', req.body);
    res.json({ success: true, messageId: message.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Similar for: slack, discord, signal, email

export default router;
```

### Step 3.3: Verify Locally

```bash
cd mindmap-build

# Install dependencies
npm install

# Build
npm run build

# Run tests (should pass)
npm run test

# Lint check
npm run lint

# Type check
npm run type-check
```

---

## 📝 Files to Create (Phase 1)

**Package Structure**:
```
packages/caspian-handler/
├── package.json
├── tsconfig.json
├── jest.config.js
└── src/
    ├── index.ts
    ├── handler.ts
    ├── normalizer.ts
    ├── api/
    │   ├── routes.ts
    │   └── server.ts
    ├── auth/
    │   ├── magic-link.ts
    │   └── email.ts
    └── channels/
        ├── whatsapp.ts
        ├── telegram.ts
        ├── slack.ts
        ├── discord.ts
        ├── signal.ts
        └── email.ts
```

**Services Structure**:
```
services/db/
├── schema.sql
├── migrations/
│   └── 001-init-schema.sql
└── index.ts (database client)
```

---

## 🚀 Phase 1 Completion Checklist

- [ ] **Day 1**
  - [ ] Caspian SDK installed
  - [ ] PostgreSQL database created on Render
  - [ ] Schema.sql executed
  - [ ] `.env` file configured with API keys
  - [ ] npm install and npm run build succeeds

- [ ] **Day 2**
  - [ ] Caspian handler package created
  - [ ] Message normalizer working for all 6 channels
  - [ ] Channel handlers implemented
  - [ ] Message routing tested locally

- [ ] **Day 3**
  - [ ] Magic link authentication working
  - [ ] Webhook endpoints configured
  - [ ] All tests passing
  - [ ] ESLint + TypeScript checks passing
  - [ ] Database connection verified

---

## 📤 Phase 1 Git Workflow

```bash
cd mindmap-build

# Create feature branch
git checkout -b feat/caspian-integration

# After implementation
git add packages/caspian-handler services/db
git commit -m "feat: caspian integration + message normalization

- Implement Caspian handler for 6 channels
- Message normalization to unified format
- PostgreSQL schema with users/sessions/api_keys
- Magic link passwordless authentication
- Webhook endpoints for all channels
- Ready for Phase 2: Multimodal Processing"

# Push to GitHub
git push -u origin feat/caspian-integration

# Create Pull Request on GitHub
# (or use: gh pr create)

# After review/approval, merge to main
git checkout main
git pull origin main

# Tag semantic version
git tag -a v0.1.0 -m "Phase 1: Caspian Integration & Foundation Setup"
git push origin v0.1.0
```

---

## 🎯 Phase 1 Success Criteria

✅ **All 6 channels receive messages**
- WhatsApp messages arrive
- Telegram messages arrive
- Slack messages arrive
- Discord messages arrive
- Signal messages arrive
- Email arrives

✅ **Message normalization working**
- All channel formats convert to UnifiedMessage
- Metadata preserved (channel, user, timestamp)
- Attachments handled correctly

✅ **Database operational**
- Users table functional
- Sessions table functional
- Channel identities table functional
- Magic link auth working end-to-end

✅ **Code quality standards**
- npm run build → success
- npm run lint → 0 warnings
- npm run type-check → pass
- No secrets in repository

✅ **Ready for Phase 2**
- Foundation solid for multimodal processing
- Authentication working
- Message storage working

---

## 📋 What's Next After Phase 1

**Phase 2: Multimodal Processing (Days 4-6)**
- Voice transcription with Whisper
- Image understanding with Claude Vision
- Text normalization
- Semantic embeddings

**You'll use:**
- OpenAI Whisper (voice → text)
- Claude 3 Vision (image → text)
- Text embedding models
- PostgreSQL pgvector extension

---

## 🔗 Important Resources

- **Caspian Docs**: https://www.trycaspianai.com/docs/
- **Phase 0 Code**: `/Users/souvikchakraborty/Mindmap/mindmap-build/`
- **Render Docs**: https://render.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

**Ready to start Phase 1?**

Next session: Create the Caspian handler package and start implementing channel handlers.
