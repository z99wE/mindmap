// Billing Routes - Razorpay + RevenueCat integration
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// Tier configurations
const TIERS = {
  free: {
    name: 'Free',
    dailyRuns: 10,
    price: 0,
    features: ['10 runs/day', 'Your own API keys (required)', 'Basic memory graph', '15-day server storage vault', 'Local IndexedDB backup and import', 'Max 2 communication channels (Telegram + Email/Slack)'],
    description: 'Get started with local-first storage'
  },
  pro: {
    name: 'Explorer Plus',
    dailyRuns: 500,
    price: 15,
    features: ['500 runs/day', 'Fallback system keys pool (no keys needed)', 'Unlimited server storage (never purged)', 'Seamless laptop and phone synchronization', 'All communication channels (WhatsApp, Slack, Discord, Twitter)', 'Live web search', 'Priority support'],
    description: 'Cross-device cognitive co-processing'
  },
  managed: {
    name: 'Managed',
    dailyRuns: -1,
    price: 0,
    features: ['Unlimited runs', 'No API keys needed', 'Managed LLM infrastructure', 'Custom routing', 'SLA guarantee'],
    description: 'Coming Soon',
    comingSoon: true
  },
};

// GET /api/billing/tiers - get tier info
router.get('/tiers', (req, res) => {
  res.json({ tiers: TIERS });
});

