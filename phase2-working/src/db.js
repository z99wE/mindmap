// Database connection pool + auto-migrations
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/thought_gps',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Run all migrations on startup
async function runMigrations(retries = 5) {
  let client;
  while (retries > 0) {
    try {
      client = await pool.connect();
      break; // Successfully connected
    } catch (err) {
      console.error('[DB] Connection failed:', err);
      retries -= 1;
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, 5000)); // wait 5s before retrying
    }
  }

  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector').catch(e => console.warn('[DB] Warning: Could not create vector extension:', e.message));

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'managed', 'premium', 'enterprise', 'admin')),
        daily_runs_used INT DEFAULT 0,
        daily_runs_limit INT DEFAULT 10,
        total_credits INT DEFAULT 0,
        api_keys JSONB DEFAULT '{}',
        notification_prefs JSONB DEFAULT '{}',
        witness_contacts JSONB DEFAULT '[]',
        location JSONB DEFAULT '{}',
        is_admin BOOLEAN DEFAULT false,
        razorpay_customer_id VARCHAR(255),
        revenuecat_subscriber_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'none',
        last_run_reset TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for users
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // Memory graph table (knowledge graph + Phase 8 columns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_graph (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        source VARCHAR(100) DEFAULT 'user',
        category VARCHAR(100),
        importance FLOAT DEFAULT 0.5,
        access_count INT DEFAULT 0,
        embedding vector(1536),
        -- Phase 8 cognitive columns
        cognitive_load VARCHAR(50),
        theme VARCHAR(100),
        half_life_hours FLOAT,
        urgency_tier VARCHAR(20),
        decay_status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMPTZ,
        escalated_at TIMESTAMPTZ,
        commitment_deadline TIMESTAMPTZ,
        commitment_witness TEXT,
        commitment_fulfilled BOOLEAN DEFAULT false,
        brain_area VARCHAR(50),
        emotional_tone VARCHAR(50),
        related_person VARCHAR(255),
        location_tag VARCHAR(255),
        drift_score FLOAT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for memory_graph
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_graph(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_graph(user_id, category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_decay ON memory_graph(user_id, decay_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_commitment ON memory_graph(user_id, commitment_deadline)');
    await client.query('ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ').catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_expires ON memory_graph(user_id, expires_at)').catch(() => {});

    // Create vector index for similarity search (ivfflat, requires at least 1000 rows to be effective)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_embedding
      ON memory_graph USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)
    `).catch(() => {}); // Ignore if not enough rows yet

    // Channels table (messaging platform config)
    await client.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        display_name VARCHAR(255),
        credentials TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        webhook_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, platform)
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        channel VARCHAR(50) DEFAULT 'browser',
        title VARCHAR(255),
        message TEXT NOT NULL,
        delivered BOOLEAN DEFAULT false,
        read BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        sent_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, read)');

    // Billing transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'USD',
        runs_credited INT DEFAULT 0,
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        revenuecat_transaction_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_transactions(user_id)');

    // API key audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_key_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        action VARCHAR(20) NOT NULL,
        masked_key VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // User boosters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_boosters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        bundle_name VARCHAR(50) NOT NULL,
        total_runs INT NOT NULL,
        runs_used INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_boosters_user ON user_boosters(user_id)');

    // ── Migrate old tier names to new ones ──────────────────────────────────────
    await client.query("UPDATE users SET tier = 'pro' WHERE tier = 'premium'").catch(() => {});
    await client.query("UPDATE users SET tier = 'managed' WHERE tier = 'enterprise'").catch(() => {});

    // ── Phase 8 feature columns (ALTER TABLE for existing installs) ─────────────
    const alterCols = [
      // Columns referenced by process.js / memory.js that must exist
      "ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS entity VARCHAR(100) DEFAULT 'user'",
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS attribute VARCHAR(255)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS value TEXT',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS deadline_epoch BIGINT',
      // Phase 8 feature columns
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_departure_brief_sent_at TIMESTAMPTZ',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS data_sharing BOOLEAN DEFAULT true',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS web_search BOOLEAN DEFAULT true',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS notified_tier INTEGER DEFAULT 0',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'pending\'',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS witness_contact TEXT',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS witness_notified BOOLEAN DEFAULT false',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS intent VARCHAR(100)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS llm_response TEXT',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS action_verb VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS is_actionable BOOLEAN DEFAULT false',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS context_note TEXT',
      // Geofences support
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS geofences JSONB DEFAULT \'[]\'',
      // New cognitive classification columns
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS cognitive_load VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS theme VARCHAR(100)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS brain_area VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS related_person VARCHAR(255)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS location_tag VARCHAR(255)',
      // Booster columns
      'ALTER TABLE user_boosters ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL \'30 days\'',
      // ── User Profile columns ──────────────────────────────────────────────────
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)',
    ];
    for (const sql of alterCols) {
      await client.query(sql).catch(() => {});
    }

    // Unique index on username (case-insensitive)
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(lower(username)) WHERE username IS NOT NULL').catch(() => {});

    // ── Waitlist table (early access signups from pricing page) ──────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'pro',
        email_sent BOOLEAN DEFAULT false,
        country VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await client.query('ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS country VARCHAR(100)').catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email)').catch(() => {});

    // ── Audit log table (tracks sensitive operations) ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)');

    // ── Thought Traces (replaces Langfuse) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS thought_traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id UUID NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID REFERENCES memory_graph(id) ON DELETE CASCADE,
        span_name VARCHAR(100),
        input JSONB,
        output JSONB,
        status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_traces_trace ON thought_traces(trace_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_traces_thought ON thought_traces(thought_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_traces_user ON thought_traces(user_id)');

    // ── Thought Revivals (Serverless Interceptor Queue) ─────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS thought_revivals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID REFERENCES memory_graph(id) ON DELETE CASCADE,
        thought JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, thought_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_revivals_user ON thought_revivals(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_revivals_expires ON thought_revivals(expires_at)');

    // ── Row-Level Security (defense-in-depth for user isolation) ───────────────
    // RLS ensures the DB itself blocks cross-user access even if app code has a bug.
    // The app sets app.user_id via SET LOCAL before queries.
    const rlsStatements = [
      'ALTER TABLE memory_graph ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE channels ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE notifications ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY',
      // Policies: allow access only when user_id matches the session variable
      `CREATE POLICY IF NOT EXISTS user_isolation_memory ON memory_graph
       USING (user_id::text = current_setting('app.user_id', true))`,
      `CREATE POLICY IF NOT EXISTS user_isolation_channels ON channels
       USING (user_id::text = current_setting('app.user_id', true))`,
      `CREATE POLICY IF NOT EXISTS user_isolation_notifications ON notifications
       USING (user_id::text = current_setting('app.user_id', true))`,
      `CREATE POLICY IF NOT EXISTS user_isolation_billing ON billing_transactions
       USING (user_id::text = current_setting('app.user_id', true))`,
      `CREATE POLICY IF NOT EXISTS user_isolation_revivals ON thought_revivals
       USING (user_id::text = current_setting('app.user_id', true))`,
    ];
    for (const sql of rlsStatements) {
      await client.query(sql).catch(() => {}); // Ignore if already exist
    }

    // ── Audit log auto-prune (entries older than 30 days) ──────────────────────
    // Runs once on startup
    await client.query("DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '30 days'").catch(() => {});

    console.log('[DB] All migrations completed successfully');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Daily run reset cron (runs every hour, resets users whose last_run_reset > 24h ago)
async function resetDailyRuns() {
  try {
    const result = await pool.query(`
      UPDATE users
      SET daily_runs_used = 0, last_run_reset = NOW()
      WHERE last_run_reset < NOW() - INTERVAL '24 hours'
    `);
    if (result.rowCount > 0) {
      console.log(`[DB] Reset daily runs for ${result.rowCount} users`);
    }
  } catch (err) {
    console.error('[DB] Daily run reset error:', err.message);
  }
}

// Note: resetDailyRuns is now executed by the native /api/cron/tick serverless endpoint

module.exports = { pool, runMigrations, resetDailyRuns };
