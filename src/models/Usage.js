/**
 * Usage Model
 * Database operations for usage table
 */

import { query, getClient } from '../lib/db.js';

export class Usage {
  /**
   * Create or update usage record
   * @param {Object} usageData - Usage data
   * @param {string} usageData.userId - User UUID
   * @param {Date|string} usageData.date - Date (YYYY-MM-DD)
   * @param {number} usageData.tokens - Tokens used
   * @param {number} usageData.requests - Requests made
   * @param {number} usageData.recordingTime - Recording time in minutes
   * @param {number} usageData.translationTime - Translation time in minutes
   * @returns {Promise<Object>} Created or updated usage
   */
  static async upsert(usageData) {
    const {
      userId,
      date,
      tokens = 0,
      requests = 0,
      recordingTime = 0,
      translationTime = 0
    } = usageData;

    // Format date to YYYY-MM-DD
    const dateStr = date instanceof Date 
      ? date.toISOString().split('T')[0]
      : date;

    const result = await query(
      `INSERT INTO usage (user_id, date, tokens, requests, recording_time, translation_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, date)
       DO UPDATE SET
         tokens = usage.tokens + EXCLUDED.tokens,
         requests = usage.requests + EXCLUDED.requests,
         recording_time = usage.recording_time + EXCLUDED.recording_time,
         translation_time = usage.translation_time + EXCLUDED.translation_time,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, dateStr, tokens, requests, recordingTime, translationTime]
    );

    return this._formatUsage(result.rows[0]);
  }

  /**
   * Set usage values (replace, not increment)
   * @param {Object} usageData - Usage data
   * @returns {Promise<Object>} Updated usage
   */
  static async set(usageData) {
    const {
      userId,
      date,
      tokens = 0,
      requests = 0,
      recordingTime = 0,
      translationTime = 0
    } = usageData;

    const dateStr = date instanceof Date 
      ? date.toISOString().split('T')[0]
      : date;

    const result = await query(
      `INSERT INTO usage (user_id, date, tokens, requests, recording_time, translation_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, date)
       DO UPDATE SET
         tokens = EXCLUDED.tokens,
         requests = EXCLUDED.requests,
         recording_time = EXCLUDED.recording_time,
         translation_time = EXCLUDED.translation_time,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, dateStr, tokens, requests, recordingTime, translationTime]
    );

    return this._formatUsage(result.rows[0]);
  }

  /**
   * Find usage by user ID and date
   * @param {string} userId - User UUID
   * @param {Date|string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Usage or null
   */
  static async findByUserIdAndDate(userId, date) {
    const dateStr = date instanceof Date 
      ? date.toISOString().split('T')[0]
      : date;

    const result = await query(
      'SELECT * FROM usage WHERE user_id = $1 AND date = $2',
      [userId, dateStr]
    );

    return result.rows.length > 0 ? this._formatUsage(result.rows[0]) : null;
  }

  /**
   * Get today's usage
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Today's usage (or default if not found)
   */
  static async getTodayUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    const usage = await this.findByUserIdAndDate(userId, today);

    if (usage) {
      return usage;
    }

    // Return default if no usage record exists
    return {
      id: null,
      userId,
      date: today,
      tokens: 0,
      requests: 0,
      recordingTime: 0,
      translationTime: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get usage for a date range
   * @param {string} userId - User UUID
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Array of usage records
   */
  static async getUsageRange(userId, startDate, endDate) {
    const startStr = startDate instanceof Date 
      ? startDate.toISOString().split('T')[0]
      : startDate;
    const endStr = endDate instanceof Date 
      ? endDate.toISOString().split('T')[0]
      : endDate;

    const result = await query(
      `SELECT * FROM usage 
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [userId, startStr, endStr]
    );

    return result.rows.map(row => this._formatUsage(row));
  }

  /**
   * Get monthly usage totals
   * @param {string} userId - User UUID
   * @param {Date|string} month - Month (YYYY-MM) or date
   * @returns {Promise<Object>} Monthly totals
   */
  static async getMonthUsage(userId, month) {
    let monthStr;
    if (month instanceof Date) {
      monthStr = month.toISOString().substring(0, 7); // YYYY-MM
    } else if (month.includes('-') && month.length === 7) {
      monthStr = month; // Already YYYY-MM
    } else {
      // Assume it's a date string, extract month
      monthStr = month.substring(0, 7);
    }

    const result = await query(
      `SELECT 
         COALESCE(SUM(tokens), 0) as tokens,
         COALESCE(SUM(requests), 0) as requests,
         COALESCE(SUM(recording_time), 0) as recording_time,
         COALESCE(SUM(translation_time), 0) as translation_time
       FROM usage
       WHERE user_id = $1 AND date >= $2 AND date < $3`,
      [
        userId,
        `${monthStr}-01`,
        `${monthStr}-32` // Next month (will be clamped by PostgreSQL)
      ]
    );

    const row = result.rows[0];
    return {
      tokens: parseInt(row.tokens) || 0,
      requests: parseInt(row.requests) || 0,
      recordingTime: parseInt(row.recording_time) || 0,
      translationTime: parseInt(row.translation_time) || 0
    };
  }

  /**
   * Increment usage
   * @param {string} userId - User UUID
   * @param {Date|string} date - Date
   * @param {Object} increments - Values to increment
   * @returns {Promise<Object>} Updated usage
   */
  static async increment(userId, date, increments) {
    const {
      tokens = 0,
      requests = 0,
      recordingTime = 0,
      translationTime = 0
    } = increments;

    return await this.upsert({
      userId,
      date,
      tokens,
      requests,
      recordingTime,
      translationTime
    });
  }

  /**
   * Format usage from database row
   * @private
   */
  static _formatUsage(row) {
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      tokens: parseInt(row.tokens) || 0,
      requests: parseInt(row.requests) || 0,
      recordingTime: parseInt(row.recording_time) || 0,
      translationTime: parseInt(row.translation_time) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

