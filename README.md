# Thought GPS

**Multi-channel AI agent with Mission Control, Sci-Fi UI, and Real Web Scraping.**

---

## 🚀 Current Status

**Phase 8**: Mission Control + Real Web Scraping + Thought Classification - Brain Fragments ✅ COMPLETE

### What's Implemented

- ✅ **Thought Half-Life Classifier**: Automates message categorization, decay rate tracking, and 3-tiered WhatsApp nudges.
- ✅ **Commitment Witness**: Parses time-bound personal commitments and notifies witnesses upon failure to comply.
- ✅ **Thought Archaeology**: Weekly zero-judgment regret ledger reports summarizing unacted expired thoughts.
- ✅ **Free Web Scraping**: SearXNG/DuckDuckGo integration - NO API costs
- ✅ **Real Agent-Reach**: Live thought processing with web context
- ✅ **Mission Control**: Carbon Design UI for channel/API key management
- ✅ **OmniRoute**: 90+ free LLM providers with auto-fallback
- ✅ **Memory Graph**: PostgreSQL/pgvector (no Pinecone - saves $50/month)
- ✅ **JSON-LD Export**: Portable memory for ChatGPT/GPTs
- ✅ **Push Notifications**: Geofence-based alerts
- ✅ **Sci-Fi UI**: Iron Man/Jarvis style with parallax, glitch effects

### What's Working

| Feature | Status | Cost |
|---------|--------|------|
| Web Scraping | ✅ Free (SearXNG) | $0 |
| Agent-Reach | ✅ Real (no stub) | $0 |
| OmniRoute | ✅ Real (90+ providers) | $0 |
| Memory Graph | ✅ PostgreSQL/pgvector | $0 (free tier) |
| JSON-LD Export | ✅ Working | $0 |
| Sci-Fi UI | ✅ Carbon Design | $0 |
| Push Notifications | ✅ Geofence | $0 |

### What's NOT Yet Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| DuckDuckGo Search | ⏳ Stub | Need to add actual scraping |
| SearXNG Search | ⏳ Working | Uses free public instances |
| Mem0 Integration | ⏳ Not started | Could replace custom graph |
| Real Agent-Reach | ✅ Implemented | Uses free web scraping |

---

## 📁 Project Structure

```
phase2-working/
├── server.js                    # Main API server
├── llm-router.js                # 5-level LLM routing
├── paywall-system.js            # 3-tier monetization
├── memory-graph.js              # PostgreSQL/pgvector graph
├── omni-route-integration.js    # 90+ free LLM providers
├── web-scraper.js               # Real web scraping (free)
├── orchestrator.js              # DAG workflow engine
├── admin-dashboard.js           # Admin console
├── tts-engine.js                # Text-to-speech
├── agent-reach-integration.js   # Live thought processing
├── api-gateway/                 # Main API endpoints
└── src/frontend/                # Sci-Fi UI (Carbon Design)
    ├── index.html
    └── src/pages/*.js
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: JavaScript (no TypeScript overhead)
- **Database**: PostgreSQL + pgvector (FREE)
- **Memory**: Knowledge Graph (triple-based storage)
- **Channels**: Caspian SDK (WhatsApp, Telegram, Slack, etc.)
- **LLM**: OmniRoute (90+ free providers), OpenAI, Anthropic
- **Voice**: Assembly AI, Deepgram, Servum, Piper (all free)
- **Hosting**: Render (free PostgreSQL tier)
- **Frontend**: Vite + Vanilla JS (no React)

---

## 🚀 Getting Started

### 1. Start Backend

```bash
cd phase2-working
npm install
node server.js
# Server runs on http://localhost:3002
```

### 2. Start Frontend (Sci-Fi UI)

```bash
cd phase2-working/src/frontend
npm install
npm run dev
# Frontend runs on http://localhost:3001
```

---

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/process/message` | POST | Process message |
| `/api/memory/create` | POST | Create memory |
| `/api/memory/graph/:userId` | GET | Get knowledge graph |
| `/api/memory/search-graph` | POST | Search graph |
| `/api/memory/export/:userId` | GET | Export JSON-LD |
| `/agent-reach/thought` | POST | Add thought with web context |
| `/agent-reach/export` | GET | Export all thoughts |
| `/api/keys/add` | POST | Add API key |
| `/api/credits/purchase` | POST | Purchase credits |
| `/mission-control` | GET | Mission Control UI |

---

## 💰 Cost Breakdown

| Component | Cost |
|-----------|------|
| PostgreSQL (Render) | $0 (free tier) |
| Redis (Upstash) | $0 (free tier) |
| Web Scraping | $0 (SearXNG public) |
| Agent-Reach | $0 (self-hosted) |
| OmniRoute | $0 (90+ free providers) |
| **Total** | **$0/month** |

---

## 📊 Features

### Free Tier (10 runs/day)
- OmniRoute LLM routing (90+ free providers)
- No API keys needed
- Basic memory storage
- Standard response time

### Premium Tier (500 runs/day)
- Connect your own API keys
- 20x more runs
- Priority routing
- Advanced memory features

### Enterprise Tier
- Unlimited runs
- Custom infrastructure
- Dedicated support

---

## 🎯 Key Differences from Chatbots

| Feature | Chatbot | Thought GPS |
|---------|---------|-------------|
| Memory | No persistent memory | ✅ Knowledge Graph |
| Web Access | Requires API | ✅ Free web scraping |
| Export | No portability | ✅ JSON-LD export |
| Cost | $20-100/month | ✅ Free tier available |
| Customization | Limited | ✅ Full API control |

---

## 📚 Documentation

- [BUILD_PHASES_STATUS.md](BUILD_PHASES_STATUS.md) - Complete phase timeline
- [INTELLIGENT_LLM_ROUTER.md](INTELLIGENT_LLM_ROUTER.md) - Routing architecture
- [MEMORY_PERSISTENCE_ENGINE.md](MEMORY_PERSISTENCE_ENGINE.md) - Memory system

---

## 📡 Caspian SDK Integration (Communication Core)

Caspian is the backbone of the platform's multi-channel alert delivery. It functions as the secure outbound gateway to bridge local automated triggers with real-world notifications:
* **How It Is Used**:
  * **Thought Half-Life nudges**: Escalates alerts (e.g., from silent queue to direct WhatsApp notifications) when actionable thoughts approach their expiration threshold.
  * **Commitment Witness alerts**: Automatically checks active database deadlines, triggers notifications to designated witness contacts when commitment time limits expire, and prompts accountability updates.
  * **Geofence & Departure rules**: Integrates with local geo-monitoring (monitored by background check loops) to send real-time warnings to WhatsApp and email.
* **Why It Helps**:
  * **Zero Infrastructure Overhead**: Replaces heavy, paid third-party notification servers (like Twilio, SendGrid, or custom SMS relays) with a unified, lightweight SDK client.
  * **Multi-Channel Delivery**: Allows the backend to swap between WhatsApp, Telegram, and Email destinations without changing the underlying business logic.
  * **Secure Outbound Relays**: Isolates communication parameters to keep credentials encrypted server-side, preventing direct client exposure.

---

## 🚀 Quick Deploy

```bash
# Backend
cd phase2-working
npm install
node server.js

# Frontend
cd phase2-working/src/frontend
npm install
npm run dev

# Access UI: http://localhost:3001
# API: http://localhost:3002
```

---

## 📄 License

MIT

---

**Status**: ✅ Phase 8 Complete - Mission Control + Real Web Scraping + Thought Classification - Brain Fragments
