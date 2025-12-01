/**
 * Analytics Utilities
 * Usage analytics and reporting
 */

import { Usage } from '../models/index.js';
import { Subscription } from '../models/index.js';

/**
 * Get usage statistics for a user
 * @param {string} userId - User ID
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<Object>} Usage statistics
 */
export async function getUserUsageStats(userId, startDate, endDate) {
  const usageRecords = await Usage.getUsageRange(userId, startDate, endDate);
  const subscription = await Subscription.findByUserId(userId);
  const tier = subscription?.tier || 'free';

  // Calculate totals
  const totals = usageRecords.reduce((acc, record) => {
    acc.tokens += record.tokens || 0;
    acc.requests += record.requests || 0;
    acc.recordingTime += record.recordingTime || 0;
    acc.translationTime += record.translationTime || 0;
    return acc;
  }, {
    tokens: 0,
    requests: 0,
    recordingTime: 0,
    translationTime: 0
  });

  // Calculate averages
  const days = usageRecords.length || 1;
  const averages = {
    tokensPerDay: Math.round(totals.tokens / days),
    requestsPerDay: Math.round(totals.requests / days),
    recordingTimePerDay: Math.round(totals.recordingTime / days),
    translationTimePerDay: Math.round(totals.translationTime / days)
  };

  // Get limits
  const limits = {
    tokensPerDay: tier === 'free' ? 50000 : tier === 'professional' ? 500000 : 2000000,
    requestsPerDay: tier === 'free' ? 10 : tier === 'professional' ? 500 : 2000
  };

  // Calculate usage percentages
  const percentages = {
    tokens: limits.tokensPerDay > 0 
      ? Math.min(100, Math.round((totals.tokens / (limits.tokensPerDay * days)) * 100))
      : 0,
    requests: limits.requestsPerDay > 0
      ? Math.min(100, Math.round((totals.requests / (limits.requestsPerDay * days)) * 100))
      : 0
  };

  return {
    period: {
      startDate,
      endDate,
      days
    },
    tier,
    totals,
    averages,
    limits,
    percentages,
    records: usageRecords.length
  };
}

/**
 * Get daily usage trend
 * @param {string} userId - User ID
 * @param {number} days - Number of days
 * @returns {Promise<Array>} Daily usage array
 */
export async function getDailyUsageTrend(userId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const usageRecords = await Usage.getUsageRange(userId, startDate, endDate);

  // Create map for quick lookup
  const usageMap = new Map();
  usageRecords.forEach(record => {
    usageMap.set(record.date, record);
  });

  // Generate array for all days
  const trend = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const record = usageMap.get(dateStr);
    trend.push({
      date: dateStr,
      tokens: record?.tokens || 0,
      requests: record?.requests || 0,
      recordingTime: record?.recordingTime || 0,
      translationTime: record?.translationTime || 0
    });
  }

  return trend;
}

