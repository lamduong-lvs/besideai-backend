/**
 * Lemon Squeezy Webhook Endpoint
 * POST /api/webhooks/lemon-squeezy
 * Handles Lemon Squeezy webhook events
 * 
 * Webhook Events:
 * - order_created: When a new order is created
 * - subscription_created: When a subscription is created
 * - subscription_updated: When a subscription is updated
 * - subscription_cancelled: When a subscription is cancelled
 * - subscription_payment_success: When a subscription payment succeeds
 * - subscription_payment_failed: When a subscription payment fails
 */

import { verifyWebhookSignature } from '../../src/lib/lemon-squeezy.js';
import { Subscription } from '../../src/models/index.js';
import { User } from '../../src/models/index.js';

/**
 * Handle order.created event
 * Activate subscription after successful payment
 */
async function handleOrderCreated(event) {
  const order = event.data;
  const orderId = order.id;
  const attributes = order.attributes;

  // Get custom data from order
  // Lemon Squeezy stores custom data in order attributes
  const customData = attributes.custom_price || attributes.first_order_item?.product_options?.custom || {};
  const userId = customData.userId;
  const tier = customData.tier;
  const billingCycle = customData.billingCycle;

  if (!userId || !tier) {
    console.error('[Lemon Squeezy Webhook] Missing custom data in order:', orderId);
    // Try to get from order item relationships
    const orderItems = event.included?.filter(item => item.type === 'order-items') || [];
    if (orderItems.length > 0) {
      const firstItem = orderItems[0];
      // Custom data might be in variant or product
      console.log('[Lemon Squeezy Webhook] Order items:', orderItems);
    }
    return;
  }

  // Get user
  const user = await User.findById(userId);
  if (!user) {
    console.error('[Lemon Squeezy Webhook] User not found:', userId);
    return;
  }

  // Get subscription from order
  // Lemon Squeezy order may have subscription_id in relationships
  const subscriptionId = event.data?.relationships?.subscriptions?.data?.[0]?.id || attributes.subscription_id;
  const customerId = event.data?.relationships?.customer?.data?.id || attributes.customer_id;

  // Get or create subscription
  let subscription = await Subscription.findByUserId(userId);

  const subscriptionData = {
    tier,
    status: 'active',
    lemonSubscriptionId: subscriptionId,
    lemonCustomerId: customerId,
    lemonOrderId: orderId,
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

  console.log('[Lemon Squeezy Webhook] Subscription activated:', subscription.id);
  return subscription;
}

/**
 * Handle subscription.created event
 * Handle new subscription creation
 */
async function handleSubscriptionCreated(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;
  const attributes = subscription.attributes;

  // Find subscription by Lemon Squeezy subscription ID
  const dbSubscription = await Subscription.findByLemonSubscriptionId(subscriptionId);
  if (!dbSubscription) {
    console.warn('[Lemon Squeezy Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Update subscription with details
  const trialEndsAt = attributes.trial_ends_at ? new Date(attributes.trial_ends_at) : null;
  const subscriptionEndsAt = attributes.renews_at ? new Date(attributes.renews_at) : null;

  const updated = await Subscription.update(dbSubscription.userId, {
    status: attributes.status === 'active' ? 'active' : 'trial',
    trialEndsAt,
    subscriptionEndsAt
  });

  console.log('[Lemon Squeezy Webhook] Subscription created:', updated.id);
  return updated;
}

/**
 * Handle subscription.updated event
 * Update subscription when changed in Lemon Squeezy
 */
async function handleSubscriptionUpdated(event) {
  const lemonSubscription = event.data;
  const subscriptionId = lemonSubscription.id;
  const attributes = lemonSubscription.attributes;

  // Find subscription by Lemon Squeezy subscription ID
  const subscription = await Subscription.findByLemonSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Lemon Squeezy Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Determine status
  let status = 'active';
  if (attributes.status === 'cancelled') {
    status = 'cancelled';
  } else if (attributes.status === 'expired') {
    status = 'expired';
  } else if (attributes.status === 'on_trial') {
    status = 'trial';
  } else if (attributes.status === 'active') {
    status = 'active';
  }

  // Calculate end dates
  const trialEndsAt = attributes.trial_ends_at ? new Date(attributes.trial_ends_at) : null;
  const subscriptionEndsAt = attributes.renews_at ? new Date(attributes.renews_at) : null;

  // Update subscription
  const updated = await Subscription.update(subscription.userId, {
    status,
    trialEndsAt,
    subscriptionEndsAt,
    lemonCustomerId: attributes.customer_id
  });

  console.log('[Lemon Squeezy Webhook] Subscription updated:', updated.id);
  return updated;
}

/**
 * Handle subscription.cancelled event
 * Cancel subscription when cancelled in Lemon Squeezy
 */
async function handleSubscriptionCancelled(event) {
  const lemonSubscription = event.data;
  const subscriptionId = lemonSubscription.id;

  // Find subscription
  const subscription = await Subscription.findByLemonSubscriptionId(subscriptionId);
  if (!subscription) {
    console.warn('[Lemon Squeezy Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Cancel subscription (downgrade to free)
  const cancelled = await Subscription.expire(subscription.userId);

  console.log('[Lemon Squeezy Webhook] Subscription cancelled:', cancelled.id);
  return cancelled;
}

/**
 * Handle subscription.payment_success event
 * Handle successful subscription payment
 */
async function handleSubscriptionPaymentSuccess(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;

  // Find subscription
  const dbSubscription = await Subscription.findByLemonSubscriptionId(subscriptionId);
  if (!dbSubscription) {
    console.warn('[Lemon Squeezy Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Update subscription to active
  const updated = await Subscription.update(dbSubscription.userId, {
    status: 'active'
  });

  console.log('[Lemon Squeezy Webhook] Payment succeeded for subscription:', updated.id);
  return updated;
}

/**
 * Handle subscription.payment_failed event
 * Handle failed subscription payment
 */
async function handleSubscriptionPaymentFailed(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;

  // Find subscription
  const dbSubscription = await Subscription.findByLemonSubscriptionId(subscriptionId);
  if (!dbSubscription) {
    console.warn('[Lemon Squeezy Webhook] Subscription not found:', subscriptionId);
    return;
  }

  // Update subscription status (keep active but mark for attention)
  // You might want to send notification to user here
  console.log('[Lemon Squeezy Webhook] Payment failed for subscription:', dbSubscription.id);
  
  // Optionally update subscription status
  // await Subscription.update(dbSubscription.userId, { status: 'expired' });

  return dbSubscription;
}

/**
 * Handle webhook event
 */
async function handleWebhookEvent(event) {
  const eventName = event.meta?.event_name || event.meta?.name;
  console.log('[Lemon Squeezy Webhook] Received event:', eventName);

  try {
    switch (eventName) {
      case 'order_created':
        await handleOrderCreated(event);
        break;

      case 'subscription_created':
        await handleSubscriptionCreated(event);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event);
        break;

      case 'subscription_payment_success':
        await handleSubscriptionPaymentSuccess(event);
        break;

      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(event);
        break;

      default:
        console.log('[Lemon Squeezy Webhook] Unhandled event type:', eventName);
    }
  } catch (error) {
    console.error('[Lemon Squeezy Webhook] Error handling event:', error);
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

  // Lemon Squeezy sends signature in x-signature header
  const signature = req.headers['x-signature'] || req.headers['signature'];

  if (!signature) {
    return res.status(400).json({
      success: false,
      error: 'bad_request',
      message: 'Missing Lemon Squeezy signature'
    });
  }

  try {
    // Get raw body
    // Note: Vercel serverless functions need raw body for signature verification
    let payload;
    
    if (Buffer.isBuffer(req.body)) {
      payload = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      payload = req.body;
    } else {
      // If body is already parsed, we need to reconstruct it
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
    console.error('[Lemon Squeezy Webhook] Error:', error);
    
    return res.status(400).json({
      success: false,
      error: 'webhook_error',
      message: error.message
    });
  }
}

