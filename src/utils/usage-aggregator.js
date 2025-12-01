/**
 * Usage Aggregator
 * Optimizes usage tracking with batching and aggregation
 */

import { Usage } from '../models/index.js';

// In-memory batch queue (for development)
// For production, consider using Redis or database queue
const usageBatch = new Map();
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds

/**
 * Add usage to batch queue
 * @param {string} userId - User ID
 * @param {Date|string} date - Date
 * @param {Object} increments - Usage increments
 */
export function addToBatch(userId, date, increments) {
  const dateStr = date instanceof Date 
    ? date.toISOString().split('T')[0]
    : date;
  
  const key = `${userId}:${dateStr}`;
  
  if (!usageBatch.has(key)) {
    usageBatch.set(key, {
      userId,
      date: dateStr,
      tokens: 0,
      requests: 0,
      recordingTime: 0,
      translationTime: 0
    });
  }

  const entry = usageBatch.get(key);
  entry.tokens += increments.tokens || 0;
  entry.requests += increments.requests || 0;
  entry.recordingTime += increments.recordingTime || 0;
  entry.translationTime += increments.translationTime || 0;
}

/**
 * Process batch queue
 * Flush accumulated usage to database
 */
export async function processBatch() {
  if (usageBatch.size === 0) {
    return;
  }

  const entries = Array.from(usageBatch.values());
  usageBatch.clear();

  console.log(`[Usage Aggregator] Processing ${entries.length} usage entries`);

  // Process in parallel
  await Promise.all(
    entries.map(entry => 
      Usage.upsert({
        userId: entry.userId,
        date: entry.date,
        tokens: entry.tokens,
        requests: entry.requests,
        recordingTime: entry.recordingTime,
        translationTime: entry.translationTime
      }).catch(error => {
        console.error(`[Usage Aggregator] Error processing entry:`, error);
      })
    )
  );
}

/**
 * Start batch processor
 * Processes batch queue periodically
 */
export function startBatchProcessor() {
  setInterval(async () => {
    try {
      await processBatch();
    } catch (error) {
      console.error('[Usage Aggregator] Error in batch processor:', error);
    }
  }, BATCH_INTERVAL);

  console.log('[Usage Aggregator] Batch processor started');
}

/**
 * Force flush batch
 * Immediately process all pending entries
 */
export async function flushBatch() {
  await processBatch();
}

/**
 * Get batch size
 */
export function getBatchSize() {
  return usageBatch.size;
}

