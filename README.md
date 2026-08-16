# 🧠 Thought GPS (Cognitive Coprocessor)

[![Render](https://img.shields.io/badge/Render-Deployed-success?logo=render)](https://render.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-blue?logo=postgresql)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A Multi-Channel Autonomous Memory Graph & Behavioral Coprocessor for ADHD & Neuro-Diverse Minds.**

Traditional productivity platforms (Todoist, Notion, calendars) assume a **neurotypical baseline** of executive function. For individuals with ADHD, Autism, or severe cognitive fatigue, these platforms fail because once a thought is written down in a closed app, it disappears from short-term working memory, leading to immediate task abandonment.

**Thought GPS is a Cognitive Coprocessor.** It operates as an invisible, zero-friction layer that captures, classifies, updates, and escalates thoughts across real-world messaging channels (Telegram, Slack, Email) using vector memory, OSRM routing, and autonomous agent loops.

---

## ✨ Core Features (Production Ready)

### 1. Autonomous Memory Graph (pgvector)
Thoughts are not just text. They are vectorized and mapped into a multidimensional Knowledge Graph. Relationships between thoughts, locations, and people are mapped dynamically.

### 2. Multi-Tenant Native Fallback (Zero API Costs)
Thought GPS completely sidesteps expensive third-party notification APIs. It uses a **Bring Your Own Keys (BYOK)** multi-tenant architecture. 
If one channel fails, the system automatically degrades gracefully across your connected channels (Telegram → Slack → Email → Web Push) to ensure you never miss a cognitive nudge.

### 3. OmniRoute (Multi-LLM Intelligence)
Enterprise-grade operations running at a **$0 operational budget** using OmniRoute, automatically routing your requests across 90+ free AI providers for intelligent thought classification and processing.

### 4. The Thought Half-Life Engine (Decay Mode)
Unlike flat checklists that accumulate dust, thoughts in Thought GPS have an active **Half-Life Decay Rate** based on their category. Actionable items decay faster and escalate across your channels before they expire.

### 5. Commitment Witness (Accountability Mode)
A novel social-proofing system built directly into the memory graph. It automatically triggers notifications to designated witness contacts when you miss a self-imposed deadline, preventing self-sabotage.

---

## 🔌 Connected Channels & Integrations

Thought GPS seamlessly bridges the gap between the app and the platforms you already use every day. Users can connect the following channels in the **Connected Channels** dashboard:

- **Telegram**: Native integration (Requires Bot Token & Chat ID).
- **Slack**: Native integration (Requires Bot Token & Channel ID).
- **Email (SMTP)**: Native delivery (Requires standard SMTP credentials).
- **Web Push**: Browser-native push notifications fallback.
- **Discord, WhatsApp, SMS, Signal, Bluesky, Twitter (X)**: Supported via the Caspian SDK or webhooks.

---

## 🚀 Easy Installation (1-Click Ready)

Thought GPS is built to be deployed seamlessly. Follow these instructions to get it running locally or on the cloud.

### Option 1: Cloud Deployment (Render & Docker) - Recommended

We've provided a fully-configured `render.yaml` and `Dockerfile` for instant deployment on [Render](https://render.com) (or any Docker-compatible platform).

1. Fork or clone this repository.
2. Sign in to Render and select **Blueprints** -> **New Blueprint Instance**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` and spin up both your web service and a free PostgreSQL database.
5. In your Render Dashboard, set your environment variables (see `.env.example`).

### Option 2: Local Development Setup

#### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL (with the `pgvector` extension installed)

#### 1. Clone & Install
```bash
git clone https://github.com/yourusername/Thought-GPS.git
cd Thought-GPS/phase2-working

# Install Backend Dependencies
npm install

# Install Frontend Dependencies
cd src/frontend
npm install
cd ../..
```

#### 2. Configure Environment
Copy the example environment file and fill in your database credentials:
```bash
cp .env.example .env
```
Make sure to set `DATABASE_URL` pointing to your local Postgres instance with `pgvector` enabled.

#### 3. Run the App
Start the full stack with a single command:
```bash
npm run dev
```
- **Backend API**: Runs on `http://localhost:3001` (by default)
- **Frontend UI**: Runs on `http://localhost:3331` (Vite)

Navigate to the frontend URL to start building your external brain!

---

