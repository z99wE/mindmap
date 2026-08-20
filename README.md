<p align="center">
  <img src="https://img.shields.io/badge/Status-Development-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tests-201_Passing-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-Node.js_PostgreSQL_React-22c55e?style=for-the-badge" />
</p>

<h1 align="center">🧠 UnZonko</h1>
<h3 align="center">Cognitive Coprocessor — Multi-Agent Memory Graph<br/>with 10-Channel Autonomous Delivery</h3>

<p align="center">
  <b>Middleware between your brain and every app you use.</b><br/>
  Captures thoughts from web, Telegram, Slack, email, or browser extension.<br/>
  Routes through a multi-agent AI pipeline. Stores in a vector memory graph with automatic decay.<br/>
  Delivers insights to any device through 10 messaging channels.
</p>

---

## Table of Contents

- [Problem](#problem)
- [Architecture](#architecture)
- [Features](#features)
- [Channel Delivery](#channel-delivery)
- [AI & Agents](#ai--agents)
- [Cognitive Models](#cognitive-models)
- [Infrastructure Costs](#infrastructure-costs)
- [Pricing](#pricing)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Compliance](#compliance)
- [What's Not Built Yet](#whats-not-built-yet)

---

## Problem

Traditional productivity tools assume a neurotypical baseline of executive function. They rely on the user to manually organize, remember to check the app, and maintain intrinsic motivation.

For individuals with ADHD, autism, or cognitive fatigue, once a thought is written down in a closed ecosystem, it disappears from working memory — leading to task abandonment and overwhelm.

**UnZonko works differently.** It operates as an invisible layer that captures, classifies, and escalates thoughts across the messaging platforms you already use — without requiring you to open another app.

---

## Architecture

```
User Input (Web UI / Telegram / Slack / Email / Browser Extension)
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
│  10 platforms: Telegram, Slack, Discord, WhatsApp, Signal,   │
│  Email, SMS, Twitter/X, Bluesky, Web Push                   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
   User's Phone / Desktop / Browser
```

### Key Design Decisions

| Layer | Decision | Rationale |
|-------|----------|-----------|
| **Channels** | Bring Your Own Credentials | Zero notification cost. Users own their bot tokens. |
| **LLM** | Bring Your Own Keys + shared fallback | Zero LLM cost for you. Users pay their own API bills. |
| **Memory** | PostgreSQL + pgvector | No additional infrastructure. One database for everything. |
| **Agents** | Collaborative, persistent memory | Each agent remembers past findings. No stateless chatbot. |
| **Delivery** | User bot → Global bot → Fallback → DB | Three layers of reliability before falling back to in-app. |

---

## Features

### Channel Delivery — 10 Platforms

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
| Bluesky | ✅ Post skeets | ❌ Not yet | App password |
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
| **Door Rule** | Leaving home? Get a departure brief: 3 most urgent pending items + weather. Location-aware. |
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
| **Capacitor iOS** | ✅ Configured. Run `npm run cap:build:ios` to build |
| **Capacitor Android** | ✅ Configured. Run `npm run cap:build:android` to build |
| **Published on App Store** | ❌ Not yet — requires Apple Developer account ($99/yr) |
| **Published on Play Store** | ❌ Not yet — requires Google Play account ($25 one-time) |

### Cross-User Analytics (Admin)

- "Users miss most deadlines on Tuesdays."
- "Peak thought time is 2 PM."
- "Commitment fulfillment rate by day of week."
- Anonymized — no user IDs stored in analytics events.

---

## Infrastructure Costs

| Component | Strategy | Monthly Cost |
|-----------|----------|--------------|
| **Hosting** | Render free tier (sleeps on idle) or $7/mo starter | **$0–7** |
| **Database** | Render free Postgres (1GB) or $7/mo (8GB) | **$0–7** |
| **LLM Processing** | Users bring their own API keys ($0 for you). Pro tier uses your shared pool. | **$0 + your API costs for Pro users** |
| **Notifications** | Users connect their own Telegram/Slack/Discord bots. Zero third-party API costs. | **$0** |
| **Browser Extension** | Code is ready. Chrome Web Store publisher fee is $5 one-time. | **$5 once** |
| **Total** | | **$0–14/mo + variable LLM costs** |

---

## Pricing

| Tier | Price | What you get | Why you'd pay |
|------|-------|-------------|---------------|
| **Free** | $0 | 10 runs/day, 2 channels, bring your own LLM key | Evaluate the product |
| **Pro** | **$15/mo** | 500 runs/day, shared LLM key pool (no key needed), all 10 channels, unlimited storage, priority support | Convenience — skip managing your own API keys |
| **Enterprise** | Custom | Team workspaces, managed LLM infrastructure, SSO, SLA | B2B compliance and scale |

---

## Quick Start

```bash
# Clone
git clone https://github.com/z99wE/mindmap.git
cd mindmap

# Docker (recommended for local dev)
docker compose up -d

# Or manual setup
cd phase2-working
npm install
cp .env.example .env   # Edit DATABASE_URL
node server.js

# Open http://localhost:3001
# First-run creates a local admin account automatically
```

---

## Testing

```bash
cd phase2-working

# Full suite (201 tests, 13 suites)
npm run test:all

# Unit tests only
npm run test:unit

# API tests only  
npm run test:api

# Legacy tests
npm run test:legacy
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

## What's Not Built Yet

These are called out honestly so you know the current state:

| Feature | Status | Why it's missing |
|---------|--------|-----------------|
| **Mobile app** | ❌ Not built | Web + browser extension cover desktop. Capacitor config is ready — needs Apple/Google account to publish. |
| **Browser extension published** | ⏳ Code ready, not submitted | Requires Chrome Web Store account ($5) and submission process. |
| **Bluesky inbound** | ❌ Not built | Bluesky uses AT Protocol firehose — different architecture from webhooks. |
| **Team/enterprise workspaces** | ❌ Not built | Collaborative sharing exists for pairs. Multi-user workspaces are next. |
| **Public API for third-party developers** | ❌ Not built | Internal API exists. Public documentation and rate limiting needed. |

---

## License

MIT — build, modify, scale.
