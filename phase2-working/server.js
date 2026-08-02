// Thought GPS - Server Shell
// Thin app shell that mounts route modules
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { runMigrations } = require('./src/db');
const { initLangfuse, flush } = require('./src/langfuse');
const { setupHalfLifeCron } = require('./features/thought-half-life');
const { setupArchaeologyCron } = require('./features/thought-archaeology');
const { checkCommitmentWitnesses } = require('./features/commitment-witness');
const { setupRevivalCron } = require('./features/thought-interceptor');
const { auditMiddleware, sanitizeBody } = require('./src/middleware');

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
module.exports.vapidKeys = vapidKeys;
module.exports.webpush = webpush;

const app = express();
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

// Agent-Reach live data endpoints (DuckDuckGo, Wikipedia, Open-Meteo + Tavily/Firecrawl)
createAgentReachEndpoints(app);

// ── Static Frontend (dev: Vite serves from src/frontend) ────────────────────
const frontendDist = path.join(__dirname, 'src/frontend/dist');
const frontendPublic = path.join(__dirname, 'src/frontend/public');
app.use(express.static(frontendPublic)); // sw.js at root
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  // SPA fallback: serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) res.status(200).json({ status: 'Thought GPS API running', version: '3.0.0' });
    });
  }
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', uptime: process.uptime() });
});

// ── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server] Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    initLangfuse();

    // Start cognitive cron jobs
    const { pool } = require('./src/db');
    // Caspian stub: queries user's connected channels, delivers via all active ones
    const { sendWebPush } = require('./src/routes/notifications');
    const caspian = {
      send: async ({ channel, to, message }) => {
        // Query user's active channels
        try {
          const chResult = await pool.query(
            'SELECT platform, display_name FROM channels WHERE user_id = $1 AND is_active = true',
            [to]
          );
          if (chResult.rows.length > 0) {
            for (const ch of chResult.rows) {
              console.log(`[Caspian] ${ch.platform} -> ${to}: ${message?.slice(0, 80)}`);
              await pool.query(
                `INSERT INTO notifications (user_id, type, title, message, channel)
                 VALUES ($1, 'cognitive_nudge', $2, $3, $4)`,
                [to, `Nudge via ${ch.platform}`, message, ch.platform]
              ).catch(() => {});
            }
          } else {
            // No channels connected — fall back to browser notification
            console.log(`[Caspian] browser -> ${to}: ${message?.slice(0, 80)}`);
            await pool.query(
              `INSERT INTO notifications (user_id, type, title, message, channel)
               VALUES ($1, 'cognitive_nudge', $2, $3, 'browser')`,
              [to, 'Cognitive Nudge', message, 'browser']
            ).catch(() => {});
          }
          // Send web push notification
          await sendWebPush(to, {
            title: 'Thought GPS',
            body: message?.slice(0, 200) || 'New cognitive nudge',
            tag: 'cognitive-nudge',
            data: { url: '/' },
            vibrate: [100, 50, 100],
          }).catch(() => {});
        } catch {
          // DB may not be ready
          console.log(`[Caspian] ${channel} -> ${to}: ${message?.slice(0, 80)}`);
        }
      }
    };

    setupHalfLifeCron(pool, caspian);           // Every 30 min
    setupArchaeologyCron(pool, caspian);        // Hourly check for Sunday 8pm
    setupRevivalCron(pool, caspian);            // Every 5 min
    setInterval(async () => {
      await checkCommitmentWitnesses(pool, caspian);
    }, 60 * 60 * 1000); // Every hour

    if (!process.env.JWT_SECRET) console.warn('[SECURITY] Using default JWT_SECRET! Set JWT_SECRET env var in production.');
    if (!process.env.API_KEY_ENCRYPTION_SECRET) console.warn('[SECURITY] Using default API_KEY_ENCRYPTION_SECRET! Set env var in production.');
    if (!process.env.DATABASE_URL) console.warn('[SECURITY] No DATABASE_URL set — using localhost. Configure Neon.tech for production.');

    console.log('[Cognitive Crons] Half-life, Archaeology, Revival, Commitment Witness — started');

    app.listen(PORT, () => {
      console.log(`[Thought GPS] Server running on port ${PORT}`);
      console.log(`[Thought GPS] Frontend: http://localhost:${PORT}`);
      console.log(`[Thought GPS] API: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[Thought GPS] Startup failed:', err.message);
    // Start without DB in dev mode
    app.listen(PORT, () => {
      console.log(`[Thought GPS] Server running (no DB) on port ${PORT}`);
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Thought GPS] Shutting down...');
  await flush();
  process.exit(0);
});

start();

module.exports = app;
