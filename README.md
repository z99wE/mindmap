# Thought GPS (Cognitive Coprocessor)
**A Multi-Channel Autonomous Memory Graph & Behavioral Coprocessor for ADHD & Neuro-Diverse Minds.**

---

## 💡 The Problem Statement (Why We Exist)
Traditional productivity platforms (Todoist, Notion, calendars) assume a **neurotypical baseline** of executive function. For individuals with ADHD, Autism, or severe cognitive fatigue, these platforms fail due to:
1. **The ADHD Tax & Out-of-Sight, Out-of-Mind**: Once a thought is written down in a closed app, it disappears from short-term working memory, leading to immediate task abandonment.
2. **Cognitive Stagnation & Time Blindness**: Estimating travel times, transition overheads, or recognizing when one is stuck in a dopamine loop (stagnant in a single location) is a severe bottleneck.
3. **Accountability Erosion**: Personal commitments fail when there is no social enforcement mechanism or "witness" to check in when a deadline passes.

**Thought GPS is a Cognitive Coprocessor.** It operates as an invisible, zero-friction layer that captures, classifies, updates, and escalates thoughts across real-world messaging channels (WhatsApp, Signal, Telegram) using vector memory, OSRM routing, and autonomous agent loops.

---

## 🦄 Novel Features & Innovation Modes

### 1. The Thought Half-Life Engine (Decay Mode)
Unlike flat checklists that accumulate dust, thoughts in Thought GPS have an active **Half-Life Decay Rate** based on their category (Health, Finance, Work).
* **The Innovation**: Thoughts are parsed and classified by an autonomous LLM router. If a thought is classified as *Actionable*, it is assigned an expiration threshold (e.g., 24 hours for chores). 
* **The Mode**: Uses a 3-tiered notification escalation system via **Caspian SDK**. It shifts from silent inbox indexing to direct WhatsApp reminders, and finally to active channel nudges as the thought reaches its decay horizon.

### 2. Commitment Witness (Accountability Mode)
A novel social-proofing system built directly into the pgvector memory graph to prevent self-sabotage.
* **The Innovation**: Parses commitments containing explicit time-bounds (e.g., "I will finish this deck by 5 PM"). The user defines a "Witness Contact" (WhatsApp/Email).
* **The Mode**: If the deadline passes without the user marking the memory as `completed`, the system automatically alerts the designated accountability contact via Caspian, removing the internal cognitive friction of reporting failure.

### 3. Thought Archaeology (Regret Ledger Mode)
Weekly zero-judgment cognitive ledgers sent every Sunday at 8 PM.
* **The Innovation**: Instead of permanently deleting uncompleted or expired thoughts, the database logs them into an archive.
* **The Mode**: Generates a weekly "Regret Ledger" report that compiles forgotten intentions, groups them by cognitive areas, and helps the user re-evaluate which thoughts should be resurrected or permanently discarded, reducing guilt and cognitive clutter.

### 4. Zero-Cost Intelligence (OmniRoute & SearXNG Mode)
Enterprise-grade operations running at a **$0 operational budget**.
* **The Innovation**: Uses a 5-level routing fallback chain (**OmniRoute**) that maps queries across 90+ free LLM providers.
* **The Mode**: Incorporates an anonymous, rate-limit-resilient local web scraping search engine powered by public **SearXNG** instances, retrieving live web context for thoughts without expensive API scraper keys.

### 5. Time-Blindness & Location Drift Compensation
Active location-aware assistance using geofencing.
* **The Innovation**: Monitors user geolocations, mapping home-exit triggers (Door Rule) and destination coordinates (Time Blindness).
* **The Mode**: Automatically calls routing engines (OSRM) to calculate traffic transition times and dynamically pushes departure alerts to WhatsApp *before* the user is late. Tracks location stagnation to prevent hyper-fixation drift.

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

## 💰 Cognitive Tiers & Navigation Boosters

### Free Tier (10 runs/day)
- **Runs limit**: 10 daily runs
- **Channels**: Restricted to **Telegram** and **Email** only (Maximum 2 connected channels)
- **Data storage**: 15-day server storage purge (automatic database pruning)
- **Features**: Basic chat & local memory search (Advanced cognitive tabs are locked)

### Explorer Plus Tier ($15/month)
- **Runs limit**: 500 daily runs
- **Channels**: All integration channels enabled (WhatsApp, Slack, Discord, Twitter, Bluesky, Telegram, Email)
- **Data storage**: Infinite server storage (never purged)
- **Features**: Advanced cognitive features unlocked (Mind Map, Commitments, Afterlife, Cognitive Load, Archaeology, Brain Fragments, Memory Segments)
- **Synchronization**: Seamless cross-device synchronization (laptop & phone)
- **Keys**: Fallback system keys pool (no keys needed)

### Cognitive Navigation Boosters (Thoughtfulness Top-ups)
- Expiring in **15 days** from purchase
- Limited to **maximum 3 booster activations in a 30-day window**
- Available only to Explorer Plus users who have consumed at least 50% of daily runs
  1. **Compass Booster**: 50 runs - **$2.00**
  2. **Radar Booster**: 100 runs - **$4.00**
  3. **Sextant Booster**: 200 runs - **$7.00**

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

# Access UI: http://localhost:3331
# API: http://localhost:3333
```

---

## 📄 License

MIT

---

**Status**: ✅ Phase 8 Complete - Mission Control + Real Web Scraping + Thought Classification - Brain Fragments
