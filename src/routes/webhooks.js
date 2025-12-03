/**
 * Webhook Routes (for standalone server)
 * Express router for webhook endpoints
 */

import express from 'express';
// TODO: Update to use Lemon Squeezy instead of Stripe
// import { verifyWebhookSignature } from '../lib/stripe.js';
import { verifyWebhookSignature } from '../lib/lemon-squeezy.js';
import { Subscription } from '../models/index.js';
import { User } from '../models/index.js';

const router = express.Router();

// Middleware to get raw body for Stripe webhook signature verification
router.use('/stripe', express.raw({ type: 'application/json' }));

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(event) {
  const session = event.data.object;
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;
  const billingCycle = session.metadata?.billingCycle;

  if (!userId || !tier) {
    console.error('[Stripe Webhook] Missing metadata in checkout session:', session.id);
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error('[Stripe Webhook] User not found:', userId);
    return;
  }

  let subscription = await Subscription.findByUserId(userId);

  const subscriptionData = {
    tier,
    status: 'active',
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer,
    billingCycle: billingCycle || 'monthly',
    subscriptionEndsAt: null
  };

  if (subscription) {
    subscription = await Subscription.update(userId, subscriptionData);
  } else {
    subscription = await Subscription.create({
      userId,
      ...subscriptionData
    });
  }

  console.log('[Stripe Webhook] Subscription activated:', subscription.id);
  return subscription;
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(event) {
  const stripeSubscription = event.data.object;
  const subscriptionId = stripeSubscription.id;

  const subscription = await Subscription.findByStripeSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Stripe Webhook] Subscription not found:', subscriptionId);
    return;
  }

  let status = 'active';
  if (stripeSubscription.cancel_at_period_end) {
    status = 'cancelled';
  } else if (stripeSubscription.status === 'trialing') {
    status = 'trial';
  } else if (stripeSubscription.status === 'active') {
    status = 'active';
  } else if (stripeSubscription.status === 'canceled' || stripeSubscription.status === 'unpaid') {
    status = 'expired';
  }

  const trialEndsAt = stripeSubscription.trial_end 
    ? new Date(stripeSubscription.trial_end * 1000)
    : null;
  const subscriptionEndsAt = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null;

  const updated = await Subscription.update(subscription.userId, {
    status,
    trialEndsAt,
    subscriptionEndsAt,
    stripeCustomerId: stripeSubscription.customer
  });

  console.log('[Stripe Webhook] Subscription updated:', updated.id);
  return updated;
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(event) {
  const stripeSubscription = event.data.object;
  const subscriptionId = stripeSubscription.id;

  const subscription = await Subscription.findByStripeSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Stripe Webhook] Subscription not found:', subscriptionId);
    return;
  }

  const cancelled = await Subscription.expire(subscription.userId);
  console.log('[Stripe Webhook] Subscription cancelled:', cancelled.id);
  return cancelled;
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  const subscription = await Subscription.findByStripeSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Stripe Webhook] Subscription not found for invoice:', subscriptionId);
    return;
  }

  console.log('[Stripe Webhook] Payment failed for subscription:', subscription.id);
  return subscription;
}

/**
 * Handle webhook event
 */
async function handleWebhookEvent(event) {
  console.log('[Stripe Webhook] Received event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Error handling event:', error);
    throw error;
  }
}

/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint
 */
router.post('/stripe', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'bad_request',
        message: 'Missing Stripe signature'
      });
    }

    // Get raw body
    const payload = req.body;

    // Verify webhook signature
    const event = await verifyWebhookSignature(payload, signature);

    // Handle event
    await handleWebhookEvent(event);

    res.json({
      success: true,
      received: true
    });
  } catch (error) {
    next(error);
  }
});

export default router;

