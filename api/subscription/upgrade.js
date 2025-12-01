/**
 * Subscription Upgrade Endpoint
 * POST /api/subscription/upgrade - Upgrade subscription tier
 */

import { Subscription } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';
import { commonValidators, validate } from '../../src/middleware/validation.js';
import { createCheckoutSession, getOrCreateCustomer } from '../../src/lib/stripe.js';

/**
 * POST /api/subscription/upgrade
 * Upgrade subscription tier
 * Creates Stripe checkout session and returns checkout URL
 */
export async function upgradeSubscription(req, res) {
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
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  // Apply auth middleware
  await verifyAuth(req, res, async () => {
    try {
      if (req.method === 'POST') {
        // Apply validation
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
    } catch (error) {
      // Error will be handled by error handler middleware
      throw error;
    }
  });
}

