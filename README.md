# Thought GPS

**Multi-channel AI agent for thought orchestration and execution across WhatsApp, Telegram, Slack, Discord, Signal, and Email.**

## 🚀 Current Status

**Phase 0**: Infrastructure Setup (In Progress)

### What's Being Set Up

- ✅ Monorepo structure (Turbo)
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Jest testing framework
- ✅ Core packages initialized
- 🔄 Database schema
- 🔄 GitHub Actions CI/CD

## 📁 Project Structure

```
thought-gps/
├── packages/
│   ├── core/                    # Shared types & errors
│   ├── security/                # LLM protection & auth
│   ├── voice/                   # Voice processing
│   ├── memory/                  # 4-layer memory system
│   ├── router/                  # Intelligent LLM routing
│   ├── orchestrator/            # Deerflow workflows
│   └── api-gateway/             # Main API
├── services/
│   ├── db/                      # Database setup
│   └── monitoring/              # Prometheus, Sentry
├── .github/
│   └── workflows/               # CI/CD pipelines
├── tsconfig.json                # Root TypeScript config
├── turbo.json                   # Turbo build config
├── .eslintrc.js                 # Linting rules
├── .prettierrc.json             # Code formatting
├── package.json                 # Root package
└── README.md                    # This file
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Build System**: Turbo
- **Testing**: Jest
- **Linting**: ESLint + Prettier
- **Channels**: Caspian SDK
- **LLM**: Featherless.ai, Ollama, OpenAI, Anthropic
- **Database**: PostgreSQL, Redis
- **Memory**: 4-layer (Redis → PostgreSQL → Pinecone → IPFS/Arweave)
- **Hosting**: Render (free tier)

## 📋 Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- PostgreSQL (Render free tier)
- Redis (Render free tier)

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/z99wE/mindmap.git
cd mindmap
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Build All Packages

```bash
npm run build
```

### 5. Run Tests

```bash
npm run test
npm run test:coverage  # Generate coverage report
```

### 6. Start Development

```bash
npm run dev
```

## 📝 Available Commands

```bash
# Development
npm run dev              # Start all packages in dev mode
npm run build            # Build all packages
npm run dev:core         # Start only core package

# Testing
npm run test             # Run all tests
npm run test:coverage    # Generate coverage reports
npm run test -- --watch  # Watch mode

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
npm run security:audit   # Security audit

# Maintenance
npm run clean            # Remove build artifacts
```

## 📦 Packages

### @thought-gps/core
Shared types, errors, and utilities used across all packages.

- **Types**: User, Thought, UnifiedMessage, APIKey, Session, etc.
- **Errors**: AppError, ValidationError, NotFoundError, etc.
- **Logger**: Pino-based centralized logging

### @thought-gps/security (Phase 4)
LLM protection layers and authentication.

- Input sanitization & injection prevention
- System prompt management
- Tool validation
- Response filtering
- Security event logging

### @thought-gps/voice (Phase 2)
Voice processing pipeline.

- Speech-to-text (Whisper)
- Text-to-speech (Piper + pyttsx3)
- Audio caching
- Voice quality metrics

### @thought-gps/memory (Phase 2)
4-layer memory system.

- L1: Redis (immediate context)
- L2: PostgreSQL (all thoughts)
- L3: Pinecone (semantic search)
- L4: IPFS/Arweave (permanent backup)

### @thought-gps/router (Phase 3)
Intelligent LLM routing.

- Input type detection (voice/text/image)
- 5-level fallback chain
- Rate limit tracking
- Network congestion detection

### @thought-gps/orchestrator (Phase 3)
Workflow orchestration with Deerflow 2.0.

- DAG-based workflow execution
- Intent detection
- Multi-step task execution

### @thought-gps/api-gateway (Phase 1)
Main API server.

- REST endpoints
- WebSocket support
- Middleware (auth, error handling, logging)

## 🔐 Security

- All inputs validated (Zod schemas)
- TypeScript strict mode
- ESLint security plugin
- No hardcoded secrets
- Encrypted API key storage
- Immutable system prompts
- Comprehensive audit logging

## 📊 Testing

Minimum **80% code coverage** across all packages.

```bash
# Run all tests with coverage
npm run test:coverage

# Coverage thresholds:
# - Branches: 80%
# - Functions: 80%
# - Lines: 80%
# - Statements: 80%
```

## 🚀 Phases

| Phase | Duration | Status | Focus |
|-------|----------|--------|-------|
| 0 | Pre-Day 1 | 🔄 In Progress | Infrastructure |
| 1 | Days 1-3 | ⏳ Next | Caspian + Auth |
| 2 | Days 4-6 | ⏳ Later | Multimodal Input |
| 3 | Days 7-9 | ⏳ Later | Orchestration |
| 4 | Days 10-12 | ⏳ Later | Security |
| 5 | Days 13-15 | ⏳ Later | Deploy |

## 📚 Documentation

- [QUICK_START.md](../QUICK_START.md) - 5-minute setup
- [STARTUP_CHECKLIST.md](../STARTUP_CHECKLIST.md) - 15-day timeline
- [INTELLIGENT_LLM_ROUTER.md](../INTELLIGENT_LLM_ROUTER.md) - Routing architecture
- [GITHUB_DEPLOYMENT_GUIDE.md](../GITHUB_DEPLOYMENT_GUIDE.md) - Phase deployment

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/xyz`
2. Make changes and commit: `git commit -m "feat: description"`
3. Run tests: `npm run test`
4. Check coverage: `npm run test:coverage`
5. Lint: `npm run lint`
6. Submit PR

## 📄 License

MIT

## 👤 Author

[Your Name]

---

**Next Phase**: Phase 1 - Caspian SDK Integration (Days 1-3)