// GET /api/billing/status - user billing status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tier, daily_runs_used, daily_runs_limit, total_credits,
              subscription_status, razorpay_customer_id
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    const user = result.rows[0];
    res.json({
      tier: user.tier,
      tierInfo: TIERS[user.tier] || TIERS.free,
      dailyRunsUsed: user.daily_runs_used,
      dailyRunsLimit: user.daily_runs_limit,
      dailyRunsRemaining: Math.max(0, user.daily_runs_limit - user.daily_runs_used),
      totalCredits: user.total_credits,
      subscriptionStatus: user.subscription_status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/create-order - create Razorpay order for credit purchase
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, type } = req.body; // amount in USD, type: 'credits' or 'subscription'
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const amountPaise = Math.round((amount || 1) * 100 * 83); // Convert USD to INR paise (approx)
    const runsToCredit = type === 'subscription' ? 500 : (amount || 1) * 50;

    // Create Razorpay order via API
    const orderResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `tg_${req.user.userId}_${Date.now()}`,
        notes: { userId: req.user.userId, type, runsToCredit },
      }),
    });

    if (!orderResp.ok) {
      const errText = await orderResp.text();
      return res.status(500).json({ error: 'Failed to create order: ' + errText });
    }

    const order = await orderResp.json();

    // Store pending transaction
    await pool.query(
      `INSERT INTO billing_transactions (user_id, type, amount, runs_credited, razorpay_order_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [req.user.userId, type || 'credit_purchase', amount || 1, runsToCredit, order.id]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      runsToCredit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/verify-payment - verify Razorpay payment signature
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get transaction details
    const txn = await pool.query(
      "SELECT * FROM billing_transactions WHERE razorpay_order_id = $1 AND user_id = $2 AND status = 'pending'",
      [razorpay_order_id, req.user.userId]
    );
    if (txn.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    const transaction = txn.rows[0];

    // Credit the runs and update transaction
    await pool.query(
      `UPDATE billing_transactions SET razorpay_payment_id = $1, razorpay_signature = $2,
       status = 'completed' WHERE id = $3`,
      [razorpay_payment_id, razorpay_signature, transaction.id]
    );

    if (transaction.type === 'subscription') {
      await pool.query(
        "UPDATE users SET tier = 'pro', daily_runs_limit = 500, subscription_status = 'active', updated_at = NOW() WHERE id = $1",
        [req.user.userId]
      );
    }

    await pool.query(
      'UPDATE users SET total_credits = total_credits + $1, updated_at = NOW() WHERE id = $2',
      [transaction.runs_credited, req.user.userId]
    );

    res.json({
      success: true,
      runsCredited: transaction.runs_credited,
      newTier: transaction.type === 'subscription' ? 'pro' : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/razorpay-webhook - Razorpay webhook handler
router.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = body.event;
    const payload = body.payload;

    if (event === 'subscription.activated') {
      const customerId = payload.subscription?.entity?.customer_id;
      if (customerId) {
        await pool.query(
          "UPDATE users SET tier = 'premium', daily_runs_limit = 500, subscription_status = 'active', updated_at = NOW() WHERE razorpay_customer_id = $1",
          [customerId]
        );
      }
    } else if (event === 'subscription.cancelled') {
      const customerId = payload.subscription?.entity?.customer_id;
      if (customerId) {
        await pool.query(
          "UPDATE users SET tier = 'free', daily_runs_limit = 10, subscription_status = 'cancelled', updated_at = NOW() WHERE razorpay_customer_id = $1",
          [customerId]
        );
      }
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Billing] Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/revenuecat-webhook - RevenueCat webhook
router.post('/revenuecat-webhook', async (req, res) => {
  try {
    // RevenueCat sends a bearer token in Authorization header for webhook verification
    if (REVENUECAT_WEBHOOK_SECRET) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
        console.warn('[RevenueCat] Webhook rejected: invalid authorization');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { event } = req.body;
    const subscriberId = req.body?.subscriber_id || req.body?.app_user_id;
    if (!subscriberId) return res.status(400).json({ error: 'Missing subscriber ID' });

    switch (event?.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await pool.query(
          "UPDATE users SET tier = 'premium', daily_runs_limit = 500, subscription_status = 'active', updated_at = NOW() WHERE revenuecat_subscriber_id = $1",
          [subscriberId]
        );
        break;
      case 'CANCELLATION':
      case 'EXPIRATION':
        await pool.query(
          "UPDATE users SET tier = 'free', daily_runs_limit = 10, subscription_status = 'expired', updated_at = NOW() WHERE revenuecat_subscriber_id = $1",
          [subscriberId]
        );
        break;
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[RevenueCat] Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const BOOSTERS = {
  compass: { name: 'Compass Booster', runs: 50, price: 2 },
  radar: { name: 'Radar Booster', runs: 100, price: 4 },
  sextant: { name: 'Sextant Booster', runs: 200, price: 7 }
};

// GET /api/billing/boosters - active boosters status
router.get('/boosters', authMiddleware, async (req, res) => {
  try {
    const activeResult = await pool.query(
      `SELECT id, bundle_name, total_runs, runs_used, expires_at, created_at
       FROM user_boosters 
       WHERE user_id = $1 AND expires_at > NOW() AND runs_used < total_runs
       ORDER BY expires_at`,
      [req.user.userId]
    );

    const count30d = await pool.query(
      `SELECT COUNT(*) FROM billing_transactions 
       WHERE user_id = $1 AND type = 'booster_purchase' AND status = 'completed' AND created_at > NOW() - INTERVAL '30 days'`,
      [req.user.userId]
    );

    res.json({
      boostersList: activeResult.rows,
      countLast30Days: parseInt(count30d.rows[0]?.count || '0'),
      config: BOOSTERS
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/buy-booster - buy a booster pack
router.post('/buy-booster', authMiddleware, async (req, res) => {
  try {
    const { bundleId } = req.body;
    const booster = BOOSTERS[bundleId];
    if (!booster) return res.status(400).json({ error: 'Invalid booster bundle ID' });

    const userRes = await pool.query('SELECT tier, daily_runs_used, daily_runs_limit FROM users WHERE id = $1', [req.user.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.tier === 'free') {
      return res.status(403).json({ error: 'Only paid Explorer Plus subscribers can activate Cognitive Navigation Boosters.' });
    }

    if (user.daily_runs_used < user.daily_runs_limit * 0.5) {
      return res.status(403).json({ error: 'You can only purchase a booster pack once you have consumed at least 50% of your daily Explorer Plus runs.' });
    }

    const count30d = await pool.query(
      `SELECT COUNT(*) FROM billing_transactions 
       WHERE user_id = $1 AND type = 'booster_purchase' AND status = 'completed' AND created_at > NOW() - INTERVAL '30 days'`,
      [req.user.userId]
    );
    const count = parseInt(count30d.rows[0]?.count || '0');
    if (count >= 3) {
      return res.status(403).json({ error: 'You have reached the maximum of 3 top-ups in any 30-day window. Please wait for the window to reset or contact support.' });
    }

    await pool.query(
      `INSERT INTO user_boosters (user_id, bundle_name, total_runs, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 days')`,
      [req.user.userId, booster.name, booster.runs]
    );

    await pool.query(
      `INSERT INTO billing_transactions (user_id, type, amount, runs_credited, status, metadata)
       VALUES ($1, 'booster_purchase', $2, $3, 'completed', $4)`,
      [req.user.userId, booster.price, booster.runs, JSON.stringify({ bundleId, expires_at: new Date(Date.now() + 15*24*60*60*1000).toISOString() })]
    );

    res.json({
      success: true,
      message: `${booster.name} successfully activated! ${booster.runs} runs added, expiring in 15 days.`,
      bundle: booster
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/history - transaction history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT type, amount, currency, runs_credited, status, created_at
       FROM billing_transactions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/subscribe - upgrade/downgrade tier
// Paid tiers require a completed Razorpay payment (create-order → verify-payment flow).
// Direct tier switching is ONLY allowed for downgrades (paid → free).
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || !TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });
    if (TIERS[tier].comingSoon) return res.status(400).json({ error: 'This tier is not available yet. Join the waitlist instead.' });

    const tierConfig = TIERS[tier];
    const isPaidUpgrade = tier === 'pro';

    // Check current user tier
    const currentUser = await pool.query('SELECT tier FROM users WHERE id = $1', [req.user.userId]);
    const currentTier = currentUser.rows[0]?.tier || 'free';

    // Downgrades are always allowed (paid → free)
    if (currentTier !== 'free' && tier === 'free') {
      // Allow downgrade — skip payment check
    } else if (isPaidUpgrade) {
      // Upgrading to a paid tier requires a completed payment transaction
      if (!RAZORPAY_KEY_ID) {
        return res.status(403).json({ error: 'Payment system not configured. Contact the administrator.' });
      }
      // Verify there's a completed payment for this user in the last hour
      const recentPayment = await pool.query(
        `SELECT id FROM billing_transactions
         WHERE user_id = $1 AND type = 'subscription' AND status = 'completed'
         AND created_at > NOW() - INTERVAL '1 hour' LIMIT 1`,
        [req.user.userId]
      );
      if (recentPayment.rows.length === 0) {
        return res.status(403).json({ error: 'Paid tiers require a completed payment. Use the checkout flow to upgrade.' });
      }
    } else {
      return res.status(403).json({ error: 'Invalid tier transition. Use the checkout flow to upgrade.' });
    }
    const result = await pool.query(
      `UPDATE users SET tier = $1, daily_runs_limit = $2, subscription_status = $3, updated_at = NOW()
       WHERE id = $4 RETURNING tier, daily_runs_limit`,
      [tier, tierConfig.dailyRuns, tier === 'free' ? 'none' : 'active', req.user.userId]
    );

    // Record transaction
    await pool.query(
      `INSERT INTO billing_transactions (user_id, type, amount, runs_credited, status, metadata)
       VALUES ($1, $2, $3, $4, 'completed', $5)`,
      [req.user.userId, 'subscription', tierConfig.price, 0, JSON.stringify({ tier, action: tier === 'free' ? 'downgrade' : 'upgrade' })]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/waitlist - join waitlist / newsletter updates
router.post('/waitlist', async (req, res) => {
  try {
    const { email, tier, name, country } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    
    let requestedTier = 'updates';
    if (tier === 'pro') requestedTier = 'pro_tier';
    else if (tier === 'managed') requestedTier = 'managed_tier';
    else if (tier === 'early_adopter') requestedTier = 'early_adopter';

    // Store in proper waitlist table and send confirmation email
    const insertResult = await pool.query(
      `INSERT INTO waitlist (email, name, plan, country)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET 
         plan = EXCLUDED.plan, 
         name = COALESCE(EXCLUDED.name, waitlist.name),
         country = COALESCE(EXCLUDED.country, waitlist.country)
       RETURNING id, email_sent`,
      [email.toLowerCase(), name || null, requestedTier, country || null]
    );

    // Admin notification (console + optional in-app)
    const isNewSignup = !insertResult.rows[0]?.email_sent;
    console.log(`[Waitlist] ${isNewSignup ? 'NEW' : 'UPDATE'}: ${email} → ${requestedTier}` + (name ? ` (${name})` : ''));

    // Store admin notification so it shows in the notifications feed
    try {
      const adminUser = await pool.query("SELECT id FROM users WHERE is_admin = true LIMIT 1");
      if (adminUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, channel, metadata)
           VALUES ($1, 'waitlist_signup', 'New Waitlist Signup', $2, 'admin', $3)`,
          [
            adminUser.rows[0].id,
            `${requestedTier.replace('_', ' ')}: ${email}` + (name ? ` (${name})` : ''),
            JSON.stringify({ email, name, tier: requestedTier, country }),
          ]
        );
      }
    } catch { /* notifications table may not exist */ }

    // Send confirmation email via Resend (non-blocking)
    if (!insertResult.rows[0]?.email_sent) {
      try {
        const { sendWaitlistConfirmation } = require('../mailer');
        sendWaitlistConfirmation({ email: email.toLowerCase(), name, plan: requestedTier })
          .then(async () => {
            await pool.query('UPDATE waitlist SET email_sent = true WHERE email = $1', [email.toLowerCase()]).catch(() => {});
          })
          .catch((e) => console.error('[Waitlist] Email failed:', e.message));
      } catch (e) { /* mailer unavailable */ }
    }

    let successMsg = `You're on the list! Check your email — we'll keep you updated with the latest news.`;
    if (requestedTier === 'early_adopter') {
      successMsg = `You're on the Early Adopter list! We'll notify you when spots open.`;
    } else if (requestedTier === 'pro_tier') {
      successMsg = `You're on the waitlist! Check your email — we'll let you know the moment Explorer Plus launches.`;
    } else if (requestedTier === 'managed_tier') {
      successMsg = `You're on the waitlist! Check your email — we'll let you know the moment Managed launches.`;
    }

    res.json({
      success: true,
      message: successMsg,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
