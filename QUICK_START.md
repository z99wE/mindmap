# Thought GPS: Quick Start for Developers

---

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (free Render instance)
- Git

### Clone & Install

```bash
# Clone the repo
git clone https://github.com/yourusername/thought-gps.git
cd thought-gps

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Get API Keys (Free Tier)

1. **Caspian SDK**
   - Go to https://www.trycaspianai.com/docs/
   - Create account → Get API key

2. **Featherless.ai** (Hackathon sponsor)
   - Sign up → Get $25 free credit
   - Use their LLM for inference

3. **Channels** (Pick at least 2)
   - **Telegram**: Create bot via @BotFather on Telegram
   - **WhatsApp**: Get Business API access (may need business account)
   - **Slack**: Create app at https://api.slack.com/apps
   - **Discord**: Create application at Discord Developer Portal
   - **Signal**: Use REST API
   - **Email**: Use Gmail or SendGrid API

4. **Other Services** (Optional)
   - DuckDuckGo: No API key needed (free)
   - Render: Create account for free PostgreSQL
   - GitHub: Generate personal access token

### Setup Database

```bash
# Set DATABASE_URL in .env
DATABASE_URL="postgres://user:password@host:port/database"

# Run migrations
npm run db:migrate

# Verify connection
npm run db:test
```

### Start Development

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Watch TypeScript compilation
npm run watch

# Terminal 3: Tail logs
npm run logs
```

**Server runs at**: http://localhost:3000

---

## 🧪 Test a Message End-to-End

### Via Telegram (Easiest)

```bash
# 1. Get your Telegram bot link from .env
TELEGRAM_BOT_LINK="https://t.me/your_bot_username"

# 2. Open link → Start bot

# 3. Send message: "hello"

# Expected flow:
# - Bot receives message
# - Normalizes to UnifiedMessage
# - Routes to orchestrator
# - LLM processes
# - Response sent back on same channel
```

### Check Logs

```bash
# View processed thoughts
npm run logs | grep "THOUGHT_PROCESSED"

# View errors
npm run logs | grep "ERROR"

# View blockchain logs
npm run logs | grep "ARWEAVE"
```

---

## 📁 Key File Locations

**Configuration**
```
.env                           # Secrets (DO NOT COMMIT)
.env.example                   # Template
```

**Source Code**
```
packages/
├── caspian-handler/          # Multi-channel input
│   └── src/handler.ts        # Core handler
├── orchestrator/             # Deerflow workflows
│   └── src/engine.ts         # Workflow execution
├── multimodal-processor/     # Voice, image, text
├── router/                   # OmniRoute + API keys
├── memory-service/           # User context
├── blockchain-client/        # Ceramic, IPFS, Arweave
├── web-scraper/             # DuckDuckGo integration
└── security/                # Input validation, LLM protection
```

**Database**
```
services/db/
├── schema.sql               # Table definitions
├── migrations/              # Schema updates
└── seeds/                   # Test data
```

**Configuration**
```
workflows/                   # Deerflow YAML workflows
├── research-and-share.yaml
├── book-and-sync.yaml
├── adhd-task-breakdown.yaml
└── email-triage-auto.yaml
```

---

## 🔧 Common Tasks

### Add a New Workflow

1. **Create workflow file** (`workflows/my-workflow.yaml`)
   ```yaml
   workflow_id: my-workflow
   trigger: thought
   intent_pattern: "my|intent|keywords"
   
   steps:
     - id: step_1
       type: process
       service: llm
       prompt: "Do something"
     
     - id: step_2
       type: send
       service: telegram
       depends_on: step_1
   ```

2. **Test it**
   ```bash
   npm run test:workflow workflows/my-workflow.yaml
   ```

3. **Deploy**
   ```bash
   git add workflows/my-workflow.yaml
   git commit -m "feat: add my-workflow"
   git push  # Auto-deploys via GitHub Actions
   ```

### Add a New Channel

1. **Create channel handler** (`packages/caspian-handler/src/channels/mychannel.ts`)
   ```typescript
   export class MyChannelHandler {
     async receive(message: any): Promise<UnifiedMessage> {
       return {
         id: generateId(),
         user_id: message.user_id,
         channel: 'mychannel',
         content: message.text,
         metadata: { timestamp: new Date() },
       };
     }
   }
   ```

2. **Register in main handler**
   ```typescript
   const handler = new CaspianHandler({
     // ... existing channels
     mychannel: { config: process.env.MYCHANNEL_CONFIG },
   });
   ```

3. **Test**
   ```bash
   npm run test:channel mychannel
   ```

### Debug a Thought

```bash
# Find the thought ID
npm run db:query "SELECT id FROM user_thoughts WHERE content LIKE '%search term%'"

# View full execution
npm run debug:thought <thought_id>

# Shows: input → intent → workflow → steps → result
```

### Check Blockchain Logs

```bash
# View recent Arweave logs
npm run blockchain:logs --limit 10

# Shows: what action, when, result
# Links to Arweave for verification

# Verify specific action
npm run blockchain:verify <arweave_tx_id>
```

---

## 🐛 Troubleshooting

### Message Not Received on Channel

**Check 1**: API token valid?
```bash
npm run test:channel telegram
# Should print: ✓ Channel connected
```

**Check 2**: Database recording thought?
```bash
npm run db:query "SELECT * FROM user_thoughts ORDER BY created_at DESC LIMIT 1"
# Should show your test message
```

**Check 3**: Logs show error?
```bash
npm run logs | grep ERROR
# Fix the error message shown
```

### LLM Response Slow

**Check**: Using Featherless.ai correctly?
```bash
# Test inference
npm run test:inference "hello"

# Should respond in < 5 seconds
```

