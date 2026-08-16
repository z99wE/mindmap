// UnZonko - Server Shell
// Thin app shell that mounts route modules
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { runMigrations, pool } = require('./src/db');
const { ensureDevAdmin } = require('./src/dev-admin');
const { initLangfuse, flush } = require('./src/thought-tracer');
const { checkCommitmentWitnesses } = require('./features/commitment-witness');
const { createRelationshipAnchorEndpoints } = require('./features/relationship-anchor');
const { createDriftDetectorEndpoints } = require('./features/drift-detector');
const { createClassificationEndpoints } = require('./features/thought-classification');
const { createInvisibleChecklistEndpoints } = require('./features/invisible-checklist');
const { createDoorRuleEndpoints } = require('./features/door-rule');
const { auditMiddleware, sanitizeBody } = require('./src/middleware');
const { globalErrorHandler } = require('./src/middleware/errorHandler');
const { KeyPool } = require('./src/key-pool');

// ── Web Push (VAPID) Setup ────────────────────────────────────────────────
const webpush = require('web-push');
const vapidKeys = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  : webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@thoughtgps.local',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
// Export for use in notification delivery
// NOTE: must be attached AFTER `module.exports = app` below, otherwise the
// module.exports reassignment wipes them. We set them on `app` instead.
let sharedVapidKeys = vapidKeys;
let sharedWebpush = webpush;
function getSharedVapid() { return { vapidKeys: sharedVapidKeys, webpush: sharedWebpush }; }

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
// CORS: restrict in production, allow all in dev
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || false) // false = block all cross-origin
  : (process.env.FRONTEND_URL || '*');
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Global security headers
// NOTE: The frontend is an inline-style + inline-handler SPA (string-template pages
// with onclick= handlers) and loads Tailwind from CDN. helmet's strict defaults
// would block all of that, so we scope CSP to allow the app's actual needs while
// keeping XSS / MIME / framing protections on.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://fonts.googleapis.com'],
      scriptSrcAttr: ["'unsafe-inline'"], // the SPA uses inline onclick= handlers for navigation
      // 'https:' here is scoped: Tailwind CDN + Google Fonts CSS. 'https:' in styleSrc is
      // intentionally NOT used — we enumerate the two origins the app actually loads.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      // Browser never calls LLM/agent APIs directly (those are server-side) — the SPA
      // only fetches same-origin /api routes, so no wildcard https: needed here.
      connectSrc: ["'self'", 'https://cdn.tailwindcss.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'", 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// XSS sanitization on all request bodies
app.use('/api/', sanitizeBody);

// Audit logging for sensitive operations
app.use('/api/', auditMiddleware);

// Global rate limit: 100 requests per 15 min per IP
app.use('/api/', rateLimit({
  windowMs: 900000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

// ── Route Modules ───────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/auth');
const memoryRoutes = require('./src/routes/memory');
const processRoutes = require('./src/routes/process');
const featuresRoutes = require('./src/routes/features');
const billingRoutes = require('./src/routes/billing');
const keysRoutes = require('./src/routes/keys');
const channelsRoutes = require('./src/routes/channels');
const notificationsRoutes = require('./src/routes/notifications');
const locationRoutes = require('./src/routes/location');
const adminRoutes = require('./src/routes/admin');
const geofencesRoutes = require('./src/routes/geofences');
const cronRoutes = require('./src/routes/cron');
const { createAgentReachEndpoints } = require('./agent-reach-integration');

app.use('/api/auth', authRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/process', processRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geofences', geofencesRoutes);
app.use('/api/cron', cronRoutes);

// Agent-Reach live data endpoints (DuckDuckGo, Wikipedia, Open-Meteo + Tavily/Firecrawl)
createAgentReachEndpoints(app);

// ── Health Check (MUST be registered before the SPA fallback) ───────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    uptime: process.uptime(),
    env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  });
});

// ── Static Frontend (dev: Vite serves from src/frontend) ────────────────────
const frontendDist = path.join(__dirname, 'src/frontend/dist');
const frontendPublic = path.join(__dirname, 'src/frontend/public');
app.use(express.static(frontendPublic)); // sw.js at root
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  // SPA fallback: serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) res.status(200).json({ status: 'UnZonko API running', version: '3.0.0' });
    });
  } else {
    // Unknown API route → 404 JSON instead of hanging
    res.status(404).json({ error: `Unknown API endpoint: ${req.method} ${req.path}` });
  }
});

// ── Error Handler ───────────────────────────────────────────────────────────
app.use(globalErrorHandler);

