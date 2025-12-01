/**
 * Daily Reset Cron Job
 * Vercel Cron Job endpoint
 * Runs daily at midnight UTC
 */

import { dailyReset } from '../../scripts/daily-reset.js';

export default async function handler(req, res) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid cron secret'
    });
  }

  try {
    await dailyReset();
    
    return res.json({
      success: true,
      message: 'Daily reset completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Daily reset error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'cron_error',
      message: error.message
    });
  }
}

