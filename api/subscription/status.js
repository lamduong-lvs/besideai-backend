/**
 * Subscription Status Endpoint
 * GET /api/subscription/status - Get subscription status
 * PUT /api/subscription/status - Update subscription status
 */

import { Subscription } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';
import { subscriptionValidators, validate } from '../../src/middleware/validation.js';

/**
 * GET /api/subscription/status
 * Get subscription status for current user
 */
export async function getSubscriptionStatus(req, res) {
  try {
    const user = req.user;

    // Get subscription
    let subscription = await Subscription.findByUserId(user.id);

    // If no subscription exists, create default free subscription
    if (!subscription) {
      subscription = await Subscription.create({
        userId: user.id,
        tier: 'free',
        status: 'active'
      });
    }

    return res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('[Subscription API] Error getting subscription:', error);
    throw error;
  }
}

/**
 * PUT /api/subscription/status
 * Update subscription status
 */
export async function updateSubscriptionStatus(req, res) {
  try {
    const user = req.user;
    const { tier, status, trialEndsAt, subscriptionEndsAt, billingCycle } = req.body;

    // Get existing subscription or create default
    let subscription = await Subscription.findByUserId(user.id);
    
    if (!subscription) {
      // Create new subscription
      subscription = await Subscription.create({
        userId: user.id,
        tier: tier || 'free',
        status: status || 'active',
        trialEndsAt,
        subscriptionEndsAt,
        billingCycle
      });
    } else {
      // Update existing subscription
      subscription = await Subscription.update(user.id, {
        tier,
        status,
        trialEndsAt,
        subscriptionEndsAt,
        billingCycle
      });
    }

    return res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('[Subscription API] Error updating subscription:', error);
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
        await getSubscriptionStatus(req, res);
      } else if (req.method === 'PUT') {
        // Apply validation
        await Promise.all(subscriptionValidators.map(validator => validator.run(req)));
        await validate(req, res, async () => {
          await updateSubscriptionStatus(req, res);
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

