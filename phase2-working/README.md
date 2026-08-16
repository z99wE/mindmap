# Thought GPS / UnZonko
**The Cognitive Coprocessor**

UnZonko is an intelligent, omni-channel cognitive coprocessor designed to capture, organize, and synthesize your fragmented thoughts into a cohesive memory graph. It serves as your second brain, processing chaotic inputs from multiple platforms (Telegram, Discord, Slack, etc.) and gracefully organizing them over time.

---

## 🌟 Core Features

- **Omni-Channel Ingestion (PulseKit):** Send thoughts via Telegram, Discord, Slack, Email, or WebPush. The system unifies all inbound data streams effortlessly.
- **Memory Graph Processing:** Thoughts are not just stored; they are semantically chunked, embedded, and mapped in a relational graph, establishing deep connections between isolated ideas over time.
- **PicoClaw Autonomous Engine:** A zero-dependency, native ReAct (Reason-Act) background agent that wakes up periodically to consolidate fragmented memories, proactively resolve pending tasks, and nudge you with digests.
- **Multi-Tenant Safety:** Strictly partitioned architecture ensures LLMs only ever see context bound to your specific `user_id`.
- **BYOK (Bring Your Own Keys):** Users can input their own OpenAI or Groq API keys, avoiding massive centralized infrastructure costs.
- **Render-Optimized (Zero Bloat):** Specifically engineered to run smoothly within a 512MB RAM budget on Render's free tier, avoiding heavy python/agent frameworks in favor of tightly-coupled native JS pipelines.

---

## 🏗 Architecture

### 1. The Orchestrator (`orchestrator.js`)
The core NLP pipeline is modeled as a Directed Acyclic Graph (DAG) via `WorkflowNode` components. When a thought arrives, it passes through sequential parsing steps (extraction, embedding, categorizing) before settling into the memory graph.

### 2. PulseKit (`src/pulsekit/`)
PulseKit replaces heavy third-party messaging wrappers (like Caspian) with native, lightweight socket and polling implementations. 
- Automatically polls Telegram and WebSockets (Discord) in the background.
- Emits unified `{ from, message, channel, reply }` events into the Orchestrator.
- Gracefully handles Webhooks for platforms like Slack and WhatsApp.

### 3. PicoClaw Agent Loop
Instead of importing Langchain or CrewAI, UnZonko ships with **PicoClaw** — a native ReAct loop embedded within the `OrchestratorManager`. 
- **Operation:** Every 10 minutes, the engine queries the database for users with 3 or more "pending" unstructured thoughts.
- **Agentic Capability:** It spawns an isolated LLM loop equipped with a tool registry (e.g. `consolidate_memories`, `send_message`).
- **Cost-Bound:** The loop is hard-capped at 3 iterations to prevent runaway token expenditure.

### 4. KeyPool & KeyRouter (`src/key-pool.js`)
Handles the aggregation and round-robin fallback of LLM API keys. Users' personal keys take priority, falling back to a global KeyPool if provided.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database
- Redis (Optional, for advanced caching)

### Getting Started

1. **Clone and Install**
   ```bash
   git clone <repo>
   cd phase2-working
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL=postgres://user:pass@localhost:5432/mindmap
   JWT_SECRET=your_secret
   API_KEY_ENCRYPTION_SECRET=your_32_char_secret
   ```

3. **Run the Database Migrations**
   The server automatically runs `db.js` initialization routines on startup.

4. **Start the Server**
   ```bash
   npm run start
   ```

---

## ☁️ Deployment (Render)

UnZonko is built to be deployed on Render's Free Tier:
- Background loops (`setInterval`) manage polling and memory consolidation without external cron jobs.
- Self-ping endpoints (`/api/cron/tick`) keep the instance alive.
- Extremely low memory footprint. 

> **Note on Upgrades:** If API Key Encryption Secrets change across deployments, `crypto.js` will gracefully discard invalid keys instead of crashing the server, prompting users to re-authenticate their channels.

---

## 🛡 License
MIT Licensed.