// ── Start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    initLangfuse();

    // ── Local dev admin (never seeded in production) ───────────────────────
    // Guarantees you can always sign in as admin on local-network deployments.
    try {
      const devAdmin = await ensureDevAdmin();
      if (devAdmin) {
        console.log('[DEV] Local admin account ready — sign in via the Auth page');
        console.log(`[DEV]   email:    ${devAdmin.email}`);
        console.log(`[DEV]   password: ${devAdmin.password}`);
        console.log("[DEV]   (only exists outside production — deployed instances have no admin)");
      }
    } catch (e) {
      console.warn('[DEV] Admin seed skipped:', e.message);
    }

    // Production safety: never seed, and warn loudly if an admin row exists
    // (e.g. a snapshot of a local dev DB was deployed by mistake). Read-only.
    if (process.env.NODE_ENV === 'production') {
      try {
        const { rows } = await pool.query(
          'SELECT COUNT(*)::int AS n FROM users WHERE is_admin = true'
        );
        if (rows[0]?.n > 0) {
          console.warn(`[SECURITY] ${rows[0].n} admin account(s) exist in production. Deployed instances should have no admin — restore a clean database or demote them.`);
        }
      } catch (e) { /* ignore */ }
    }

    // ── PulseKit: ThoughtGPS native multi-channel messenger (PRIMARY) ─────────
    // Zero external SDK dependency. Works without any API key.
    // Channels activated via env vars — all free, all self-owned.
    const { createPulseKit } = require('./src/pulsekit/index');
    const pulseKit = await createPulseKit(pool, webpush, vapidKeys);

    // ── Caspian SDK: optional enriched fallback (secondary) ───────────────────
    // If CASPIAN_API_KEY is present, Caspian runs alongside PulseKit.
    // If Caspian ever goes down, PulseKit already handles everything.
    let caspianFallback = null;
    if (process.env.CASPIAN_API_KEY) {
      try {
        const { createCaspianClient } = require('./src/caspian-client');
        caspianFallback = await createCaspianClient(pool);
        console.log('[Server] Caspian SDK loaded as secondary fallback');
      } catch (e) {
        console.warn('[Server] Caspian SDK failed to load (not critical — PulseKit handles delivery):', e.message);
      }
    }

    // ── Unified messenger: PulseKit first, Caspian if PulseKit has no channel ─
    // All existing route code calls app.locals.caspian.send() — interface unchanged.
    const caspian = {
      // Forward all sends to PulseKit
      send: async (opts) => {
        try {
          const result = await pulseKit.send(opts);
          if (result.via !== 'db-only') return result;
        } catch (e) {
          console.warn('[Messenger] PulseKit send failed, trying Caspian fallback:', e.message);
        }
        // If PulseKit had no channel driver, try Caspian
        if (caspianFallback) {
          return caspianFallback.send(opts);
        }
      },
      broadcast: pulseKit.broadcast.bind(pulseKit),
      schedule:  pulseKit.schedule.bind(pulseKit),
      onInbound: pulseKit.onInbound.bind(pulseKit),
      startListening: pulseKit.startListening.bind(pulseKit),
      status: pulseKit.status.bind(pulseKit),
      get isLive() { return pulseKit.isLive || (caspianFallback?.isLive ?? false); },
      get channels() { return [...pulseKit.channels, ...(caspianFallback?.channels ?? [])]; },
      // Legacy Caspian compat
      getUserConnection: caspianFallback?.getUserConnection ?? (() => null),
    };

    // Expose on app for use in route handlers (same API as before — no route changes needed)
    app.locals.caspian = caspian;
    app.locals.pulseKit = pulseKit;
    app.locals.pool = pool;
    app.set('caspian', caspian);

    const keyPool = new KeyPool();
    const llmRouter = async (payload) => {
      const keyData = keyPool.getNextKey('groq') || keyPool.getNextKey('openai');
      if (!keyData) throw new Error('No LLM API key available');
      
      const provider = keyData.provider;
      const apiKey = keyData.key;
      
      const hostname = provider === 'groq' ? 'api.groq.com' : 'api.openai.com';
      const path = provider === 'groq' ? '/openai/v1/chat/completions' : '/v1/chat/completions';
      const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
      
      const body = JSON.stringify({
        model,
        messages: payload.messages,
        max_tokens: payload.max_tokens || 1024,
        temperature: payload.temperature || 0.7,
      });

      return new Promise((resolve, reject) => {
        const request = https.request({
          hostname,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        request.on('error', reject);
        request.write(body);
        request.end();
      });
    };
    app.locals.llmRouter = llmRouter;

    // Mount additional cognitive endpoints
    createRelationshipAnchorEndpoints(app, pool, llmRouter);
    createDriftDetectorEndpoints(app, pool, caspian, llmRouter);
    createClassificationEndpoints(app, pool, llmRouter);
    createInvisibleChecklistEndpoints(app, pool, caspian);
    createDoorRuleEndpoints(app, pool, caspian);

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
      if (!process.env.API_KEY_ENCRYPTION_SECRET) throw new Error('FATAL: API_KEY_ENCRYPTION_SECRET environment variable is missing in production.');
      if (!process.env.DATABASE_URL) throw new Error('FATAL: DATABASE_URL is missing in production.');
    } else {
      if (!process.env.JWT_SECRET) console.warn('[SECURITY] Using default JWT_SECRET! Set JWT_SECRET env var in production.');
      if (!process.env.API_KEY_ENCRYPTION_SECRET) console.warn('[SECURITY] Using default API_KEY_ENCRYPTION_SECRET! Set env var in production.');
      if (!process.env.DATABASE_URL) console.warn('[SECURITY] No DATABASE_URL set — using localhost.');
    }

    console.log('[Cognitive Crons] Native Vercel/GitHub Action cron endpoint mounted at /api/cron/tick');

    // Start background autonomous agent (Phase 4 requirement)
    const { OrchestratorManager } = require('./orchestrator');
    const orchestratorManager = new OrchestratorManager(pool, keyPool);
    orchestratorManager.startAutonomousAgent(caspian);

    // Start listening for inbound messages (Telegram polling, etc.)
    caspian.startListening();

    caspian.onInbound(async ({ from, message, channel, reply }) => {
      console.log(`[Inbound] ${channel} message from ${from}: ${message}`);
      
      try {
        const result = await pool.query('SELECT user_id, credentials FROM channels WHERE platform = $1 AND is_active = true', [channel]);
        
        let userId = null;
        for (const row of result.rows) {
          try {
            const { decrypt } = require('./src/crypto');
            const creds = JSON.parse(decrypt(row.credentials));
            if (creds.recipient_id === from || creds.channel_id === from) {
              userId = row.user_id;
              break;
            }
          } catch (e) { /* ignore */ }
        }

        if (userId) {
          const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          if (userRes.rows.length > 0) {
            const userObj = userRes.rows[0];
            await reply(`Processing thought...`);
            const finalState = await orchestratorManager.runWorkflow(userId, message, userObj);
            if (finalState.finalResponse) {
               await reply(finalState.finalResponse);
            } else {
               await reply(`Thought logged to memory graph.`);
            }
          }
        } else {
          console.log(`[Inbound] Unknown sender ${from} on ${channel}`);
          await reply(`UnZonko: I don't recognize this channel/user ID (${from}). Please connect this ID in your Mission Control.`);
        }
      } catch (err) {
        console.error('[Inbound Error]', err.message);
      }
    });

    // Mount public webhook endpoints for channels that require them (Slack)
    app.post('/api/webhooks/slack', express.json(), async (req, res) => {
      try {
        const payload = req.body;
        
        // Always respond to the URL verification challenge immediately
        if (payload.type === 'url_verification') {
          return res.status(200).send(payload.challenge);
        }

        // The handleWebhookEvent logic in PulseKit will handle message callbacks
        // Note: For User-provided Slack bots, we might need to route this differently
        // since globalChannels won't have it.
        const response = await caspian.handleWebhookEvent('slack', payload);
        if (response) {
          res.json(response);
        } else {
          res.status(200).send('OK');
        }
      } catch (e) {
        console.error('[Slack Webhook Error]', e.message);
        res.status(500).send('Error');
      }
    });

    app.listen(PORT, () => {
      console.log(`[UnZonko] Server running on port ${PORT}`);
      console.log(`[UnZonko] Frontend: http://localhost:${PORT}`);
      console.log(`[UnZonko] API: http://localhost:${PORT}/api/health`);

      // Start background keep-alive ping loop for Render free tier
      const externalUrl = process.env.RENDER_EXTERNAL_URL;
      if (externalUrl) {
        console.log(`[Keep-Alive] Render host detected: ${externalUrl}. Starting self-ping loop...`);
        setInterval(async () => {
          try {
            const res = await fetch(`${externalUrl}/api/health`);
            console.log(`[Keep-Alive] Self-ping status: ${res.status}`);
          } catch (e) {
            console.error(`[Keep-Alive] Self-ping failed:`, e.message);
          }
        }, 10 * 60 * 1000); // Ping every 10 minutes (Render sleep threshold is 15 minutes)
      }
    });
  } catch (err) {
    console.error('[UnZonko] Startup failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('[UnZonko] Fatal error in production. Exiting.');
      process.exit(1);
    }
    // Start without DB in dev mode
    app.listen(PORT, () => {
      console.log(`[UnZonko] Server running (no DB) on port ${PORT}`);
    });
  }
}

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnZonko] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[UnZonko] Shutting down...');
  await flush();
  process.exit(0);
});

// Attach shared services to the exported app (set after module.exports = app)
app.locals.vapidKeys = vapidKeys;
app.locals.webpush = webpush;
app.locals.getSharedVapid = getSharedVapid;

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.vapidKeys = vapidKeys;
module.exports.webpush = webpush;
module.exports.getSharedVapid = getSharedVapid;
