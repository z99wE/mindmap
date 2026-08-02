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
  free: { name: 'Free', dailyRuns: 10, price: 0, features: ['Basic memory', 'Shared LLM pool', '10 runs/day'] },
  premium: { name: 'Premium', dailyRuns: 500, price: 5, features: ['Full memory graph', 'BYO API keys', '500 runs/day', 'All cognitive features', 'Priority support'] },
  enterprise: { name: 'Enterprise', dailyRuns: -1, price: 0, features: ['Unlimited runs', 'Custom LLM routing', 'Dedicated support', 'SLA guarantee', 'Coming Soon'] },
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
        "UPDATE users SET tier = 'premium', daily_runs_limit = 500, subscription_status = 'active', updated_at = NOW() WHERE id = $1",
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
      newTier: transaction.type === 'subscription' ? 'premium' : undefined,
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

module.exports = router;
