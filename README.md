<p align="center">
  <img src="https://img.shields.io/badge/Status-Development-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tests-272_Passing-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-Node.js_PostgreSQL_React-22c55e?style=for-the-badge" />
</p>

<h1 align="center">ReMentally</h1>
<h3 align="center">Cognitive Coprocessor — Multi-Agent Memory Graph<br/>with 9-Channel Autonomous Delivery</h3>

<p align="center">
  <b>Middleware between your brain and every app you use.</b><br/>
  Captures thoughts from web, Telegram, Slack, email, or any messaging platform.<br/>
  Routes through a multi-agent AI pipeline. Stores in a vector memory graph with automatic decay.<br/>
  Delivers insights to any device through 9 messaging channels.
</p>

---

## Table of Contents

- [Problem](#problem)
- [Architecture](#architecture)
- [Features](#features)
- [Channel Delivery](#channel-delivery)
- [AI & Agents](#ai--agents)
- [Cognitive Models](#cognitive-models)
- [Pricing](#pricing)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Compliance](#compliance)

---

## Problem

Traditional productivity tools assume a neurotypical baseline of executive function. They rely on the user to manually organize, remember to check the app, and maintain intrinsic motivation.

For individuals with ADHD, autism, or cognitive fatigue, once a thought is written down in a closed ecosystem, it disappears from working memory — leading to task abandonment and overwhelm.

**ReMentally works differently.** It operates as an invisible layer that captures, classifies, and escalates thoughts across the messaging platforms you already use — without requiring you to open another app.

---

## Architecture

```
User Input (Web UI / Telegram / Slack / Email / WhatsApp / SMS / Twitter / Signal / Web Push)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   AGENT ORCHESTRATOR                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Research │  │  Memory  │  │  Nudge   │  │  Calendar  │ │
│  │  Agent   │  │  Agent   │  │  Agent   │  │   Agent    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       │              │             │               │        │
└───────┼──────────────┼─────────────┼───────────────┼────────┘
        │              │             │               │
        ▼              ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM KEY ROUTER                            │
│  User's keys → Round-robin → Cooldown → Shared pool → Local │
│  15 providers: Groq, OpenAI, Anthropic, Gemini, Mistral,     │
│  Cohere, NVIDIA, OpenRouter, Fireworks, Featherless, ...     │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                  MEMORY GRAPH (PostgreSQL)                   │
│  Vector embeddings (pgvector)  ·  Half-life decay           │
│  Commitments  ·  Drift detection  ·  Door rule              │
│  Cognitive load classification  ·  Witness escalation       │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  PULSEKIT — Multi-Tenant Channel Router                     │
│  User's bot → Global bot → Fallback channels → DB store     │
│  9 platforms: Telegram, Slack, Discord, WhatsApp, Signal,    │
│  Email, SMS, Twitter/X, Web Push                           │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
   User's Phone / Desktop / Browser
```

### Key Design Decisions

| Layer | Decision | Rationale |
|-------|----------|-----------|
| **Channels** | Bring Your Own Credentials | Zero notification cost. Users own their bot tokens. |
| **LLM** | Bring Your Own Keys (per-user, never shared) | Each user's API keys are encrypted and isolated. Zero cost for you. |
| **Memory** | PostgreSQL + pgvector | No additional infrastructure. One database for everything. |
| **Agents** | Collaborative, persistent memory | Each agent remembers past findings. No stateless chatbot. |
| **Delivery** | User bot → Global bot → Fallback → DB | Three layers of reliability before falling back to in-app. |

---

## Features

### Channel Delivery — 9 Platforms

| Platform | Outbound | Inbound | Credentials Required |
|----------|----------|---------|---------------------|
| Telegram | ✅ Send messages | ✅ Long-polling | Bot token + chat ID |
| Slack | ✅ Send messages | ✅ Webhook | Bot token + channel ID |
| Discord | ✅ Send messages | ✅ WebSocket | Bot token |
| WhatsApp | ✅ Send messages | ✅ Webhook | Meta Business Account |
| Email (SMTP) | ✅ Send messages | ✅ IMAP polling | SMTP credentials |
| Signal | ✅ Send messages | ✅ Webhook | Signal REST gateway |
| SMS (Twilio/Vonage) | ✅ Send messages | ✅ Webhook | API key + phone number |
| Twitter/X | ✅ Post tweets | ✅ Webhook | API key + access tokens |
| Web Push | ✅ Browser push | N/A | VAPID keys |

All channels support **failover mode** (try Telegram → Slack → Email → DB) and **broadcast mode** (send to all simultaneously).

### AI & Agents

| Feature | What it does |
|---------|-------------|
| **Multi-Agent Orchestrator** | 4 agents (Research, Memory, Nudge, Calendar) with persistent memory. Run on 30-min background cycle. |
| **LLM Key Router** | Routes across 15 providers. Round-robin rotation. 60s cooldown on failure. Falls back through providers → shared pool → local models. |
| **Agent Fine-Tuning** | Per-user response style (concise/detailed/casual/formal), bullet points, quiet hours, nudge frequency, custom instructions. |
| **PicoClaw Agent** | Background processor for pending thoughts. Consolidates, resolves, escalates. |

### Cognitive Models

| Model | What it does |
|-------|-------------|
| **Half-Life Decay** | Every thought has a lifespan based on urgency. Critical thoughts escalate. Vague thoughts fade. |
| **Commitment Witness** | Miss a deadline? Your designated witness contact gets notified. Escalation chain: nudge → alert → witness. |
| **Drift Detector** | Notices when your focus shifts across categories. Sends a soft course-correction nudge. |
| **Door Rule** | Leaving home? Get a departure brief: 3 most urgent pending items + weather. Requires Tile38 geofencing server. |
| **Thought Interceptor** | Detects unanchored intentions ("I should..."). Schedules automated revivals. |
| **Cognitive Load Forecast** | Predicts overload 7 days ahead. Score based on commitment density, half-life states, fulfillment rate. |
| **Attention Debt Score** | 0-100 gamified score. Factors: expired thoughts, overdue commitments, drift events, completion rate. |
| **Narrative Memory** | AI weaves your week into a natural language story. Categories, trends, peak times, fulfillment rates. |
| **Commitment Probability** | Per-day fulfillment rates. "You complete commitments least often on Friday. Today's probability: 72%." |

### Memory & Storage

- **Vector Memory Graph**: PostgreSQL + pgvector for semantic search
- **Collaborative Sharing**: Share individual memories with other users by email
- **Local IndexedDB Backup**: Browser-side backup. Export/import memories locally.
- **Voice Capture**: Speech-to-text via Web Speech API (Chrome, Edge, Safari). Ctrl+M to open voice modal. Free, browser-native, no server costs.
- **Text-to-Speech**: Agent responses can be read aloud via SpeechSynthesis. Works offline.
- **GDPR/DPDP Compliance**: Consent logging, breach tracking, grievance system, automated data deletion (30-day retention)

### PWA & Mobile

| Feature | Status |
|---------|--------|
| **Installable PWA** | ✅ Manifest + service worker with offline caching |
| **Mobile-friendly PWA** | ✅ Installable on iOS/Android via Add to Home Screen. Works offline. |


### Cross-User Analytics (Admin)

- "Users miss most deadlines on Tuesdays."
- "Peak thought time is 2 PM."
- "Commitment fulfillment rate by day of week."
- Anonymized — no user IDs stored in analytics events.

---

## Pricing

| Tier | Price | What you get |
|------|-------|-------------|
| **Free** | $0 | 10 runs/day, 2 channels, bring your own LLM key, full cognitive features |
| **Early Adopter** | Waitlist | Higher limits, shared LLM pool, all 9 channels — [join the waitlist](https://rementally.com) |

Early Adopter spots are limited. Drop your email on the Credits page to get notified when spots open.

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

### Docker (recommended for local dev)

```bash
git clone https://github.com/z99wE/rementally.git
cd rementally
docker compose up -d
# Open http://localhost:3001
```

---

## Testing

```bash
cd phase2-working

# Full suite (272 tests, 18 suites)
npm run test:all

# Unit tests only
npm run test:unit

# API tests only  
npm run test:api

# Coverage report
npm run coverage

# Property-based tests (edge case discovery)
npx jest tests/property-based.test

# Security negative tests (injection, XSS, auth bypass)
npx jest tests/security-negative.test

# Lint check
npm run lint

# Format check
npm run format:check

# Security audit
npm run audit

# Generate SBOM
npm run sbom
```

All tests use mocked HTTP and database layers. No external API keys or running services required.

---

## Compliance

| Regulation | Status | Implementation |
|-----------|--------|----------------|
| **GDPR (EU)** | Implemented | Consent logging on registration, breach detection and logging, automated data deletion cron (30-day retention), full data export and account deletion via UI. Grievance submission and tracking system (Art. 77). |
| **DPDP (India)** | Implemented | Consent logging (Sec. 6), grievance redressal system (Sec. 13), cross-border transfer disclosure (Sec. 16). |
| **Medical disclaimer** | In place | NOT a medical device. Does not diagnose or treat any cognitive condition. |

---

## License

MIT — build, modify, scale.
