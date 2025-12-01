/**
 * Subscription Portal Endpoint
 * POST /api/subscription/portal - Create Stripe customer portal session
 */

import { Subscription } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';
import { createPortalSession, getOrCreateCustomer } from '../../src/lib/stripe.js';

/**
 * POST /api/subscription/portal
 * Create Stripe customer portal session
 * Allows users to manage their subscription, payment methods, etc.
 */
export async function createPortalSession(req, res) {
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
 */
export default async function handler(req, res) {
  // Apply auth middleware
  await verifyAuth(req, res, async () => {
    try {
      if (req.method === 'POST') {
        await createPortalSession(req, res);
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

