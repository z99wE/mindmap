<div align="center">

# 🧠 UnZonko

**Cognitive Coprocessor — Multi-Agent Memory Graph with 10-Channel Autonomous Delivery**

[![Render](https://img.shields.io/badge/Render-Deployed-success?logo=render&style=for-the-badge)](https://render.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=for-the-badge)](docker-compose.yml)
[![Tests](https://img.shields.io/badge/Tests-192_Passing-brightgreen?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/License-MIT-F7DF1E.svg?style=for-the-badge)](LICENSE)

</div>

---

## The Pitch

**UnZonko is middleware between your brain and every app you use.** It captures thoughts from anywhere (web, mobile, Telegram, Slack, email), routes them through a multi-agent AI pipeline, stores them in a vector memory graph with automatic decay, and delivers insights to any device through 10 messaging channels.

Unlike todo lists that wait for you, UnZonko **actively escalates** what matters before it expires from your working memory.

---

## What Makes This Uncopyable

| Layer | What it does | Why it's a moat |
|-------|-------------|-----------------|
| **10-Channel PulseKit** | Telegram, Slack, Discord, WhatsApp, Signal, Email, SMS, Twitter, Bluesky, Web Push — all with inbound + outbound | Each user brings their own credentials. The routing intelligence (user bot → global bot → fallback → DB) took months to design. |
| **Multi-Agent Orchestrator** | 4 specialized agents collaborate: Research, Memory, Nudge, Calendar | Each agent has persistent memory. They remember past findings, respect your quiet hours, and escalate only when it matters. |
| **LLM Key Router** | Rotates through 15+ providers, cools down failed keys, falls back to shared pool | Users bring their own keys. If Groq fails, it tries OpenAI. If all fail, falls back to your pool. Then to local Ollama. |
| **Cognitive Half-Life Memory** | Every thought has a decay timer. Urgent ones escalate. Vague ones fade. | No other app treats thoughts as living things with lifespans. This is a first-principles redesign of personal memory. |
| **Collaborative Memory Graphs** | Share thoughts with other users via email. Couples, co-founders, accountability pairs. | Network effects: each new user makes every existing user's graph more valuable. A clone can't replicate the network. |
| **Cross-User Pattern Analytics** | "Users miss most deadlines on Tuesdays." "Peak thought time is 2 PM." | Anonymized insights no single-user app can offer. Requires data network effect. |

---

## Architecture

```
User Input (Web UI / Telegram / Slack / Email / Extension)
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│                 AGENT ORCHESTRATOR                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Research │  │  Memory  │  │  Nudge   │  │Calendar │ │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │             │              │      │
└───────┼──────────────┼─────────────┼──────────────┼──────┘
        │              │             │              │
        ▼              ▼             ▼              ▼
┌──────────────────────────────────────────────────────────┐
│                 LLM KEY ROUTER                            │
│  User BYO keys → Round-robin → Cooldown → Shared pool    │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│              MEMORY GRAPH (PostgreSQL + pgvector)         │
│  • Vector embeddings  • Half-life decay  • Commitments   │
│  • Drift detection    • Door rule        • Classifiers   │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│              PULSEKIT (10-Channel Messenger)              │
│  User bot → Global bot → Slack → Discord → Email → DB   │
└──────────────────────────────────────────────────────────┘
        │
        ▼
   User's Phone / Desktop / Browser
```

---

## Features

### Channel Delivery (10 Platforms)
| Platform | Outbound | Inbound | Status |
|----------|----------|---------|--------|
| Telegram | ✅ Send | ✅ Polling | Live |
| Slack | ✅ Send | ✅ Webhook | Live |
| Discord | ✅ Send | ✅ WebSocket | Live |
| WhatsApp | ✅ Send | ✅ Webhook | Live |
| Email (SMTP) | ✅ Send | ✅ IMAP | Live |
| Signal | ✅ Send | ✅ Webhook | Live |
| SMS (Twilio/Vonage) | ✅ Send | ✅ Webhook | Live |
| Twitter/X | ✅ Send | ✅ Webhook | Live |
| Bluesky | ✅ Send | ❌ Firehose | Live |
| Web Push | ✅ Send | ❌ N/A | Live |

### AI & Agents
- **Multi-Agent Orchestrator**: Research, Memory, Nudge, Calendar agents with persistent memory
- **LLM Key Router**: 15+ providers, round-robin rotation, 60s cooldown, shared pool fallback
- **Agent Fine-Tuning**: Per-user response style, bullet points, quiet hours, custom instructions
- **PicoClaw Autonomous Agent**: Background processing for pending thoughts

### Cognitive Models
- **Half-Life Decay**: Every thought has a lifespan. Urgent thoughts escalate. Vague ones fade.
- **Commitment Witness**: Miss a deadline? Your witness contact gets notified.
- **Drift Detector**: Notices when your focus shifts and sends a soft nudge.
- **Door Rule**: Location-aware departure brief with weather + pending items.
- **Thought Interceptor**: Detects unanchored intentions and schedules revivals.
- **Cognitive Load Classification**: Urgency tiers, brain areas, emotional tones.

### Memory & Storage
- **Vector Memory Graph**: PostgreSQL + pgvector for semantic search
- **Collaborative Sharing**: Share memories with other users via email
- **Local IndexedDB Backup**: Offline-capable with browser storage
- **GDPR/DPDP Compliance**: Full data export, deletion, portability

### Browser Extension
- Quick capture from any tab
- Unread activity badge
- Background polling
- 5-minute heartbeat check

---

## Infrastructure Costs

| Component | Free Tier | Paid Tier |
|-----------|-----------|-----------|
| **Hosting** | Render Free ($0/mo, 500h) | Render Starter ($7/mo) |
| **Database** | Render Free Postgres ($0/mo, 1GB) | Render Postgres ($7/mo, 8GB) |
| **LLM Processing** | User brings their own key ($0 for you) | Shared key pool (your API costs) |
| **Notifications** | PulseKit native APIs ($0) | PulseKit native APIs ($0) |
| **Browser Extension** | Chrome Web Store ($5 one-time) | — |
| **Total** | **$0–5/mo** | **$14–20/mo** |

### How Users Pay (Your Revenue)
- **Free**: 10 runs/day, 2 channels, must bring their own LLM key
- **Pro ($15/mo)**: 500 runs/day, shared key pool (no key needed), all 10 channels, unlimited storage, priority support
- **Enterprise (Custom)**: Team workspaces, managed LLM infra, SSO, SLA

---

## Quick Start

```bash
# Clone
git clone https://github.com/z99wE/mindmap.git
cd mindmap

# Docker (recommended)
docker compose up -d

# Or manual
cd phase2-working && npm install
cp .env.example .env  # Edit your DATABASE_URL
node server.js
```

Open `http://localhost:3001` — the app creates a local admin account on first run.

---

## Testing

```bash
cd phase2-working
npm run test:all    # 192 tests, 11 suites
npm run test:unit   # Unit tests (drivers, middleware, notifications)
npm run test:api    # API tests (channels, auth, memory, admin)
```

---

## Compliance

- **GDPR (EU)**: Full data access, rectification, erasure, portability. Breach notification within 72h.
- **DPDP (India)**: Data Fiduciary registration. Grievance redressal within 30 days. Consent-based processing.
- **Disclaimer**: NOT a medical device. Does not diagnose or treat ADHD or any cognitive condition.

---

## License

MIT — build, modify, scale.

