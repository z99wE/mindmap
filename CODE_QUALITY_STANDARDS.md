# Code Quality Standards & Best Practices

**Version**: 1.0.0  
**Applies To**: All Phases (1-5)  
**Enforcement**: Mandatory

---

## 📋 Overview

This document establishes strict quality standards for the Thought GPS project. Every line of code written across all phases must adhere to these principles.

**Core Pillars**:
1. **Code Efficiency** - Optimal performance, minimal resources
2. **Code Quality** - Clean, maintainable, well-documented
3. **Code Security** - Defense in depth, secure by default
4. **Accessibility** - WCAG 2.1 AA compliance, inclusive design
5. **Code Explainability** - Self-documenting, well-commented
6. **Robustness** - Error handling, graceful degradation
7. **Scalability** - Design for 10x growth, horizontal scaling

---

## 🎯 Quality Metrics & Thresholds

### Code Quality Thresholds (MANDATORY)

| Metric | Threshold | Tool |
|--------|-----------|------|
| **TypeScript Coverage** | 100% (no `any`) | `tsc --noImplicitAny` |
| **Code Coverage** | ≥ 80% | Jest |
| **Cyclomatic Complexity** | ≤ 10 per function | ESLint `complexity` |
| **Cognitive Complexity** | ≤ 15 per function | ESLint `sonarjs/cognitive` |
| **Lines per Function** | ≤ 50 lines | Manual review |
| **Lines per File** | ≤ 300 lines | Manual review |
| **ESLint Warnings** | 0 | `npm run lint` |
| **Security Vulnerabilities** | 0 high/critical | `npm audit` |
| **Bundle Size** | < 500KB gzipped | Webpack Bundle Analyzer |
| **Type Check Errors** | 0 | `npm run type-check` |

### Performance Thresholds (MANDATORY)

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 200ms | Application monitoring |
| Database Query Time (p95) | < 100ms | Query logs |
| Time to First Byte (TTFB) | < 600ms | Lighthouse |
| First Contentful Paint (FCP) | < 1.8s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| First Input Delay (FID) | < 100ms | Lighthouse |
| Memory Usage | < 512MB per service | Process monitoring |

---

## 📐 Architecture Principles

### 1. Separation of Concerns

**Rule**: Each module has a single, well-defined responsibility.

```typescript
// ❌ BAD: Mixed concerns
class UserService {
  async createUser(data: UserData) {
    const user = await this.db.insert(data);
    await this.email.sendWelcome(user.email);
    await this.analytics.track('user_created', user);
    return user;
  }
}

// ✅ GOOD: Single responsibility
class UserService {
  constructor(
    private db: UserRepository,
    private eventBus: EventBus
  ) {}
  
  async createUser(data: UserData): Promise<User> {
    const user = await this.db.insert(data);
    await this.eventBus.emit('user.created', user);
    return user;
  }
}
```

### 2. Dependency Injection

**Rule**: All dependencies are injected, not instantiated.

```typescript
// ❌ BAD: Hard dependency
class ChannelHandler {
  private client = new WhatsAppClient(); // Hard to test
  
  async send(message: string) {
    return this.client.send(message);
  }
}

// ✅ GOOD: Dependency injection
interface MessageClient {
  send(message: string): Promise<void>;
}

class ChannelHandler {
  constructor(private client: MessageClient) {} // Injected
  
  async send(message: string): Promise<void> {
    return this.client.send(message);
  }
}
```

---

## 🔒 Security Standards

### 1. Input Validation (MANDATORY)

**Rule**: All external input is validated and sanitized.

```typescript
import { z } from 'zod';

// Define strict schemas
const MessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long')
    .refine(
      (val) => !containsMaliciousPatterns(val),
      'Message contains forbidden content'
    ),
  channel: z.enum(['whatsapp', 'telegram', 'slack', 'discord', 'signal', 'email']),
  userId: z.string().uuid(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'audio', 'video', 'document']),
    url: z.string().url(),
    size: z.number().max(25 * 1024 * 1024), // 25MB max
  })).optional(),
});

// Validate before processing
async function handleMessage(rawMessage: unknown): Promise<void> {
  const message = MessageSchema.parse(rawMessage); // Throws on invalid
  await processMessage(message);
}
```

### 2. Encryption at Rest (MANDATORY)

**Rule**: All sensitive data is encrypted before storage.

```typescript
import crypto from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor(encryptionKey: string) {
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }
  
  encrypt(plaintext: string): { ciphertext: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }
}
```

### 3. Rate Limiting (MANDATORY)

**Rule**: All endpoints have rate limits.

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Global rate limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## ♿ Accessibility Standards (WCAG 2.1 AA)

### 1. Semantic HTML (MANDATORY)

**Rule**: Use correct HTML elements for their intended purpose.

```html
<!-- ❌ BAD: Non-semantic -->
<div class="button" onclick="submit()">Submit</div>

<!-- ✅ GOOD: Semantic -->
<button type="submit" class="button">Submit</button>

<!-- ✅ GOOD: Complete semantic structure -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/home">Home</a></li>
      <li><a href="/dashboard">Dashboard</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Article Title</h1>
    <section>
      <h2>Section Heading</h2>
      <p>Content</p>
    </section>
  </article>
</main>
```

