/**
 * Stripe Webhook Endpoint
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events
 */

import { verifyWebhookSignature } from '../../src/lib/stripe.js';
import { Subscription } from '../../src/models/index.js';
import { User } from '../../src/models/index.js';

/**
 * Handle checkout.session.completed event
 * Activate subscription after successful payment
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

  // Get user
  const user = await User.findById(userId);
  if (!user) {
    console.error('[Stripe Webhook] User not found:', userId);
    return;
  }

  // Get or create subscription
  let subscription = await Subscription.findByUserId(userId);

  const subscriptionData = {
    tier,
    status: 'active',
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer,
    billingCycle: billingCycle || 'monthly',
    subscriptionEndsAt: null // Will be updated by subscription.updated event
  };

  if (subscription) {
    // Update existing subscription
    subscription = await Subscription.update(userId, subscriptionData);
  } else {
    // Create new subscription
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
 * Update subscription when changed in Stripe
 */
async function handleSubscriptionUpdated(event) {
  const stripeSubscription = event.data.object;
  const subscriptionId = stripeSubscription.id;

  // Find subscription by Stripe subscription ID
  const subscription = await Subscription.findByStripeSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Stripe Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Determine status
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

  // Calculate end dates
  const trialEndsAt = stripeSubscription.trial_end 
    ? new Date(stripeSubscription.trial_end * 1000)
    : null;
  const subscriptionEndsAt = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null;

  // Update subscription
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
 * Cancel subscription when deleted in Stripe
 */
async function handleSubscriptionDeleted(event) {
  const stripeSubscription = event.data.object;
  const subscriptionId = stripeSubscription.id;

  // Find subscription
  const subscription = await Subscription.findByStripeSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Stripe Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Cancel subscription (downgrade to free)
  const cancelled = await Subscription.expire(subscription.userId);

  console.log('[Stripe Webhook] Subscription cancelled:', cancelled.id);
  return cancelled;
}

/**
 * Handle invoice.payment_failed event
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  // Find subscription
  const subscription = await Subscription.findByStripeSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Stripe Webhook] Subscription not found for invoice:', subscriptionId);
    return;
  }

  // Update subscription status (keep active but mark for attention)
  // You might want to send notification to user here
  console.log('[Stripe Webhook] Payment failed for subscription:', subscription.id);
  
  // Optionally update subscription status
  // await Subscription.update(subscription.userId, { status: 'expired' });

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
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method is allowed'
    });
  }

  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({
      success: false,
      error: 'bad_request',
      message: 'Missing Stripe signature'
    });
  }

  try {
    // Get raw body
    // Note: Vercel serverless functions need raw body for signature verification
    // The body should be passed as raw buffer/string
    let payload;
    
    if (Buffer.isBuffer(req.body)) {
      payload = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      payload = req.body;
    } else {
      // If body is already parsed, we need to reconstruct it
      // This shouldn't happen if vercel.json is configured correctly
      payload = JSON.stringify(req.body);
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(payload, signature);

    // Handle event
    await handleWebhookEvent(event);

    // Return success
    return res.json({
      success: true,
      received: true
    });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    
    return res.status(400).json({
      success: false,
      error: 'webhook_error',
      message: error.message
    });
  }
}

