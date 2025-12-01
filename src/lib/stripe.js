/**
 * Stripe Integration
 * Handles Stripe API operations
 */

import Stripe from 'stripe';

let stripeInstance = null;

/**
 * Get Stripe instance
 */
export function getStripe() {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia' // Use latest API version
    });

    console.log('[Stripe] Initialized with key:', secretKey.substring(0, 7) + '...');
  }

  return stripeInstance;
}

/**
 * Pricing plans configuration
 * Matching extension subscription-config.js
 */
export const PRICING_PLANS = {
  professional: {
    monthly: {
      priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
      amount: 999, // $9.99 in cents
      currency: 'usd',
      interval: 'month',
      trialDays: 7
    },
    yearly: {
      priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL_YEARLY || 'price_professional_yearly',
      amount: 9990, // $99.90 in cents (save ~17%)
      currency: 'usd',
      interval: 'year',
      trialDays: 7
    }
  },
  premium: {
    monthly: {
      priceId: process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY || 'price_premium_monthly',
      amount: 2999, // $29.99 in cents
      currency: 'usd',
      interval: 'month',
      trialDays: 7
    },
    yearly: {
      priceId: process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY || 'price_premium_yearly',
      amount: 29990, // $299.90 in cents (save ~17%)
      currency: 'usd',
      interval: 'year',
      trialDays: 7
    }
  }
};

/**
 * Create Stripe customer
 * @param {Object} user - User object
 * @returns {Promise<Stripe.Customer>} Stripe customer
 */
export async function createCustomer(user) {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user.id,
      googleId: user.googleId
    }
  });

  console.log('[Stripe] Created customer:', customer.id);
  return customer;
}

/**
 * Get or create Stripe customer
 * @param {Object} user - User object
 * @param {string} existingCustomerId - Existing Stripe customer ID
 * @returns {Promise<Stripe.Customer>} Stripe customer
 */
export async function getOrCreateCustomer(user, existingCustomerId = null) {
  const stripe = getStripe();

  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (customer && !customer.deleted) {
        return customer;
      }
    } catch (error) {
      console.warn('[Stripe] Customer not found, creating new one:', error.message);
    }
  }

  return await createCustomer(user);
}

/**
 * Create checkout session
 * @param {Object} options - Checkout session options
 * @param {Object} options.user - User object
 * @param {string} options.tier - Subscription tier (professional, premium)
 * @param {string} options.billingCycle - Billing cycle (monthly, yearly)
 * @param {string} options.successUrl - Success redirect URL
 * @param {string} options.cancelUrl - Cancel redirect URL
 * @returns {Promise<Stripe.Checkout.Session>} Checkout session
 */
export async function createCheckoutSession(options) {
  const { user, tier, billingCycle = 'monthly', successUrl, cancelUrl } = options;

  const stripe = getStripe();

  // Get pricing plan
  const plan = PRICING_PLANS[tier]?.[billingCycle];
  if (!plan) {
    throw new Error(`Invalid tier or billing cycle: ${tier}/${billingCycle}`);
  }

  // Get or create customer
  const customer = await getOrCreateCustomer(user);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        userId: user.id,
        tier: tier,
        billingCycle: billingCycle
      },
      trial_period_days: plan.trialDays
    },
    metadata: {
      userId: user.id,
      tier: tier,
      billingCycle: billingCycle
    },
    success_url: successUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/cancel`,
    allow_promotion_codes: true
  });

  console.log('[Stripe] Created checkout session:', session.id);
  return session;
}

/**
 * Create portal session (for managing subscription)
 * @param {Object} user - User object
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - Return URL after portal session
 * @returns {Promise<Stripe.BillingPortal.Session>} Portal session
 */
export async function createPortalSession(user, customerId, returnUrl) {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/account`
  });

  console.log('[Stripe] Created portal session:', session.id);
  return session;
}

/**
 * Cancel subscription in Stripe
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {boolean} immediately - Cancel immediately or at period end
 * @returns {Promise<Stripe.Subscription>} Updated subscription
 */
export async function cancelSubscription(subscriptionId, immediately = false) {
  const stripe = getStripe();

  if (immediately) {
    // Cancel immediately
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    console.log('[Stripe] Cancelled subscription immediately:', subscriptionId);
    return subscription;
  } else {
    // Cancel at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    console.log('[Stripe] Scheduled subscription cancellation:', subscriptionId);
    return subscription;
  }
}

/**
 * Update subscription in Stripe
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Stripe.Subscription>} Updated subscription
 */
export async function updateSubscription(subscriptionId, updates) {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.update(subscriptionId, updates);
  console.log('[Stripe] Updated subscription:', subscriptionId);
  return subscription;
}

/**
 * Retrieve subscription from Stripe
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Stripe.Subscription>} Subscription
 */
export async function getSubscription(subscriptionId) {
  const stripe = getStripe();
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Promise<Stripe.Event>} Stripe event
 */
export async function verifyWebhookSignature(payload, signature) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('[Stripe] Webhook signature verification failed:', error.message);
    throw error;
  }
}

