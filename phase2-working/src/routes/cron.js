const express = require('express');
const { processRevivals } = require('../../features/thought-interceptor');
const { processHalfLifeEscalations } = require('../../features/thought-half-life');
const { processArchaeologyReports } = require('../../features/thought-archaeology');
const { checkCommitmentWitnesses } = require('../../features/commitment-witness');
const { checkAndAlertDeparture } = require('../../features/time-blindness');
const { checkDriftForAllUsers } = require('../../features/drift-detector');

const router = express.Router();

router.get('/tick', async (req, res) => {
  try {
    // 1. Secure endpoint with simple bearer token or secret header
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // CRITICAL: In production, CRON_SECRET MUST be set.
      // Without it, anyone can trigger cron jobs (data deletion, etc.)
      console.error('[CRON] SECURITY: CRON_SECRET not set in production! Rejecting request.');
      return res.status(503).json({ error: 'Cron not configured' });
    } else {
      console.warn('[CRON] CRON_SECRET not set — allowing in development mode');
    }

	    const { pool, pulseKit } = req.app.locals;

	    // 2. Trigger cognitive functions
	    console.log('[Cron] Tick started');

	    // These run asynchronously without blocking the response
	    // if we wanted to block we would await Promise.all
	    // For Vercel, we need to await them so the serverless function doesn't terminate early.
	    await Promise.allSettled([
	      processRevivals(pool, pulseKit),
	      processHalfLifeEscalations(pool, pulseKit),
	      processArchaeologyReports(pool, pulseKit),
	      checkCommitmentWitnesses(pool, pulseKit),
	      checkAndAlertDeparture(pool, pulseKit, null),
	      checkDriftForAllUsers(pool, pulseKit, req.app.locals.llmRouter, null)
	    ]);

    // Also run daily cleanup task if it's past midnight UTC (or simply on every tick, it's idempotent for 7-day-old data)
    // To be safe and keep it lightweight on every tick, we just run it.
    try {
      const purgeRes = await pool.query("DELETE FROM memory_graph WHERE created_at < NOW() - INTERVAL '7 days'");
      if (purgeRes.rowCount > 0) {
        console.log(`[Storage Cleanup] Purged ${purgeRes.rowCount} memories older than 7 days to conserve database space.`);
      }
    } catch (err) {
      console.error('[Storage Cleanup] Error:', err.message);
    }

    console.log('[Cron] Tick finished');

    // 3. Return success
    res.json({ success: true, message: 'Cron processed successfully' });
  } catch (error) {
    console.error('[Cron] Error processing tick:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
