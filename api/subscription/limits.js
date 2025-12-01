/**
 * Subscription Limits Endpoint
 * GET /api/subscription/limits - Get subscription limits based on tier
 */

import { Subscription } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';

// Tier limits (matching extension config)
const TIER_LIMITS = {
  free: {
    tokensPerDay: 50000,
    tokensPerMonth: 1500000,
    maxTokensPerRequest: 2000,
    requestsPerDay: 10,
    requestsPerMonth: 300,
    recordingTimePerDay: 0,
    translationTimePerDay: 0,
    rateLimit: {
      requestsPerMinute: 2,
      requestsPerHour: 10
    },
    allowedModels: [
      'openai/gpt-3.5-turbo',
      'googleai/gemini-1.5-flash',
      'cerebras/llama-4-scout-17b-16e-instruct'
    ]
  },
  professional: {
    tokensPerDay: 500000,
    tokensPerMonth: 15000000,
    maxTokensPerRequest: 4000,
    requestsPerDay: 500,
    requestsPerMonth: 15000,
    recordingTimePerDay: 60,
    translationTimePerDay: 120,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100
    },
    allowedModels: [
      'openai/gpt-3.5-turbo',
      'openai/gpt-4',
      'openai/gpt-4o',
      'anthropic/claude-3-5-sonnet-20241022',
      'googleai/gemini-1.5-pro',
      'googleai/gemini-1.5-flash',
      'cerebras/llama-4-scout-17b-16e-instruct'
    ]
  },
  premium: {
    tokensPerDay: 2000000,
    tokensPerMonth: 60000000,
    maxTokensPerRequest: 8000,
    requestsPerDay: 2000,
    requestsPerMonth: 60000,
    recordingTimePerDay: 240,
    translationTimePerDay: 480,
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 500
    },
    allowedModels: ['*'] // All models
  },
  byok: {
    tokensPerDay: null,
    tokensPerMonth: null,
    maxTokensPerRequest: null,
    requestsPerDay: null,
    requestsPerMonth: null,
    recordingTimePerDay: null,
    translationTimePerDay: null,
    rateLimit: null,
    allowedModels: ['*'] // All models
  }
};

/**
 * GET /api/subscription/limits
 * Get subscription limits for current user
 */
export async function getSubscriptionLimits(req, res) {
  try {
    const user = req.user;

    // Get subscription
    let subscription = await Subscription.findByUserId(user.id);

    // Default to free if no subscription
    const tier = subscription?.tier || 'free';

    // Get limits for tier
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    return res.json({
      success: true,
      tier,
      limits
    });
  } catch (error) {
    console.error('[Subscription API] Error getting limits:', error);
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
        await getSubscriptionLimits(req, res);
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

