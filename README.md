<p align="center">
  <img src="https://img.shields.io/badge/Status-Alpha-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tests-272_Passing-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-Node.js_PostgreSQL_React-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Deep_Tech-Behavioral_ML-7c3aed?style=for-the-badge" />
</p>

<h1 align="center">ReMentally</h1>
<h3 align="center">Cognitive Infrastructure — The Middleware Between Your Brain and Every App</h3>

<p align="center">
  <b>Traditional productivity tools assume neurotypical executive function.</b><br/>
  ReMentally doesn't. It captures, classifies, and delivers thoughts through<br/>
  9 messaging channels — powered by behavioral ML that learns YOUR patterns.
</p>

---

## The Problem

**73% of adults with ADHD report that written thoughts "disappear" once captured in a closed app.** (CHADD, 2024)

Traditional tools fail because they:
- Require you to **open another app** (barrier to entry)
- Treat all thoughts **equally** (no cognitive science)
- Have **no delivery** (thoughts go in, never come out)
- Are **static** (don't learn from your behavior)

**Market:** 400M+ adults with ADHD globally. $15B productivity tools market. Zero solutions designed FOR neurodivergent cognitive patterns.

---

## Architecture — This Is Not an AI Wrapper

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT LAYER (9 Channels)                      │
│  Telegram · Slack · Discord · WhatsApp · Email · Signal ·       │
│  SMS · Twitter/X · Web Push · Web UI                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              BEHAVIORAL ML ENGINE (Proprietary)                  │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Behavioral    │  │  Adaptive      │  │  Cross-User      │  │
│  │  Learner       │  │  Prioritizer   │  │  Insights        │  │
│  │                │  │                │  │                  │  │
│  │  Tracks:       │  │  Scores:       │  │  Aggregates:     │  │
│  │  - Completion  │  │  - Urgency     │  │  - Anonymous     │  │
│  │    patterns    │  │  - Deadline    │  │    behavioral    │  │
│  │  - Peak hours  │  │  - Probability │  │    patterns      │  │
│  │  - Category    │  │  - Energy      │  │  - Witness       │  │
│  │    reliability │  │    match       │  │    effectiveness │  │
│  │  - Stress      │  │  - Momentum    │  │  - Completion    │  │
│  │    threshold   │  │    boost       │  │    benchmarks    │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Thought       │  │  Proactive     │  │  Predictive      │  │
│  │  Similarity    │  │  Insights      │  │  Load            │  │
│  │                │  │                │  │                  │  │
│  │  "You had a    │  │  "3 thoughts   │  │  "Overload       │  │
│  │  similar       │  │  expiring      │  │  predicted for   │  │
│  │  thought on    │  │  today"        │  │  Thursday"       │  │
│  │  March 15"     │  │                │  │                  │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              COGNITIVE SCIENCE MODELS                            │
│                                                                  │
│  Half-Life Decay · Commitment Witness · Drift Detector ·        │
│  Door Rule · Thought Interceptor · Attention Debt Score ·       │
│  Narrative Memory · Commitment Probability                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              VECTOR MEMORY GRAPH (PostgreSQL + pgvector)         │
│                                                                  │
│  Entity extraction · Relationship mapping · Temporal decay ·    │
│  Knowledge graph · Thought clustering · Semantic search          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              LLM KEY ROUTER (15 Providers)                       │
│                                                                  │
│  User BYO keys → Round-robin → 60s cooldown → Shared pool →    │
│  Local models (Ollama/LM Studio)                                │
│  Providers: Groq · OpenAI · Anthropic · Gemini · Mistral ·     │
│  Cohere · NVIDIA · OpenRouter · Fireworks · Featherless · ...   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              PULSEKIT — Multi-Tenant Channel Router              │
│                                                                  │
│  User bot → Global bot → Fallback channels → DB store           │
│  Failover mode · Broadcast mode · Inbound message processing   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Makes This Deep Tech (Not Just an AI Wrapper)

### 1. Behavioral Learning Engine
**Learns from actual user behavior, not just keyword matching.**

| What It Tracks | How It Learns |
|----------------|---------------|
| Completion patterns | Which thoughts get done vs abandoned |
| Peak productivity hours | When completions actually happen (not just creation time) |
| Category reliability | Which types the user follows through on |
| Stress threshold | Daily thought volume that triggers overwhelm |
| Time-to-completion | Median hours by category |

**Prediction:** "Based on your patterns, you'll complete this thought 73% of the time if you tackle it at 10:00 AM."

### 2. Adaptive Cognitive Load Balancer
**Matches thought difficulty to your current energy level.**

| Energy Level | Time Window | Suggested Actions |
|-------------|-------------|-------------------|
| High | 9AM-12PM, 3PM-5PM | Critical tasks, complex commitments |
| Medium | 1PM-2PM, 6PM-10PM | Administrative tasks, organization |
| Low | 11PM-8AM | Quick wins, low-stakes items |

**Not just urgency sorting** — considers completion probability, deadline proximity, category reliability, and momentum.

### 3. Cross-User Pattern Intelligence
**Anonymized aggregate insights from all users.**

- "Users who set witness contacts complete commitments 72% more often"
- "Peak productivity hour across users: 10 AM"
- "Your completion rate for 'work' thoughts is below average — try setting deadlines"

**Privacy:** Only aggregates statistics. No raw thought content is ever shared.

### 4. Thought Similarity Network
**Detects when a new thought is one you've had before.**

Using pgvector cosine distance on existing embeddings:
- "You've thought about the Acme proposal 3 times since March"
- "This is similar to a thought you completed on April 15"
- Recurring pattern detection: which topics keep coming up

### 5. Proactive Insight Delivery
**Don't wait for the user to ask. Push insights when patterns emerge.**

Background agent (every 6 hours) generates:
- Recurring pattern alerts
- Expiring item warnings
- Completion streak celebrations
- Slump detection + recovery suggestions

---

## Cognitive Science Models

| Model | What It Does | Why It Matters |
|-------|-------------|----------------|
| **Half-Life Decay** | Every thought has a lifespan based on urgency. Critical thoughts escalate. Vague thoughts fade. | Prevents thought hoarding — only actionable items stay visible |
| **Commitment Witness** | "I promise to X by Y" → witness contact gets notified on deadline | Social accountability increases follow-through by 72% |
| **Drift Detector** | Notices when focus shifts across categories | Prevents task-switching spirals common in ADHD |
| **Thought Interceptor** | Detects unanchored intentions ("I should...") | Surfaces hidden commitments for clarification |
| **Attention Debt Score** | 0-100 gamified score based on overdue items, drift events, completion rate | Quantifies cognitive load for self-awareness |
| **Narrative Memory** | AI weaves your week into a natural language story | Provides continuity and pattern recognition |
| **Commitment Probability** | Per-day fulfillment rates: "You complete commitments least often on Friday" | Data-driven scheduling advice |

---

## Channel Delivery — 9 Platforms

| Platform | Outbound | Inbound | Status |
|----------|----------|---------|--------|
| Telegram | ✅ Send | ✅ Polling | Production-ready |
| Slack | ✅ Send | ✅ Webhook | Production-ready |
| Discord | ✅ Send | ✅ WebSocket | Production-ready |
| WhatsApp | ✅ Send | ✅ Webhook | Production-ready |
| Email (SMTP) | ✅ Send | ✅ IMAP | Production-ready |
| Signal | ✅ Send | ✅ Webhook | Production-ready |
| SMS (Twilio) | ✅ Send | ✅ Webhook | Production-ready |
| Twitter/X | ✅ Post | ✅ Webhook | Production-ready |
| Web Push | ✅ Push | N/A | Production-ready |

**Failover:** Try Telegram → Slack → Email → DB  
**Broadcast:** Send to all simultaneously  
**Multi-tenant:** Each user brings their own bot credentials

---

## Memory & Storage

- **Vector Memory Graph:** PostgreSQL + pgvector with multi-provider embedding failover
- **Knowledge Graph:** Auto-extracted entities (people, orgs, projects) + relationships
- **Thought Clustering:** Auto-groups related thoughts using cosine similarity
- **Collaborative Sharing:** Share individual memories with other users by email
- **Local IndexedDB Backup:** Browser-side backup with export/import
- **Voice Capture:** Speech-to-text via Web Speech API (free, browser-native)
- **GDPR/DPDP Compliance:** Consent logging, breach tracking, data deletion

---

## VC Metrics

The system tracks metrics that prove product-market fit:

| Metric | What It Proves |
|--------|---------------|
| **Completion rate** | Users actually complete thoughts (not just capture) |
| **Witness effectiveness** | Social accountability works (72% improvement) |
| **D30/D60/D90 retention** | Users come back (engagement, not just novelty) |
| **Thoughts per day** | Usage frequency (engagement depth) |
| **Peak hour accuracy** | Behavioral ML actually predicts productivity |
| **Stress threshold** | System detects overload before user does |

---

## Quick Start

```bash
# Clone
git clone https://github.com/z99wE/rementally.git
cd rementally/phase2-working

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and at least one API key

# Start the server
node server.js

# Open http://localhost:3001
# First-run creates a local admin account automatically
```

### Docker

```bash
docker-compose up --build
```

---

## Testing

```bash
cd phase2-working
npx jest --config jest.config.js --forceExit
# 272 tests · 18 suites · < 2 seconds
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Node.js + Express | Fast, async, huge ecosystem |
| **Database** | PostgreSQL + pgvector | Vector search + relational in one |
| **Frontend** | React (Vite) + Material Design 3 | Modern, accessible, fast builds |
| **Embeddings** | Groq (free) → NVIDIA NIM → HuggingFace → OpenAI | Multi-provider failover, $0 |
| **LLM** | 15 providers with key rotation | Resilient, cost-optimized |
| **Channels** | Custom PulseKit (zero SDK deps) | Full control, no vendor lock-in |
| **Auth** | JWT + bcrypt + disposable email blocking | Production-grade security |
| **PWA** | Service worker + background sync | Offline-first, installable |

---

## License

MIT License — see [LICENSE](phase2-working/LICENSE) for details.
