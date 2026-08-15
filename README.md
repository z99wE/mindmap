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

### 2. Commitment Witness (Accountability Mode)
A novel social-proofing system built directly into the pgvector memory graph to prevent self-sabotage.

### 3. Thought Archaeology (Regret Ledger Mode)
Weekly zero-judgment cognitive ledgers sent every Sunday at 8 PM.

### 4. Zero-Cost Intelligence (OmniRoute & SearXNG Mode)
Enterprise-grade operations running at a **$0 operational budget** using OmniRoute and public SearXNG instances.

### 5. Time-Blindness & Location Drift Compensation
Active location-aware assistance using geofencing.

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

## 🚀 Quick Deploy

### 1. Start Backend

```bash
cd phase2-working
npm install
npm run dev
# Or use: node server.js
# API runs on http://localhost:3333
```

### 2. Start Frontend (Sci-Fi UI)

```bash
cd phase2-working/src/frontend
npm install
npm run dev
# Frontend runs on http://localhost:3331
```

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

## 📡 Caspian SDK Integration (Communication Core)

Caspian is the backbone of the platform's multi-channel alert delivery. It functions as the secure outbound gateway to bridge local automated triggers with real-world notifications:
* **How It Is Used**:
  * **Thought Half-Life nudges**: Escalates alerts (e.g., from silent queue to direct WhatsApp notifications) when actionable thoughts approach their expiration threshold.
  * **Commitment Witness alerts**: Automatically checks active database deadlines, triggers notifications to designated witness contacts when commitment time limits expire, and prompts accountability updates.
  * **Geofence & Departure rules**: Integrates with local geo-monitoring (monitored by background check loops) to send real-time warnings to WhatsApp and email.

---

## 📄 License

MIT
