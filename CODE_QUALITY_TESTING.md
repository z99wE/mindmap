# Thought GPS: Enterprise Code Quality & Testing Strategy

## 🏗️ Architecture for Production Excellence

### Principles

1. **Type Safety**: TypeScript strict mode everywhere
2. **Immutability**: Const-first, avoid mutations
3. **Error Handling**: Explicit error types, no silent failures
4. **Testing**: >80% coverage, unit + integration + E2E
5. **Security**: Defense in depth, encrypt by default
6. **Performance**: Lazy loading, caching, async/await
7. **Monitoring**: Metrics on everything
8. **Documentation**: Code is self-documenting

---

## TypeScript Configuration (Strict Mode)

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",

    // Strictness
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Extra safety
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Error Handling

```typescript
// packages/common/errors.ts

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', 404, `${resource} not found: ${id}`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMIT', 429, `Rate limit exceeded. Retry after ${retryAfter}s`, {
      retry_after: retryAfter,
    });
  }
}

export class InternalError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      'INTERNAL_ERROR',
      500,
      message,
      originalError ? { original_error: originalError.message } : undefined
    );
  }
}

// Middleware for error handling
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Unexpected error
  console.error('Unexpected error:', err);
  
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```

---

## Validation & Input Sanitization

```typescript
// packages/common/validators.ts

import { z } from 'zod';

export const ThoughtSchema = z.object({
  content: z.string()
    .min(1, 'Thought cannot be empty')
    .max(5000, 'Thought too long'),
  channel: z.enum(['whatsapp', 'telegram', 'slack', 'discord', 'signal', 'email']),
  attachments: z.array(z.object({
    type: z.enum(['image', 'voice', 'document']),
    url: z.string().url(),
    size: z.number().max(50 * 1024 * 1024), // 50MB max
  })).optional(),
});

export const APIKeySchema = z.object({
  service: z.string().min(1).max(100),
  api_key: z.string().min(10).max(1000),
  encrypted: z.boolean().optional(),
});

export const UserPreferencesSchema = z.object({
  timezone: z.string(),
  awake_hours_start: z.number().min(0).max(23),
  awake_hours_end: z.number().min(0).max(23),
  language: z.string().default('en'),
  voice_mode_enabled: z.boolean().default(false),
});

// Factory for creating validated objects
export class ValidatedRequest<T> {
  constructor(
    public readonly data: T,
    public readonly schema: z.ZodSchema
  ) {}

  static async create<U>(
    data: unknown,
    schema: z.ZodSchema<U>
  ): Promise<ValidatedRequest<U>> {
    const validated = await schema.parseAsync(data);
    return new ValidatedRequest(validated, schema);
  }
}
```

---

## Testing Strategy

### Test Pyramid
```
        ╱╲         E2E Tests (5%)
       ╱  ╲        (Full user workflows)
      ╱────╲
     ╱      ╲      Integration Tests (25%)
    ╱  ______╲     (API + Database + Services)
   ╱___________╲
  ╱             ╲   Unit Tests (70%)
 ╱_______________╲  (Individual functions)
```

### Unit Tests

```typescript
// packages/caspian-handler/__tests__/handler.test.ts

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CaspianHandler } from '../src/handler';
import { mockChannels } from './mocks';

describe('CaspianHandler', () => {
  let handler: CaspianHandler;

  beforeEach(async () => {
    handler = new CaspianHandler(mockChannels);
    await handler.initialize();
  });

  afterEach(async () => {
    await handler.shutdown();
  });

  describe('normalize message', () => {
    it('should convert Telegram message to unified format', () => {
      const telegramMsg = {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: 123 },
          text: 'Hello',
          date: Math.floor(Date.now() / 1000),
        },
      };

      const unified = handler.normalizeMessage('telegram', telegramMsg);

      expect(unified).toMatchObject({
        channel: 'telegram',
        content: 'Hello',
        user_id: '123',
      });
    });

    it('should handle voice messages', () => {
      const voiceMsg = {
        channel: 'telegram',
        type: 'voice',
        file_id: 'xyz',
      };

      const unified = handler.normalizeMessage('telegram', voiceMsg);

      expect(unified.attachments).toContainEqual({
        type: 'voice',
        data: expect.any(Buffer),
      });
    });

    it('should throw on invalid message', () => {
      expect(() => {
        handler.normalizeMessage('telegram', null);
      }).toThrow(ValidationError);
    });
  });

  describe('route message', () => {
    it('should route to orchestrator', async () => {
      const message = { /* valid unified message */ };
      const spy = jest.spyOn(global, 'fetch');

      await handler.routeMessage(message);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/api/orchestrator'),
        expect.any(Object)
      );
    });

    it('should retry on transient failure', async () => {
      jest.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      const message = { /* valid message */ };
      const result = await handler.routeMessage(message);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Integration Tests

```typescript
// packages/orchestrator/__tests__/orchestrator.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testDatabaseSetup, testRedisSetup } from './test-setup';
import { Orchestrator } from '../src/orchestrator';

