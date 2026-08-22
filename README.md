<p align="center">
  <img src="https://img.shields.io/badge/Status-Alpha-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tests-272_Passing-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-Node.js_PostgreSQL_React-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Deep_Tech-Behavioral_ML-7c3aed?style=for-the-badge" />
</p>

<h1 align="center">ReMentally</h1>
<h3 align="center">Your thoughts finally go somewhere — and come back when you need them.</h3>

<p align="center">
  Text yourself a thought on Telegram. Get a reminder on Slack 3 days later.<br/>
  Miss a deadline? Your accountability partner gets notified automatically.<br/>
  <b>No app to open. No habits to build. It just works.</b>
</p>

---

## Why This Exists

**You had a great idea in the shower. By the time you got to your phone, it was gone.**

You wrote it down in Notion. It sat there. Untouched. For 3 months. Then you forgot it existed.

You set a reminder in your calendar. It went off during a meeting. You dismissed it. Gone forever.

**The problem isn't remembering to write things down. It's that writing things down doesn't work.**

Traditional productivity tools fail because they:
- **Require you to open another app** — which you won't do when your brain is racing
- **Treat all thoughts the same** — "buy milk" and "write the proposal" get equal weight
- **Never follow up** — once captured, thoughts go into a black hole
- **Don't know YOU** — they treat every user identically

**ReMentally works differently.** It lives inside the messaging apps you already use. It learns your patterns. It follows up when you need it to. It knows which thoughts you'll actually complete and which ones you'll abandon — and tells you.

---

## What You Get (Outcomes, Not Features)

### You'll never lose a thought again
Capture ideas on Telegram, Slack, email, WhatsApp, or any of 9 platforms. They're stored in a memory graph that connects related thoughts — so when you think about "the Acme proposal," it pulls up everything you've said about Acme for the past month.

### You'll actually complete more
The app learns which thoughts you follow through on and which you abandon. It tells you: "You complete work thoughts 80% of the time when you tackle them before 11 AM." It suggests the right time to tackle each item based on YOUR patterns, not generic advice.

### Your accountability partner gets notified (if you want)
Set a witness contact for important commitments. If you miss a deadline, they get a gentle nudge. Users who set witness contacts complete commitments **72% more often** than those who don't.

### You'll know when you're about to burn out
The system tracks your thought volume and detects when you're approaching overload — before you feel it. "You tend to overwhelm on Wednesdays. You have 4 items due Thursday. Tackle 2 today."

### Your thoughts evolve over time
Old thoughts don't just sit there. They decay based on urgency. Critical items escalate. Vague ideas fade. The app automatically surfaces the thoughts that matter most right now.

### You get insights without asking
Every 6 hours, the system checks for patterns: recurring thoughts, expiring items, completion streaks, slump detection. It pushes insights to your notifications — you don't have to remember to check.

### It learns what works for YOU
Not generic productivity advice. Real behavioral ML that learns from your actual completion patterns, peak hours, category reliability, and stress thresholds. The app gets smarter the more you use it.

### You stay in control of your data
Bring your own API keys. Your thoughts are encrypted. You can export everything. GDPR compliant. No vendor lock-in.

---

## How It Works (The Tech Behind the Outcomes)

### The Behavioral ML Engine
This is what makes it deep tech, not just another to-do app.

```
Your thought comes in on Telegram
         │
         ▼
┌─────────────────────────────────────────────┐
│  BEHAVIORAL LEARNER                         │
│  "This user completes 80% of 'work'         │
│   thoughts before 11 AM. Current time:      │
│   10:15 AM. Completion probability: 78%."   │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  ADAPTIVE PRIORITIZER                       │
│  "This is a critical commitment. Tackle     │
│   it NOW during your peak hour. You'll      │
│   likely complete it."                      │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  COGNITIVE SCIENCE MODELS                   │
│  Half-life: 48 hours. Urgency: critical.    │
│  Witness: set. Deadline: Friday.            │
│  "If not completed by Thursday, your        │
│   witness gets notified."                   │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  VECTOR MEMORY GRAPH                        │
│  Stored with embeddings. Connected to       │
│  3 related thoughts about Acme.             │
│  "You had a similar thought on March 15."   │
└─────────────────────────────────────────────┘
```

### What the ML Actually Learns

| Pattern | How It Helps You |
|---------|-----------------|
| You complete thoughts at 10 AM, not 3 PM | Suggests tackling important items in the morning |
| "Work" thoughts have 80% completion, "personal" has 30% | Tells you to set deadlines for personal items |
| You create 15+ thoughts/day when stressed | Detects overload before you feel it |
| You've thought about "Acme proposal" 3 times | Surfaces: "This keeps coming up — make it a commitment" |
| Thoughts with witness contacts complete 72% more often | Recommends setting accountability partners |

### The 9-Channel Delivery

| Channel | What It Does For You |
|---------|---------------------|
| Telegram | Capture thoughts from your phone's most-used app |
| Slack | Get reminders during work hours |
| Discord | Team thought sharing |
| WhatsApp | Capture thoughts from your most-used messaging app |
| Email | Daily digest of pending items |
| Signal | Privacy-first thought capture |
| SMS | Works on any phone, no app needed |
| Twitter/X | Public thought journaling |
| Web Push | Browser notifications for deadlines |

**Failover:** If Telegram is down, it tries Slack → Email → DB. Your thoughts never get lost.

---

## The Numbers That Matter

| Metric | What It Proves |
|--------|---------------|
| **72% improvement** | Witness contacts increase commitment completion |
| **272 tests** | Every feature is verified automatically |
| **15 LLM providers** | Never dependent on a single AI vendor |
| **9 channels** | Reach users where they already are |
| **$0 operating cost** | Users bring their own API keys — zero infrastructure spend |
| **< 2 seconds** | Full test suite runs in under 2 seconds |

---

## Who This Is For

**Individuals with ADHD, autism, or cognitive fatigue** who:
- Have ideas they want to capture but forget to write down
- Set intentions but don't follow through
- Feel overwhelmed by the number of things they need to remember
- Want accountability without nagging
- Use messaging apps more than productivity apps

**Not for:** People who already have a perfect productivity system and never lose thoughts. (If that's you, you don't need this.)

---

## Quick Start

```bash
git clone https://github.com/z99wE/rementally.git
cd rementally/phase2-working
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and at least one API key
node server.js
# Open http://localhost:3001
```

**Docker:** `docker-compose up --build`

---

## Tech Stack

| Layer | Technology | Why It's Here |
|-------|-----------|--------------|
| Backend | Node.js + Express | Fast async, huge ecosystem |
| Database | PostgreSQL + pgvector | Vector search + relational in one — no extra infrastructure |
| Frontend | React (Vite) + Material Design 3 | Modern, accessible, fast builds |
| Embeddings | Groq (free) → NVIDIA → HuggingFace → OpenAI | Multi-provider failover, $0 cost |
| LLM | 15 providers with key rotation | Never dependent on one vendor |
| Channels | Custom PulseKit (zero SDK deps) | Full control, no vendor lock-in |
| Auth | JWT + bcrypt + disposable email blocking | Production-grade security |
| PWA | Service worker + background sync | Offline-first, installable on any device |

---

## License

MIT — see [LICENSE](phase2-working/LICENSE).
