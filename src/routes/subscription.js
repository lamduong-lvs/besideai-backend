/**
 * Subscription Routes (for standalone server)
 * Express router for subscription endpoints
 */

import express from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { subscriptionValidators, commonValidators, validate } from '../middleware/validation.js';
import { Subscription } from '../models/index.js';
import { createCheckoutSession, cancelSubscription as cancelStripeSubscription, createPortalSession, getOrCreateCustomer } from '../lib/stripe.js';

const router = express.Router();

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
    allowedModels: ['*']
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
    allowedModels: ['*']
  }
};

/**
 * GET /api/subscription/status
 * Get subscription status
 */
router.get('/status', verifyAuth, async (req, res, next) => {
  try {
    const user = req.user;
    let subscription = await Subscription.findByUserId(user.id);

    if (!subscription) {
      subscription = await Subscription.create({
        userId: user.id,
        tier: 'free',
        status: 'active'
      });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/subscription/status
 * Update subscription status
 */
router.put('/status',
  verifyAuth,
  subscriptionValidators,
  validate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const { tier, status, trialEndsAt, subscriptionEndsAt, billingCycle } = req.body;

      let subscription = await Subscription.findByUserId(user.id);
      
      if (!subscription) {
        subscription = await Subscription.create({
          userId: user.id,
          tier: tier || 'free',
          status: status || 'active',
          trialEndsAt,
          subscriptionEndsAt,
          billingCycle
        });
      } else {
        subscription = await Subscription.update(user.id, {
          tier,
          status,
          trialEndsAt,
          subscriptionEndsAt,
          billingCycle
        });
      }

      res.json({
        success: true,
        subscription
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/subscription/limits
 * Get subscription limits
 */
router.get('/limits', verifyAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const subscription = await Subscription.findByUserId(user.id);
    const tier = subscription?.tier || 'free';
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    res.json({
      success: true,
      tier,
      limits
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade subscription
 * Creates Stripe checkout session
 */
router.post('/upgrade',
  verifyAuth,
  commonValidators.tier,
  commonValidators.billingCycle,
  validate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const { tier, billingCycle = 'monthly', successUrl, cancelUrl } = req.body;

      if (!['professional', 'premium'].includes(tier)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_request',
          message: 'Invalid tier. Must be professional or premium'
        });
      }

      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_request',
          message: 'Invalid billing cycle. Must be monthly or yearly'
        });
      }

      const existingSubscription = await Subscription.findByUserId(user.id);

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

      const session = await createCheckoutSession({
        user,
        tier,
        billingCycle,
        successUrl: successUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/cancel`
      });

      res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
        message: 'Checkout session created. Redirect user to checkoutUrl to complete payment.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', verifyAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const { immediately = false } = req.body;

    const subscription = await Subscription.findByUserId(user.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'No subscription found'
      });
    }

    if (subscription.tier === 'free') {
      const cancelled = await Subscription.cancel(user.id);
      return res.json({
        success: true,
        subscription: cancelled,
        message: 'Subscription cancelled successfully'
      });
    }

    if (subscription.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(subscription.stripeSubscriptionId, immediately);
        console.log('[Subscription API] Cancelled Stripe subscription:', subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('[Subscription API] Error cancelling Stripe subscription:', error);
      }
    }

    const cancelled = await Subscription.cancel(user.id);

    res.json({
      success: true,
      subscription: cancelled,
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscription/portal
 * Create Stripe customer portal session
 */
router.post('/portal', verifyAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const { returnUrl } = req.body;

    const subscription = await Subscription.findByUserId(user.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'No subscription found'
      });
    }

    const customer = await getOrCreateCustomer(user, subscription.stripeCustomerId);
    const session = await createPortalSession(
      user,
      customer.id,
      returnUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/account`
    );

    res.json({
      success: true,
      portalUrl: session.url,
      message: 'Portal session created. Redirect user to portalUrl to manage subscription.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

