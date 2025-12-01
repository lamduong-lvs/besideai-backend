/**
 * Usage Routes (for standalone server)
 * Express router for usage endpoints
 */

import express from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { usageValidators, validate } from '../middleware/validation.js';
import { Usage } from '../models/index.js';
import { Subscription } from '../models/index.js';

const router = express.Router();

/**
 * GET /api/usage
 * Get usage data
 * Query: period=day|month
 */
router.get('/', verifyAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const period = req.query.period || 'day';

    const subscription = await Subscription.findByUserId(user.id);
    const tier = subscription?.tier || 'free';

    let usageData;
    let totals;

    if (period === 'day') {
      usageData = await Usage.getTodayUsage(user.id);
      totals = {
        tokens: usageData.tokens || 0,
        requests: usageData.requests || 0,
        recordingTime: usageData.recordingTime || 0,
        translationTime: usageData.translationTime || 0
      };
    } else if (period === 'month') {
      const today = new Date();
      const month = today.toISOString().substring(0, 7);
      
      totals = await Usage.getMonthUsage(user.id, month);
      
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

    const limits = {
      tokensPerDay: tier === 'free' ? 50000 : tier === 'professional' ? 500000 : 2000000,
      requestsPerDay: tier === 'free' ? 10 : tier === 'professional' ? 500 : 2000
    };

    res.json({
      success: true,
      period,
      tier,
      usage: totals || usageData,
      details: period === 'month' ? usageData : undefined,
      limits
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/usage/sync
 * Sync usage data
 */
router.post('/sync',
  verifyAuth,
  usageValidators,
  validate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const { date, tokens, requests, recordingTime, translationTime } = req.body;
      const usageDate = date || new Date();

      const usage = await Usage.set({
        userId: user.id,
        date: usageDate,
        tokens: tokens || 0,
        requests: requests || 0,
        recordingTime: recordingTime || 0,
        translationTime: translationTime || 0
      });

      res.json({
        success: true,
        usage,
        message: 'Usage synced successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

