# THOUGHT GPS: Complete Product Specification
## Intelligent Multi-Channel Thought Navigation Agent

---

## 📋 EXECUTIVE SUMMARY

**Thought GPS** transforms fragmented thoughts into coordinated actions across the internet, operating silently through WhatsApp, Telegram, Slack, Discord, Signal, and Email.

**Core Innovation**: Not a chatbot—a *distributed cognition orchestrator* that:
- Scrapes the web (DuckDuckGo) for context
- Processes multimodal inputs (voice, sketches, text)
- Executes complex workflows via Deerflow 2.0
- Routes via OmniRoute with user API keys
- Verifies actions via blockchain (Ceramic DIDs, IPFS)
- Maintains cryptographically isolated memory per user
- Protects against prompt injection, LLM jacking, and misuse

---

## 🏗️ ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────┐
│           THOUGHT GPS: Distributed Cognition Platform         │
└────────────────────────────────────────────────────────────────┘

USER LAYER (Multi-Channel Input)
│
├─ WhatsApp (voice notes, images, text)
├─ Telegram (quick thoughts, files)
├─ Slack (team context, threads)
├─ Discord (community thoughts)
├─ Signal (private, encrypted)
└─ Email (long-form thoughts, attachments)
│
↓
┌────────────────────────────────────────────────────────────────┐
│         MESSAGE NORMALIZATION & INPUT VALIDATION              │
│  • Graceful fallback for malformed inputs                     │
│  • Rate limiting + DDoS protection                            │
│  • Input sanitization (prevent prompt injection)              │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         MULTIMODAL PROCESSING ENGINE                           │
│  • Whisper: Voice transcription                               │
│  • Vision API: Image/sketch understanding                     │
│  • Text: Direct semantic analysis                             │
│  • Output: Normalized thought representation                  │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         CONTEXT RETRIEVAL & ENRICHMENT                         │
│  • Ceramic DID: User identity verification                    │
│  • Memory store: User-isolated context (PostgreSQL)           │
│  • Semantic search: Find relevant past thoughts               │
│  • Web scraping: DuckDuckGo for external context              │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         ORCHESTRATION & WORKFLOW ENGINE (Deerflow 2.0)        │
│  • Parse intent from thought                                  │
│  • Select appropriate workflow                                │
│  • Coordinate multi-step execution                            │
│  • Generate action plan                                       │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         INTELLIGENT ROUTING (OmniRoute + User APIs)            │
│  • User-provided API key management (encrypted)               │
│  • Dynamic endpoint routing                                   │
│  • Request transformation & normalization                     │
│  • Response aggregation                                       │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         AI BRAIN (Featherless.ai Inference)                    │
│  • LLM inference (Claude, Llama, etc.)                        │
│  • Function calling for tool use                              │
│  • Reasoning + planning                                       │
│  • Fallback to local Ollama if needed                         │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         ACTION EXECUTION & VERIFICATION                        │
│  • Execute workflow steps                                     │
│  • Blockchain attestation (Ceramic, IPFS, Arweave)           │
│  • Result aggregation                                         │
│  • Error recovery                                             │
└────────────────────────────────────────────────────────────────┘
│
↓
┌────────────────────────────────────────────────────────────────┐
│         RESPONSE DELIVERY (Multi-Channel Output)               │
│  • Smart channel selection (where user will see it)           │
│  • Compressed summaries for brief channels                    │
│  • Rich formatting for capable channels                       │
│  • Async processing (no wait for slow actions)                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 SECURITY ARCHITECTURE

### 1. Input Protection
```typescript
// Prevent prompt injection
- Sanitize user input (remove injection patterns)
- Separate user data from system prompts
- Rate limit per user + per channel
- Content filter (block malicious payloads)
- Signature verification on webhook inputs
```

### 2. LLM Jacking Prevention
```typescript
// Prevent model takeover
- System prompt is immutable (frozen in contract)
- LLM responses go through validation layer
- No user input reaches system prompt directly
- Tool calling is restricted to whitelist
- Output filtering (remove attempts to modify behavior)
```