### 2. ARIA Labels (MANDATORY)

**Rule**: All interactive elements have accessible names.

```html
<!-- Icon buttons need labels -->
<button aria-label="Send message">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Form inputs need labels -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" />

<!-- Live regions for dynamic content -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  Message sent successfully
</div>
```

### 3. Keyboard Navigation (MANDATORY)

**Rule**: All functionality is keyboard accessible.

```typescript
// Keyboard event handling
function handleKeyPress(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleClick();
  }
}
```

---

## 📖 Code Explainability Standards

### 1. Self-Documenting Code (PRIMARY)

**Rule**: Code should be understandable without comments.

```typescript
// ❌ BAD: Needs comment to understand
function calc(d: number[], r: number): number {
  return d.reduce((a, b) => a + b, 0) * r;
}

// ✅ GOOD: Self-documenting
function calculateTotalPrice(items: CartItem[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * taxRate;
  return subtotal + tax;
}
```

### 2. Meaningful Names (MANDATORY)

**Rule**: Names reveal intent.

```typescript
// ❌ BAD: Abbreviations
const usr = getUser();
const msg = usr.msgs[0];

// ✅ GOOD: Full words
const user = getUser();
const latestMessage = user.messages[0];
```

### 3. JSDoc for Public APIs (MANDATORY)

**Rule**: All public functions have JSDoc comments.

```typescript
/**
 * Normalizes a message from any channel into unified format.
 * 
 * @param channel - The channel the message came from
 * @param rawMessage - The raw message payload from Caspian SDK
 * @returns A normalized message ready for processing
 * @throws {ValidationError} If the message format is invalid
 */
export async function normalizeMessage(
  channel: Channel,
  rawMessage: unknown
): Promise<UnifiedMessage> {
  // Implementation
}
```

---

## 🛡️ Robustness Standards

### 1. Error Handling (MANDATORY)

**Rule**: All errors are caught and handled gracefully.

```typescript
// ✅ GOOD: Proper error handling
async function fetchUser(id: string): Promise<Result<User, AppError>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return err(new NotFoundError('User not found'));
      }
      return err(new APIError(`HTTP ${response.status}`));
    }
    
    const user = await response.json();
    return ok(user);
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    return err(new NetworkError('Failed to connect to API'));
  }
}
```

### 2. Circuit Breaker Pattern (MANDATORY)

**Rule**: External service calls have circuit breakers.

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callExternalAPI, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => ({ error: 'Service temporarily unavailable' }));
```

### 3. Retry with Exponential Backoff (MANDATORY)

**Rule**: Transient failures are retried with backoff.

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await sleep(delay);
    }
  }
}
```

---

## 📈 Scalability Standards

### 1. Horizontal Scaling Ready (MANDATORY)

**Rule**: Application is stateless and can scale horizontally.

```typescript
// ❌ BAD: In-memory state
const userSessions = new Map<string, Session>();

// ✅ GOOD: External state
await redis.set(`session:${session.id}`, JSON.stringify(session), 'EX', 3600);
```

### 2. Connection Pooling (MANDATORY)

**Rule**: Database connections are pooled.

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Caching Strategy (MANDATORY)

**Rule**: Frequently accessed data is cached.

```typescript
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
  
  return user;
}
```

### 4. Database Indexing (MANDATORY)

**Rule**: All frequently queried columns are indexed.

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status_created ON users(status, created_at);
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
```

---

## 🧪 Testing Standards

### 1. Test Coverage (MANDATORY ≥ 80%)

```typescript
// Unit test
describe('MessageNormalizer', () => {
  it('should convert WhatsApp message to unified format', () => {
    const result = normalizeWhatsAppMessage({
      messageId: '123',
      from: '+1234567890',
      text: 'Hello',
      timestamp: 1625097600,
    });
    
    expect(result).toEqual({
      id: '123',
      userId: '+1234567890',
      channel: 'whatsapp',
      content: 'Hello',
    });
  });
});
```

### 2. Integration Tests

```typescript
describe('API Integration', () => {
  it('should handle message flow end-to-end', async () => {
    const response = await request(app)
      .post('/api/messages')
      .send({ channel: 'whatsapp', content: 'Hello' })
      .expect(200);
    
    expect(response.body.status).toBe('queued');
  });
});
```

---

## 📊 Monitoring & Observability

### 1. Structured Logging

```typescript
logger.info('Message processed', {
  messageId: message.id,
  userId: message.userId,
  channel: message.channel,
  processingTime: Date.now() - startTime,
});
```

### 2. Health Checks

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});
```

---

## ✅ Quality Checklist for Every PR

Before merging any code:

- [ ] TypeScript strict mode passes
- [ ] All tests pass (≥ 80% coverage)
- [ ] ESLint passes with 0 warnings
- [ ] No security vulnerabilities
- [ ] Performance benchmarks within limits
- [ ] Accessibility audit passes
- [ ] Code review approved
- [ ] Documentation updated

---

**Enforcement**: All standards are mandatory. No exceptions without explicit approval.
