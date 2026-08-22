# Architecture Decision Record

## Overview

ReMentally is a cognitive coprocessor — a middleware layer between the user's brain and every application they use. It captures thoughts from multiple channels, processes them through an AI pipeline, stores them in a vector memory graph, and delivers insights back through the same channels.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                 INPUT CHANNELS                       │
│  Web UI │ Telegram │ Slack │ Email │ Browser Ext    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              API GATEWAY (Express)                   │
│  Auth │ Rate Limit │ Sanitize │ Log │ Route          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              AGENT ORCHESTRATOR                      │
│  Research │ Memory │ Nudge │ Calendar               │
│  (Persistent memory in agent_memories table)         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              LLM KEY ROUTER                          │
│  15 providers · Round-robin · Cooldown · BYOK       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              MEMORY GRAPH                            │
│  PostgreSQL + pgvector · Half-life decay            │
│  Commitments · Drift · Cognitive load               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              PULSEKIT (Messaging Kernel)             │
│  10 channels · Priority routing · Failover          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
             User's Devices
```

## Key Decisions

### 1. Bring Your Own Credentials (BYOC)
- **Decision**: Users provide their own bot tokens for messaging channels
- **Rationale**: Zero notification infrastructure cost. Users own their bot tokens, so there's no shared API key to manage or bill for
- **Trade-off**: Setup complexity for users; they must create their own bots

### 2. PostgreSQL + pgvector for Vector Search
- **Decision**: Store embeddings in PostgreSQL using pgvector instead of a dedicated vector DB
- **Rationale**: Single database for everything — no additional infrastructure, simpler operations
- **Trade-off**: IVFFlat indexes need ~1,000 rows to be effective; lacks some features of Pinecone/Weaviate

### 3. No Third-Party SDKs
- **Decision**: Built PulseKit as a native messaging kernel instead of using Caspian or similar SDKs
- **Rationale**: Zero dependency on external messaging SDKs that could change pricing/APIs. Full control over delivery pipeline
- **Trade-off**: More code to maintain, but each channel driver is <200 lines

### 4. Row-Level Security (RLS) with Application Fallback
- **Decision**: RLS enabled via `ENABLE_RLS=true` env var; app-level user_id scoping always active
- **Rationale**: Defense-in-depth. If RLS is off, the application layer still isolates users by user_id in every query
- **Trade-off**: RLS adds query overhead; disabled by default for simplicity

### 5. Multi-Agent Orchestrator with Persistent Memory
- **Decision**: 4 specialized agents (Research, Memory, Nudge, Calendar) share persistent memory
- **Rationale**: Agents need to remember past findings across sessions. Stateless chatbots lose context
- **Trade-off**: More DB writes, but each agent operates on a 30-min cycle so write volume is low

### 6. Web Speech API for Voice
- **Decision**: Browser-native SpeechRecognition + SpeechSynthesis instead of Deepgram/AssemblyAI/VAPI
- **Rationale**: $0 cost, no API keys, works offline for TTS, W3C standard
- **Trade-off**: Chrome/Edge/Safari only; Firefox SpeechRecognition is behind a flag

## Data Flow

### Inbound Message Processing
1. Message arrives via webhook, polling, or WebSocket
2. PulseKit identifies the user (channel credentials → user_id mapping)
3. Message sent to Agent Orchestrator
4. Orchestrator runs DAG: parse → check memory → enrich → LLM process → update memory → respond
5. Response sent back through PulseKit

### Background Agent Cycle (30 min)
1. Select users active in last 24 hours
2. For each user: Research Agent (web context) → Memory Agent (pattern detection) → Nudge Agent (timed notifications) → Calendar Agent (deadline tracking)
3. Store findings in agent_memories table
4. Create activities for the attention layer

## Security Model

- **Authentication**: JWT with 7d access + 30d refresh tokens
- **Authorization**: Middleware on every sensitive route; adminMiddleware for admin routes
- **Tenant Isolation**: All queries scoped by user_id. Optional RLS for defense-in-depth
- **Encryption at Rest**: API keys encrypted with AES via CryptoJS
- **Input Validation**: Email/password validation, XSS sanitization, SQL parameterization
- **Rate Limiting**: Global (100/15min IP) + Per-user (tier-based) + Auth-specific (register/login)

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 22 | LTS, excellent async I/O, large ecosystem |
| Framework | Express 4.x | Mature, well-understood, minimal abstraction |
| Database | PostgreSQL 16 + pgvector | Single DB for everything, vector search built-in |
| Frontend | React 19 + Vite 5 | Fast HMR, modern React, tree-shaking |
| Mobile | Capacitor 8 | Web-to-native bridge for iOS/Android |
| Auth | JWT + bcryptjs | Stateless auth, no session store needed |
| Security | Helmet + express-rate-limit | Battle-tested security headers and rate limiting |
| Monitoring | Pino + console | Structured JSON logging, zero-config |
| CI/CD | GitHub Actions | Integrated with repository, free for public repos |

## Deployment Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Cloudflare DNS  │────▶│   Render Web     │
│   (CNAME)         │     │   (Node.js 22)   │
└──────────────────┘     └────────┬─────────┘
                                  │
                        ┌────────▼─────────┐
                        │   Render Postgres │
                        │   (PostgreSQL 16) │
                        └──────────────────┘
```

- **Render Free Tier**: Service sleeps after 15 min idle. Cold start ~2-4s
- **Autoscaling**: Not available on free tier. Pro tier ($7/mo) adds 24/7 uptime
- **Database**: Free Postgres (1GB storage). Pro ($7/mo) adds 8GB