### 3. API Key Management
```typescript
// User's API keys (encrypted at rest)
- Stored encrypted in PostgreSQL (AES-256)
- Per-user encryption key (derived from user's Ceramic DID)
- Keys never logged or exposed
- Automatic rotation capability
- Audit trail of API key usage
```

### 4. Graceful Fallback
```typescript
// Resilience + user experience
- Missing service → use cached response + notify user
- Rate limited → queue + retry later
- API error → fallback to local processing
- Network down → continue offline (sync later)
- Invalid input → clarify with user (don't fail)
```

---

## 🔗 BLOCKCHAIN INTEGRATION (Not for NFTs/Tokens)

### Purpose
- **Identity**: Ceramic DIDs for verifiable user identity
- **Memory**: IPFS for distributed thought storage
- **Audit**: Arweave for immutable action logs
- **Trust**: Public verification of agent decisions

### Architecture

**1. Ceramic Network**
```
User DID (Decentralized Identifier)
├─ Public profile (identity)
├─ Verified credentials (trusted channels)
├─ Encryption keys (shared with agent)
└─ Agent authorization (signed grants)

Benefits:
- No server stores user identity
- Portable identity across platforms
- Cryptographic verification
- User controls their data
```

**2. IPFS (InterPlanetary File System)**
```
User Memory Snapshots
├─ Distributed across network
├─ Content-addressed (integrity guaranteed)
├─ Encrypted before upload
├─ Pinned to free IPFS services (Pinata, Filecoin)
└─ Recovery if PostgreSQL fails

Benefits:
- Decentralized backup
- No single point of failure
- User can retrieve their data anytime
- Censorship resistant
```

**3. Arweave (Immutable Storage)**
```
Action Log (What agent did + why)
├─ Every decision → signed record
├─ Timestamp + proof of computation
├─ Free tier via Bundlr (batch transactions)
├─ Publicly verifiable
└─ Cannot be modified retroactively

Benefits:
- Transparent accountability
- Regulatory compliance (audit trail)
- User can prove agent acted correctly
- Open inspection of agent behavior
```

### Integration Points
```typescript
// When thought is processed:
1. User sends thought → Assigned unique ID
2. Thought stored in PostgreSQL (user's row)
3. Thought encrypted → uploaded to IPFS
4. IPFS hash → stored in Ceramic tile
5. Agent decision → logged to Arweave

// User verification:
- User's DID → retrieve all their Ceramic tiles
- Ceramic tile → download from IPFS
- IPFS content → verify against Arweave log
- Result: Cryptographic proof agent acted correctly
```

---

## 🔒 AUTHENTICATION STRATEGY (Lean Startup)

### Why NOT Blockchain Auth (for now)
- ❌ Adds complexity for users (wallet setup, gas fees)
- ❌ Slower than traditional auth
- ❌ UX friction (seed phrases, signing)
- ❌ Not necessary for MVP

### Recommended: Hybrid Approach
```
PHASE 1 (MVP): Traditional + Web3 Ready
├─ Email-based login (Session tokens)
├─ Passwordless: Magic links sent to email
├─ No passwords = simple, secure, cheap
├─ Server: PostgreSQL (single auth table)
└─ Cost: $0 (uses free Render tier)

PHASE 2 (Post-Launch): Add Blockchain Option
├─ Ceramic DID login (Sign with wallet)
├─ Existing email users can link DID
├─ Enables decentralized features
├─ No migration required
└─ Cost: Still $0
```

### Why Passwordless Email Auth
```
✅ Zero cost (Render free tier supports sessions)
✅ Simple UX (one click login via email)
✅ Secure (session tokens, no passwords)
✅ Easy migration to blockchain later
✅ Compliant (GDPR-friendly, user data portable)
✅ Fast implementation (15-day hackathon)

Flow:
1. User enters email → sends magic link
2. User clicks link → session token created
3. Token stored in PostgreSQL
4. Session valid for 30 days
5. Logout → delete token
```

