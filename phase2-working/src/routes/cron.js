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
    }

    const { pool, caspian } = req.app.locals;

    // 2. Trigger cognitive functions
    console.log('[Cron] Tick started');

    // These run asynchronously without blocking the response
    // if we wanted to block we would await Promise.all
    // For Vercel, we need to await them so the serverless function doesn't terminate early.
    await Promise.allSettled([
      processRevivals(pool, caspian),
      processHalfLifeEscalations(pool, caspian),
      processArchaeologyReports(pool, caspian),
      checkCommitmentWitnesses(pool, caspian),
      checkAndAlertDeparture(pool, caspian, null),
      checkDriftForAllUsers(pool, caspian, req.app.locals.llmRouter, null)
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
