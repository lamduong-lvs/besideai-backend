/**
 * Daily Reset Script
 * Resets daily usage limits (can be run as cron job)
 * Note: For Vercel, use Vercel Cron Jobs or external cron service
 */

import { query } from '../src/lib/db.js';

/**
 * Reset daily usage (optional - usage is tracked per day automatically)
 * This script can be used to archive old usage data or cleanup
 */
export async function dailyReset() {
  try {
    console.log('[Daily Reset] Starting daily reset...');

    // Usage is already tracked per day, so no reset needed
    // But we can archive old data or cleanup if needed

    // Example: Archive usage older than 90 days
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - 90);

    // This is optional - keep all usage data for analytics
    // If you want to archive, uncomment:
    /*
    const result = await query(
      `DELETE FROM usage WHERE date < $1`,
      [archiveDate.toISOString().split('T')[0]]
    );
    console.log(`[Daily Reset] Archived ${result.rowCount} old usage records`);
    */

    console.log('[Daily Reset] Daily reset completed');
  } catch (error) {
    console.error('[Daily Reset] Error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  dailyReset()
    .then(() => {
      console.log('[Daily Reset] Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Daily Reset] Failed:', error);
      process.exit(1);
    });
}

export { dailyReset };