**If slow**: 
- Featherless might be rate limiting
- Try Ollama locally: `ollama serve`
- Check fallback is working

### Database Connection Error

**Check**: PostgreSQL running?
```bash
npm run db:test
# Should print: ✓ Connected

# If fails:
# 1. Verify DATABASE_URL in .env
# 2. Check Render PostgreSQL is green
# 3. Try local: createdb thought_gps_dev
```

### Blockchain Logs Not Working

**Check**: Arweave node responding?
```bash
npm run blockchain:health
# Should print: ✓ Arweave responding

# If fails:
# - Check ARWEAVE_KEY in .env
# - Verify bundlr wallet has balance
# - Try fallback: use IPFS only for now
```

---

## 🧬 Code Examples

### Send Message Across Channels

```typescript
import { sendMultiChannel } from '@thoughtgps/api-gateway';

await sendMultiChannel({
  userId: 'user123',
  channels: ['telegram', 'whatsapp', 'slack'],
  message: 'This goes to 3 places',
});
```

### Create a Reminder

```typescript
import { createReminder } from '@thoughtgps/memory-service';

await createReminder({
  userId: 'user123',
  task: 'Review PR',
  scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  channels: ['slack', 'telegram'],
});
```

### Execute a Workflow

```typescript
import { workflowEngine } from '@thoughtgps/orchestrator';

const result = await workflowEngine.execute({
  workflow_id: 'research-and-share',
  user_id: 'user123',
  input: {
    user_thought: 'Find papers on AGI',
  },
});

console.log(result.status); // 'success' or 'error'
console.log(result.steps); // What each step did
```

### Scrape Web

```typescript
import { searchWeb } from '@thoughtgps/web-scraper';

const results = await searchWeb({
  query: 'TypeScript best practices',
  max_results: 10,
});

results.forEach(r => {
  console.log(`${r.title}: ${r.url}`);
});
```

### Store API Key

```typescript
import { storeAPIKey } from '@thoughtgps/router';

await storeAPIKey({
  userId: 'user123',
  service: 'github',
  api_key: 'ghp_xxxxx',
});

// Later, use it:
const github_token = await getAPIKey('user123', 'github');
```

---

## 🚀 Deploy to Render

### 1. Create Render Account
- Go to https://render.com
- Sign up (free tier available)

### 2. Connect GitHub

```bash
# Enable GitHub Actions in your repo settings
# Add Render deploy key to GitHub
```

### 3. Create Services

In Render dashboard:
- **Web Service**: Deploy from GitHub
- **PostgreSQL**: Free tier database
- **Redis**: Free tier cache

### 4. Add Secrets

In Render environment:
```
CASPIAN_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
# ... all from .env
```

### 5. Deploy

```bash
git push origin main
# Automatically deploys via GitHub Actions
```

**Check deployment**: https://yourdomain.onrender.com

---

## 📊 Monitoring

### View Dashboard

```bash
npm run dashboard
# Opens: http://localhost:3001

# Shows:
# - Active thoughts
# - Workflow execution times
# - Error rate
# - Channel traffic
```

### Set Alerts

```typescript
// Alert if error rate > 5% in last hour
await monitoring.setAlert({
  name: 'high_error_rate',
  condition: 'error_rate > 0.05',
  channels: ['email', 'slack'],
});
```

### Metrics Exported

- Prometheus format at `/metrics`
- Import to Grafana for dashboards

---

## 💡 Tips & Tricks

### Speed Up Development

```bash
# Skip TypeScript check during dev
npm run dev:fast

# Watch only changed files
npm run watch:fast
```

### Test a Specific Package

```bash
# Test only caspian-handler
npm run test -- --filter="caspian-handler"

# Test with coverage
npm run test:coverage
```

### Debug with VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Thought GPS",
      "program": "${workspaceFolder}/packages/api-gateway/src/index.ts",
      "outFiles": ["${workspaceFolder}/packages/*/dist/**/*.js"],
      "runtimeArgs": ["-r", "tsx/cjs"],
    }
  ]
}
```

### View Real-Time Logs

```bash
# Stream logs from Render
npm run logs:render --tail

# Search logs
npm run logs:render --search "ERROR"
```

---

## 🆘 Getting Help

### Documentation
- `/docs` folder in repo
- `ARCHITECTURE.md` for system overview
- `SECURITY.md` for security details
- `WORKFLOWS.md` for workflow examples

### Community
- **Caspian Discord**: https://discord.com/invite/A28qnkvgCM
- **Featherless Discord**: Check their site
- **GitHub Discussions**: Ask questions

### Issues
1. Search existing issues
2. Create detailed issue with:
   - Error message
   - Steps to reproduce
   - Your environment (OS, Node version, etc)

---

## 📝 Development Workflow

### Creating a Feature

```bash
# 1. Create feature branch
git checkout -b feat/my-feature

# 2. Make changes
# ... code code code ...

# 3. Test locally
npm run test

# 4. Commit with clear message
git commit -m "feat: add my feature"

# 5. Push and create PR
git push origin feat/my-feature
# GitHub shows PR link

# 6. After review, merge to main
# (GitHub Actions auto-deploys)
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (auto-format on save)
- **Linting**: ESLint (no warnings allowed)
- **Comments**: JSDoc on public APIs

---

## 🎯 Next Steps

1. **Clone the repo**
2. **Setup .env** with API keys
3. **Run locally**: `npm run dev`
4. **Send test thought** on Telegram
5. **Check logs**: `npm run logs`
6. **Read ARCHITECTURE.md**
7. **Explore workflows/** to understand intent flow
8. **Deploy to Render**
9. **Submit to hackathon!**

---

**Happy coding! 🚀**

Questions? Open an issue or ask in Caspian Discord.

