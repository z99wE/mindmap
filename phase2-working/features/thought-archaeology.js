/**
 * Thought Archaeology (Weekly Regret Ledger) - Phase 8 Feature
 * 
 * Compiles a weekly summary of tasks that expired unacted,
 * sending a zero-judgment WhatsApp report to the user every Sunday at 8 PM.
 */

/**
 * Generate weekly thought archaeology report.
 * @param {object} pool - PostgreSQL pool connection
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} - Formatted WhatsApp text
 */
async function generateArchaeologyReport(pool, userId) {
  try {
    const res = await pool.query(
      `SELECT category, COUNT(*) as expired_count,
              MAX(value) as thought
       FROM memory_graph
       WHERE user_id = $1
         AND status = 'pending'
         AND expires_at < NOW()
         AND archived = false
       GROUP BY category`
    );

    if (res.rows.length === 0) {
      return null;
    }

    const lines = ['Your week in thoughts 🗺️'];
    let topThought = '';
    
    res.rows.forEach(row => {
      lines.push(`${row.category.charAt(0).toUpperCase() + row.category.slice(1)}: ${row.expired_count} thought(s) didn't move this week`);
      if (!topThought) {
        topThought = row.thought;
      }
    });

    if (topThought) {
      lines.push(`The one worth revisiting: ${topThought}`);
    }

    lines.push("Reply 'show me' to see all of them. Reply 'clear' to archive them.");
    return lines.join('\n');
  } catch (err) {
    console.error('[Archaeology] Error compiling report:', err.message);
    return null;
  }
}

/**
 * Processes archaeology reports for a single serverless tick.
 * Only sends reports if it is Sunday in the server's timezone.
 */
async function processArchaeologyReports(pool, caspian) {
  const now = new Date();
  // Serverless environments are UTC. 
  // We can just check if it's Sunday (0).
  // The exact hour will be controlled by the cron trigger (e.g. 20:00 UTC).
  if (now.getDay() === 0) {
    try {
      const usersRes = await pool.query(`SELECT DISTINCT user_id FROM memory_graph`);
      for (const user of usersRes.rows) {
        const report = await generateArchaeologyReport(pool, user.user_id);
        if (report && caspian) {
          try {
            await caspian.send({
              channel: 'whatsapp',
              to: user.user_id,
              message: report
            });
            console.log(`[Archaeology] Sent weekly regret ledger to ${user.user_id}`);
          } catch (e) {
            console.error(`[Archaeology] Failed to send report to ${user.user_id}:`, e.message);
          }
        }
      }
    } catch (err) {
      console.error('[Archaeology Cron] Error:', err.message);
    }
  }
}

module.exports = {
  generateArchaeologyReport,
  processArchaeologyReports
};
