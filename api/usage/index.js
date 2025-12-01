/**
 * Usage Endpoints
 * GET /api/usage - Get usage data
 * POST /api/usage/sync - Sync usage data
 */

import { Usage } from '../../src/models/index.js';
import { Subscription } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';
import { usageValidators, validate } from '../../src/middleware/validation.js';

/**
 * GET /api/usage
 * Get usage data for current user
 * Query params: period=day|month
 */
export async function getUsage(req, res) {
  try {
    const user = req.user;
    const period = req.query.period || 'day'; // 'day' or 'month'

    // Get subscription for limits
    const subscription = await Subscription.findByUserId(user.id);
    const tier = subscription?.tier || 'free';

    let usageData;
    let totals;

    if (period === 'day') {
      // Get today's usage
      usageData = await Usage.getTodayUsage(user.id);
      
      totals = {
        tokens: usageData.tokens || 0,
        requests: usageData.requests || 0,
        recordingTime: usageData.recordingTime || 0,
        translationTime: usageData.translationTime || 0
      };
    } else if (period === 'month') {
      // Get monthly usage
      const today = new Date();
      const month = today.toISOString().substring(0, 7); // YYYY-MM
      
      totals = await Usage.getMonthUsage(user.id, month);
      
      // Get all days in month for detailed view
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      usageData = await Usage.getUsageRange(user.id, startDate, endDate);
    } else {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Invalid period. Must be "day" or "month"'
      });
    }

    // Get limits based on tier (simplified - full limits in limits endpoint)
    const limits = {
      tokensPerDay: tier === 'free' ? 50000 : tier === 'professional' ? 500000 : 2000000,
      requestsPerDay: tier === 'free' ? 10 : tier === 'professional' ? 500 : 2000
    };

    return res.json({
      success: true,
      period,
      tier,
      usage: totals || usageData,
      details: period === 'month' ? usageData : undefined,
      limits
    });
  } catch (error) {
    console.error('[Usage API] Error getting usage:', error);
    throw error;
  }
}

/**
 * POST /api/usage/sync
 * Sync usage data from extension
 * Backend-wins strategy: backend data takes precedence
 */
export async function syncUsage(req, res) {
  try {
    const user = req.user;
    const { date, tokens, requests, recordingTime, translationTime } = req.body;

    // Use today if date not provided
    const usageDate = date || new Date();

    // Upsert usage (backend-wins: set values, don't increment)
    const usage = await Usage.set({
      userId: user.id,
      date: usageDate,
      tokens: tokens || 0,
      requests: requests || 0,
      recordingTime: recordingTime || 0,
      translationTime: translationTime || 0
    });

    return res.json({
      success: true,
      usage,
      message: 'Usage synced successfully'
    });
  } catch (error) {
    console.error('[Usage API] Error syncing usage:', error);
    throw error;
  }
}

/**
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  // Apply auth middleware
  await verifyAuth(req, res, async () => {
    try {
      if (req.method === 'GET') {
        await getUsage(req, res);
      } else if (req.method === 'POST') {
        // Apply validation
        await Promise.all(usageValidators.map(validator => validator.run(req)));
        await validate(req, res, async () => {
          await syncUsage(req, res);
        });
      } else {
        return res.status(405).json({
          success: false,
          error: 'method_not_allowed',
          message: `Method ${req.method} not allowed`
        });
      }
    } catch (error) {
      // Error will be handled by error handler middleware
      throw error;
    }
  });
}