describe('Orchestrator Integration', () => {
  let db: Database;
  let redis: RedisClient;
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    db = await testDatabaseSetup();
    redis = await testRedisSetup();
    orchestrator = new Orchestrator(db, redis);
  });

  afterAll(async () => {
    await db.close();
    await redis.disconnect();
  });

  it('should execute research workflow end-to-end', async () => {
    const thought = {
      id: 'test-123',
      user_id: 'user-456',
      content: 'Find papers on AI ethics',
      channel: 'telegram',
    };

    const result = await orchestrator.execute(thought);

    expect(result.status).toBe('success');
    expect(result.workflow_id).toBe('research-and-share');
    expect(result.steps).toHaveLength(5);
    
    // Verify database was updated
    const dbThought = await db.query(
      'SELECT * FROM thoughts WHERE id = $1',
      [thought.id]
    );
    expect(dbThought.status).toBe('completed');
  });

  it('should handle workflow errors gracefully', async () => {
    const thought = {
      id: 'test-error',
      user_id: 'user-456',
      content: 'Book flight to invalid-city',
      channel: 'telegram',
    };

    const result = await orchestrator.execute(thought);

    expect(result.status).toBe('partial');
    expect(result.error).toBeDefined();
    
    // Should still notify user
    const notifications = await db.query(
      'SELECT * FROM notifications WHERE thought_id = $1',
      ['test-error']
    );
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/user-workflow.e2e.test.ts

import { describe, it, expect, beforeAll } from '@jest/globals';
import { startServer, createTestUser } from './test-helpers';

describe('User Workflow E2E', () => {
  let baseUrl: string;
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    const server = await startServer();
    baseUrl = server.baseUrl;
    
    const user = await createTestUser();
    userId = user.id;
    authToken = user.token;
  });

  it('should complete voice-to-reminder workflow', async () => {
    // 1. Send voice message
    const voiceFile = fs.readFileSync('./test-fixtures/voice-note.wav');
    
    const uploadRes = await fetch(`${baseUrl}/api/thoughts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: voiceFile,
    });

    const thought = await uploadRes.json();
    expect(uploadRes.status).toBe(201);

    // 2. Verify transcription
    const fetchRes = await fetch(`${baseUrl}/api/thoughts/${thought.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const data = await fetchRes.json();
    expect(data.transcribed_text).toContain('remind me');

    // 3. Verify reminder created
    const remindersRes = await fetch(`${baseUrl}/api/reminders`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const reminders = await remindersRes.json();
    expect(reminders.data).toHaveLength(1);
    expect(reminders.data[0]).toMatchObject({
      thought_id: thought.id,
      scheduled_for: expect.any(String),
    });
  });
});
```

---

## Code Quality Tools

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'security', 'import'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/explicit-function-return-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'import/no-circular-dependencies': 'error',
    'no-console': 'warn',
  },
  env: {
    node: true,
    es2020: true,
  },
};
```

### Pre-commit Hooks

```bash
# .husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint --staged
npm run type-check
npm run test -- --bail --passWithNoTests
```

---

## Performance Monitoring

```typescript
// packages/monitoring/performance-monitor.ts

export class PerformanceMonitor {
  async measureEndpoint(
    fn: () => Promise<any>,
    context: string
  ): Promise<any> {
    const startTime = process.hrtime.bigint();

    try {
      const result = await fn();
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms

      metrics.histogram(`endpoint.duration_ms`, duration, {
        context,
        status: 'success',
      });

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;

      metrics.histogram(`endpoint.duration_ms`, duration, {
        context,
        status: 'error',
      });

      throw error;
    }
  }

  async measureDatabase(query: string, fn: () => Promise<any>) {
    const startTime = process.hrtime.bigint();

    try {
      const result = await fn();

      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      metrics.histogram(`db.query_duration_ms`, duration, { query });

      return result;
    } catch (error) {
      metrics.increment(`db.query_errors`, { query });
      throw error;
    }
  }
}
```

---

## Security Scanning

```bash
# Dependency vulnerability scanning
npm audit --audit-level=moderate

# SAST (Static Application Security Testing)
npx snyk scan

# Type checking
npx tsc --noEmit

# Linting
npx eslint src/**/*.ts
```

---

## Logging Strategy

```typescript
// packages/logging/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'thought-gps',
    version: process.env.APP_VERSION,
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Usage
logger.info({ userId: '123', action: 'thought_created' }, 'Thought created');
logger.error({ error: err }, 'Failed to process thought');
logger.debug({ sql }, 'Executing query');
```

---

## ✅ Code Quality Checklist

- [ ] TypeScript strict mode enabled
- [ ] ESLint with 0 warnings
- [ ] >80% code coverage
- [ ] All functions have return types
- [ ] No `any` types
- [ ] Comprehensive error handling
- [ ] Input validation on all endpoints
- [ ] Security headers on all responses
- [ ] No hardcoded secrets
- [ ] Logging on all major events
- [ ] Performance metrics tracked
- [ ] Database queries optimized (no N+1)
- [ ] Caching strategy implemented
- [ ] Graceful degradation tested
- [ ] Dependency vulnerabilities scanned

