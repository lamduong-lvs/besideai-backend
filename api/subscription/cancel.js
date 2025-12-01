/**
 * Subscription Cancel Endpoint
 * POST /api/subscription/cancel - Cancel subscription
 */

import { Subscription } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';
import { cancelSubscription as cancelStripeSubscription } from '../../src/lib/stripe.js';

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 * Cancels in Stripe and updates database
 */
export async function cancelSubscription(req, res) {
  try {
    const user = req.user;
    const { immediately = false } = req.body; // Cancel immediately or at period end

    // Get subscription
    const subscription = await Subscription.findByUserId(user.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'No subscription found'
      });
    }

    // If free subscription, just update status
    if (subscription.tier === 'free') {
      const cancelled = await Subscription.cancel(user.id);
      return res.json({
        success: true,
        subscription: cancelled,
        message: 'Subscription cancelled successfully'
      });
    }

    // If has Stripe subscription, cancel in Stripe
    if (subscription.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(subscription.stripeSubscriptionId, immediately);
        console.log('[Subscription API] Cancelled Stripe subscription:', subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('[Subscription API] Error cancelling Stripe subscription:', error);
        // Continue to update database even if Stripe cancel fails
      }
    }

    // Update database
    const cancelled = await Subscription.cancel(user.id);

    return res.json({
      success: true,
      subscription: cancelled,
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    console.error('[Subscription API] Error cancelling subscription:', error);
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
      if (req.method === 'POST') {
        await cancelSubscription(req, res);
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

