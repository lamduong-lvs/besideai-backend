/**
 * Subscription Endpoints (Unified)
 * GET /api/subscription/status - Get subscription status
 * PUT /api/subscription/status - Update subscription status
 * GET /api/subscription/limits - Get subscription limits
 * POST /api/subscription/upgrade - Upgrade subscription
 * POST /api/subscription/cancel - Cancel subscription
 * POST /api/subscription/portal - Create portal session
 */

import { Subscription } from '../src/models/index.js';
import { verifyAuth } from '../src/middleware/auth.js';
import { subscriptionValidators, commonValidators, validate } from '../src/middleware/validation.js';
import { createCheckoutSession, createPortalSession, getOrCreateCustomer, cancelSubscription as cancelStripeSubscription } from '../src/lib/stripe.js';
import { SUBSCRIPTION_LIMITS } from '../src/config/subscription-limits.js';

/**
 * GET /api/subscription/status
 * Get subscription status for current user
 */
async function getSubscriptionStatus(req, res) {
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
async function updateSubscriptionStatus(req, res) {
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
 * GET /api/subscription/limits
 * Get subscription limits for current user
 */
async function getSubscriptionLimits(req, res) {
  try {
    const user = req.user;

    // Get subscription
    let subscription = await Subscription.findByUserId(user.id);

    // Default to free if no subscription
    const tier = subscription?.tier || 'free';

    // Get limits for tier
    const limits = SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.free;

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
 * POST /api/subscription/upgrade
 * Upgrade subscription tier
 */
async function upgradeSubscription(req, res) {
  try {
    const user = req.user;
    const { tier, billingCycle = 'monthly', successUrl, cancelUrl } = req.body;

    // Validate tier
    if (!['professional', 'premium'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Invalid tier. Must be professional or premium'
      });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Invalid billing cycle. Must be monthly or yearly'
      });
    }

    // Get existing subscription
    const existingSubscription = await Subscription.findByUserId(user.id);

    // If user already has an active paid subscription, return error
    if (existingSubscription && 
        existingSubscription.tier !== 'free' && 
        existingSubscription.status === 'active' &&
        existingSubscription.tier === tier) {
      return res.status(400).json({
        success: false,
        error: 'already_subscribed',
        message: `You already have an active ${tier} subscription`
      });
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      user,
      tier,
      billingCycle,
      successUrl: successUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/cancel`
    });

    // Return checkout URL
    return res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      message: 'Checkout session created. Redirect user to checkoutUrl to complete payment.'
    });
  } catch (error) {
    console.error('[Subscription API] Error upgrading subscription:', error);
    throw error;
  }
}

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
async function cancelSubscription(req, res) {
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
 * POST /api/subscription/portal
 * Create Stripe customer portal session
 */
async function createPortalSession(req, res) {
  try {
    const user = req.user;
    const { returnUrl } = req.body;

    // Get subscription
    const subscription = await Subscription.findByUserId(user.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'No subscription found'
      });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(user, subscription.stripeCustomerId);

    // Create portal session
    const session = await createPortalSession(
      user,
      customer.id,
      returnUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/account`
    );

    return res.json({
      success: true,
      portalUrl: session.url,
      message: 'Portal session created. Redirect user to portalUrl to manage subscription.'
    });
  } catch (error) {
    console.error('[Subscription API] Error creating portal session:', error);
    throw error;
  }
}

/**
 * Vercel serverless function handler
 * Routes based on pathname
 */
export default async function handler(req, res) {
  try {
    console.log('[Subscription] Handler called. URL:', req.url, 'Method:', req.method);
    
    // Parse URL to get pathname BEFORE auth check
    // In Vercel, req.url contains the path
    let pathname = req.url || '';
    
    // Remove query string if present
    if (pathname.includes('?')) {
      pathname = pathname.split('?')[0];
    }
    
    // Extract endpoint from pathname (e.g., /api/subscription/status -> status)
    const endpoint = pathname.split('/').pop() || '';
    const hasStatus = pathname.includes('/status') || endpoint === 'status';
    const hasLimits = pathname.includes('/limits') || endpoint === 'limits';
    const hasUpgrade = pathname.includes('/upgrade') || endpoint === 'upgrade';
    const hasCancel = pathname.includes('/cancel') || endpoint === 'cancel';
    const hasPortal = pathname.includes('/portal') || endpoint === 'portal';
    
    console.log('[Subscription] Pathname:', pathname, 'Endpoint:', endpoint, 'hasStatus:', hasStatus);

    // Apply auth middleware
    // verifyAuth will return 401 if no token, so we need to handle that
    return await verifyAuth(req, res, async () => {
      try {

        // Route based on method and endpoint
        if (hasStatus) {
          if (req.method === 'GET') {
            await getSubscriptionStatus(req, res);
          } else if (req.method === 'PUT') {
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
        } else if (hasLimits) {
        if (req.method === 'GET') {
          await getSubscriptionLimits(req, res);
        } else {
          return res.status(405).json({
            success: false,
            error: 'method_not_allowed',
            message: `Method ${req.method} not allowed`
          });
        }
      } else if (hasUpgrade) {
        if (req.method === 'POST') {
          await commonValidators.tier.run(req);
          await commonValidators.billingCycle.run(req);
          await validate(req, res, async () => {
            await upgradeSubscription(req, res);
          });
        } else {
          return res.status(405).json({
            success: false,
            error: 'method_not_allowed',
            message: `Method ${req.method} not allowed`
          });
        }
      } else if (hasCancel) {
        if (req.method === 'POST') {
          await cancelSubscription(req, res);
        } else {
          return res.status(405).json({
            success: false,
            error: 'method_not_allowed',
            message: `Method ${req.method} not allowed`
          });
        }
      } else if (hasPortal) {
        if (req.method === 'POST') {
          await createPortalSession(req, res);
        } else {
          return res.status(405).json({
            success: false,
            error: 'method_not_allowed',
            message: `Method ${req.method} not allowed`
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          error: 'not_found',
          message: 'Subscription endpoint not found'
        });
      }
      } catch (error) {
        console.error('[Subscription] Routing error:', error);
        // Error will be handled by error handler middleware
        throw error;
      }
    });
  } catch (error) {
    console.error('[Subscription] Handler error:', error);
    // If error wasn't already handled by middleware, handle it here
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error.message || 'Internal server error'
      });
    }
  }
}

