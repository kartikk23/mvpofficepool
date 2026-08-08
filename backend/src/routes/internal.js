const express = require('express');
const { checkAndSendEngagementReminder } = require('../utils/engagementReminder');
const { rolloverRecurringRides } = require('../utils/recurringRides');

const router = express.Router();

// ---------------- EXTERNAL CRON TICK ----------------
// Render's free tier puts the web service to sleep after ~15 min of no incoming
// traffic, which kills any in-process setInterval timer (the engagement reminder
// and recurring-ride rollover jobs both use one as a same-process fallback, but
// that only fires while something happens to keep the server awake anyway).
// Point an external scheduler (Render Cron Job, cron-job.org, GitHub Actions, etc.)
// at this endpoint every ~10-15 minutes — the HTTP request itself wakes the free
// tier back up, and this then runs the same checks the in-process timers do.
router.post('/tick', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (!process.env.INTERNAL_CRON_SECRET || secret !== process.env.INTERNAL_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await Promise.all([checkAndSendEngagementReminder(), rolloverRecurringRides()]);
    res.json({ message: 'ok', ranAt: new Date().toISOString() });
  } catch (err) {
    console.error('Internal tick failed', err);
    res.status(500).json({ error: 'Tick failed' });
  }
});

module.exports = router;