### Optional: Ceramic DID for Premium Features
```
Future enhancement (not MVP):
- Users can "connect DID"
- Sign message with wallet
- Verify ownership
- Unlock decentralized features:
  * Self-hosted memory (IPFS)
  * Verifiable audit trail (Arweave)
  * Cross-platform identity
  * Portable user data
```

---

## 🌐 WEB SCRAPING ARCHITECTURE (DuckDuckGo)

### Purpose
- Enrich thoughts with web context
- Find relevant information
- Answer questions without explicit request
- Privacy-respecting (DuckDuckGo doesn't track)

### Integration

**1. Search Trigger**
```typescript
// Thought GPS detects search intent:
- "research AI papers on AGI"
- "find restaurants near me"
- "check bitcoin price"
- "what's the latest in TypeScript"

→ Automatically scrapes DuckDuckGo
```

**2. Search Flow**
```typescript
// DuckDuckGo scraping (privacy-first)
- Use duckduckgo-cli or API wrapper
- Returns: title, snippet, URL
- Parse results with Cheerio (HTML parsing)
- Extract relevant information
- Filter spam/ads

// Result caching
- Cache per-user (so user doesn't see duplicates)
- TTL: 7 days (data expires)
- Store in Redis (fast retrieval)
```

**3. Privacy & Rate Limiting**
```typescript
// Respect DuckDuckGo Terms of Service
- Max 1 request per second (global)
- User-Agent: Identify as Thought GPS
- No aggressive scraping
- Cache results (reduce requests)
- Fallback: If rate limited, use cached results

// Alternative: Searx (Open-source meta-search)
- Self-hosted or public instances
- No tracking
- Free
- Aggregates multiple search engines
```

---

## 🎨 UI/UX DESIGN PRINCIPLES

### Reference: DesignFest Component
- **Bold Typography**: Retro fonts (Shrikhand) for personality
- **Color Palette**: Black, white, accent colors (green, purple, orange)
- **Card-Based Layout**: Modular, responsive grid
- **Smooth Animations**: Scroll-triggered reveals
- **Mobile-First**: Touch-friendly, no hover-dependence

### Thought GPS UI Adaptations

**1. Dashboard (Not a Chat)**
```
┌─────────────────────────────────────────┐
│  THOUGHT GPS                  [Settings] │
├─────────────────────────────────────────┤
│                                         │
│  Active Thoughts  →  In Progress        │
│  ┌──────────┐       ┌──────────┐        │
│  │ "Find ML │       │ Searching│        │
│  │ papers"  │ ──→   │ DuckDuckG│        │
│  └──────────┘       └──────────┘        │
│                                         │
│  Completed  ✓                           │
│  ┌──────────┐                           │
│  │ "Book    │ ──→  [Send to Telegram]   │
│  │ flight"  │                           │
│  └──────────┘                           │
│                                         │
└─────────────────────────────────────────┘

(No chat bubbles, just task pipeline)
```

**2. Thought Entry (Mobile)**
```
┌─────────────────────────────────────────┐
│         📍 Thought GPS                  │
├─────────────────────────────────────────┤
│                                         │
│  [🎤] Voice note recorder               │
│  [📷] Sketch/image capture              │
│  [📝] Quick text input                  │
│                                         │
│  [Send across all channels]             │
│                                         │
└─────────────────────────────────────────┘
```

**3. Action Results**
```
┌─────────────────────────────────────────┐
│  ✓ Thought: "Find TypeScript blogs"     │
│                                         │
│  📊 Results Found                       │
│  • Article 1: TypeScript 5.1 Features   │
│  • Article 2: Performance Tips          │
│                                         │
│  [View on Web] [Save to Notion]         │
│  [Share on Twitter] [Done]              │
│                                         │
│  🔗 Arweave Log: [tx123...]             │
│  🔐 Verified by Ceramic: [DID...]       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📦 TECH STACK (Cost-Optimized)

| Layer | Technology | Cost |
|-------|-----------|------|
| **Frontend** | Next.js (Vercel free tier) | $0 |
| **Backend** | Node.js + Express (Render) | $0 |
| **Database** | PostgreSQL (Render free tier) | $0 |
| **Cache** | Redis (Render free tier) | $0 |
| **Inference** | Featherless.ai ($25 hackathon credit) | $0 |
| **Fallback LLM** | Ollama (local) | $0 |
| **Blockchain** | Ceramic, IPFS, Arweave (all free) | $0 |
| **Search** | DuckDuckGo API | $0 |
| **Auth** | Session tokens (PostgreSQL) | $0 |
| **Hosting** | Render (free tier) | $0 |
| **Domain** | Use Render's free subdomain | $0 |
| **Total First Year** | **$0** | **$0** |

---

## 📅 PHASE BREAKDOWN (15 Days)

### Phase 1: Foundation (Days 1-3)
- [ ] Monorepo setup (TypeScript, Turbo)
- [ ] Caspian SDK integration (all 6 channels)
- [ ] PostgreSQL schema (users, thoughts, API keys)
- [ ] Passwordless email auth via magic links
- [ ] Basic message normalization

### Phase 2: Multimodal Processing (Days 4-6)
- [ ] Voice transcription (Whisper)
- [ ] Image understanding (Claude Vision)
- [ ] Text semantic analysis
- [ ] Input validation + injection protection

### Phase 3: Core Orchestration (Days 7-9)
- [ ] Deerflow 2.0 integration
- [ ] Workflow engine (DAGs)
- [ ] OmniRoute setup (user API key management)
- [ ] Web scraping (DuckDuckGo)

### Phase 4: Blockchain + Security (Days 10-12)
- [ ] Ceramic DID setup
- [ ] IPFS memory storage
- [ ] Arweave action logging
- [ ] LLM jacking protection

### Phase 5: Polish + Deployment (Days 13-15)
- [ ] UI/UX refinement
- [ ] Error handling + graceful fallbacks
- [ ] Rate limiting + DDoS protection
- [ ] Deploy to Render + GitHub
- [ ] Demo video

---

## 🚀 KEY DIFFERENTIATORS

1. **Not a Chatbot**: Task-oriented, not conversational
2. **Privacy First**: User API keys encrypted, blockchain backup
3. **Truly Distributed**: IPFS + Ceramic + Arweave
4. **ADHD-Friendly**: Turns scattered thoughts into focused actions
5. **Verifiable**: Every action logged to blockchain
6. **Zero Cost**: Free tier everything, Featherless.ai sponsorship
7. **Multimodal**: Voice, sketches, text all understood

---

## 💻 REPOSITORY STRUCTURE

```
thought-gps/
├── README.md (with hackathon brief)
├── ARCHITECTURE.md
├── SECURITY.md
├── LICENSE (MIT)
├── package.json (monorepo)
├── tsconfig.json
├── .github/workflows/deploy.yml
├── .env.example
├── packages/
│   ├── caspian-handler/         # Multi-channel input
│   ├── multimodal-processor/    # Voice, image, text
│   ├── orchestrator/            # Deerflow 2.0
│   ├── router/                  # OmniRoute wrapper
│   ├── memory-service/          # User-isolated context
│   ├── blockchain-client/       # Ceramic, IPFS, Arweave
│   ├── web-scraper/             # DuckDuckGo integration
│   ├── security/                # Input validation, LLM protection
│   └── api-gateway/             # Main API
├── services/
│   ├── db/schema.sql
│   └── docker-compose.yml
├── frontend/
│   ├── pages/
│   ├── components/
│   └── styles/
└── tests/

```

---

## ✅ SUCCESS CRITERIA

**Hackathon Judging**:
1. ✓ Runs on 3+ channels (WhatsApp, Telegram, Slack)
2. ✓ Most creative use case (thought orchestration, not chatting)
3. ✓ Actually works (demo is live, not mocked)
4. ✓ Web scraping (DuckDuckGo integration)
5. ✓ Multimodal input (voice, images, text)
6. ✓ Blockchain features (Ceramic, IPFS, Arweave)
7. ✓ Security hardened (injection protection, API key management)
8. ✓ Free deployment (Render + Featherless.ai sponsorship)

