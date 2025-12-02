/**
 * Lemon Squeezy Integration
 * Handles Lemon Squeezy API operations
 * 
 * API Documentation: https://docs.lemonsqueezy.com/api
 */

const LEMON_SQUEEZY_API_BASE = 'https://api.lemonsqueezy.com/v1';

let apiKey = null;

/**
 * Get API key from environment
 */
function getApiKey() {
  if (!apiKey) {
    apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    
    if (!apiKey) {
      throw new Error('LEMON_SQUEEZY_API_KEY environment variable is not set');
    }
  }

  return apiKey;
}

/**
 * Get Store ID from environment
 */
function getStoreId() {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  
  if (!storeId) {
    throw new Error('LEMON_SQUEEZY_STORE_ID environment variable is not set');
  }

  return storeId;
}

/**
 * Make API request to Lemon Squeezy
 */
async function apiRequest(method, endpoint, data = null) {
  const apiKey = getApiKey();
  const url = `${LEMON_SQUEEZY_API_BASE}${endpoint}`;

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.errors?.[0]?.detail || `Lemon Squeezy API error: ${response.statusText}`);
      error.status = response.status;
      error.errors = responseData.errors;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error('[Lemon Squeezy] API request failed:', error);
    throw error;
  }
}

/**
 * Pricing plans configuration
 * Variant IDs should be set in environment variables
 */
export const PRICING_PLANS = {
  professional: {
    monthly: {
      variantId: process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY || process.env.LEMON_SQUEEZY_VARIANT_ID_PROFESSIONAL_MONTHLY || null,
      amount: 999, // $9.99 in cents
      currency: 'USD',
      interval: 'month',
      trialDays: 7
    },
    yearly: {
      variantId: process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY || process.env.LEMON_SQUEEZY_VARIANT_ID_PROFESSIONAL_YEARLY || null,
      amount: 9990, // $99.90 in cents (save ~17%)
      currency: 'USD',
      interval: 'year',
      trialDays: 7
    }
  },
  premium: {
    monthly: {
      variantId: process.env.LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY || null,
      amount: 2999, // $29.99 in cents
      currency: 'USD',
      interval: 'month',
      trialDays: 7
    },
    yearly: {
      variantId: process.env.LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY || null,
      amount: 29990, // $299.90 in cents (save ~17%)
      currency: 'USD',
      interval: 'year',
      trialDays: 7
    }
  }
};

/**
 * Create or get customer
 * @param {Object} user - User object
 * @param {string} existingCustomerId - Existing Lemon Squeezy customer ID
 * @returns {Promise<Object>} Customer object
 */
export async function getOrCreateCustomer(user, existingCustomerId = null) {
  if (existingCustomerId) {
    try {
      const response = await apiRequest('GET', `/customers/${existingCustomerId}`);
      if (response.data) {
        return {
          id: response.data.id,
          email: response.data.attributes.email,
          name: response.data.attributes.name
        };
      }
    } catch (error) {
      console.warn('[Lemon Squeezy] Customer not found, creating new one:', error.message);
    }
  }

  // Create new customer
  const storeId = getStoreId();
  const response = await apiRequest('POST', '/customers', {
    data: {
      type: 'customers',
      attributes: {
        name: user.name || user.email,
        email: user.email
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: storeId
          }
        }
      }
    }
  });

  console.log('[Lemon Squeezy] Created customer:', response.data.id);
  return {
    id: response.data.id,
    email: response.data.attributes.email,
    name: response.data.attributes.name
  };
}

/**
 * Create checkout link
 * @param {Object} options - Checkout options
 * @param {Object} options.user - User object
 * @param {string} options.tier - Subscription tier (professional, premium)
 * @param {string} options.billingCycle - Billing cycle (monthly, yearly)
 * @param {string} options.successUrl - Success redirect URL
 * @param {string} options.cancelUrl - Cancel redirect URL
 * @returns {Promise<Object>} Checkout link object
 */
export async function createCheckoutSession(options) {
  const { user, tier, billingCycle = 'monthly', successUrl, cancelUrl } = options;

  // Get pricing plan
  const plan = PRICING_PLANS[tier]?.[billingCycle];
  if (!plan) {
    throw new Error(`Invalid tier or billing cycle: ${tier}/${billingCycle}`);
  }

  if (!plan.variantId) {
    throw new Error(`Variant ID not configured for ${tier}/${billingCycle}. Set LEMON_SQUEEZY_VARIANT_ID_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`);
  }

  // Get or create customer
  const customer = await getOrCreateCustomer(user);

  const storeId = getStoreId();

  // Create checkout link
  const response = await apiRequest('POST', '/checkouts', {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: null, // Use variant price
        product_options: {
          name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${billingCycle})`,
          description: `Subscribe to ${tier} plan with ${billingCycle} billing`,
          media: [],
          redirect_url: successUrl || `${process.env.API_BASE_URL || 'https://besideai.work'}/success?checkout_id={checkout_id}`,
          receipt_button_text: 'Go to Dashboard',
          receipt_link_url: `${process.env.API_BASE_URL || 'https://besideai.work'}/account`,
          receipt_thank_you_note: 'Thank you for subscribing!'
        },
        checkout_options: {
          embed: false,
          media: false,
          logo: false,
          desc: true,
          discount: true,
          dark: false,
          subscription_preview: true,
          button_color: '#000000'
        },
        checkout_data: {
          email: user.email,
          name: user.name || user.email,
          custom: {
            userId: user.id,
            tier: tier,
            billingCycle: billingCycle
          }
        },
        expires_at: null, // No expiration
        preview: false,
        test_mode: process.env.NODE_ENV !== 'production'
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: storeId
          }
        },
        variant: {
          data: {
            type: 'variants',
            id: plan.variantId
          }
        }
      }
    }
  });

  const checkout = response.data;
  const checkoutUrl = checkout.attributes.url;

  console.log('[Lemon Squeezy] Created checkout:', checkout.id);

  return {
    id: checkout.id,
    url: checkoutUrl,
    checkout_id: checkout.id // For compatibility
  };
}

/**
 * Create customer portal session
 * Note: Lemon Squeezy doesn't have a separate portal like Stripe
 * Instead, customers manage subscriptions through their account dashboard
 * We'll return a URL to the customer's subscription management page
 * @param {Object} user - User object
 * @param {string} customerId - Lemon Squeezy customer ID
 * @param {string} returnUrl - Return URL after portal session
 * @returns {Promise<Object>} Portal session object
 */
export async function createPortalSession(user, customerId, returnUrl) {
  // Lemon Squeezy doesn't have a billing portal like Stripe
  // Instead, we can redirect to the customer's subscription page
  // or create a custom management page
  
  // For now, return a URL that can be used to manage subscriptions
  // You may need to implement a custom subscription management page
  const portalUrl = `${process.env.API_BASE_URL || 'https://besideai.work'}/account/subscription?customer_id=${customerId}`;

  console.log('[Lemon Squeezy] Created portal session for customer:', customerId);

  return {
    id: `portal_${Date.now()}`,
    url: portalUrl
  };
}

/**
 * Cancel subscription in Lemon Squeezy
 * @param {string} subscriptionId - Lemon Squeezy subscription ID
 * @param {boolean} immediately - Cancel immediately or at period end
 * @returns {Promise<Object>} Updated subscription
 */
export async function cancelSubscription(subscriptionId, immediately = false) {
  if (immediately) {
    // Cancel immediately
    const response = await apiRequest('DELETE', `/subscriptions/${subscriptionId}`);
    console.log('[Lemon Squeezy] Cancelled subscription immediately:', subscriptionId);
    return response.data;
  } else {
    // Cancel at period end (update subscription)
    const response = await apiRequest('PATCH', `/subscriptions/${subscriptionId}`, {
      data: {
        type: 'subscriptions',
        id: subscriptionId,
        attributes: {
          cancelled: true // This will cancel at period end
        }
      }
    });
    console.log('[Lemon Squeezy] Scheduled subscription cancellation:', subscriptionId);
    return response.data;
  }
}

/**
 * Update subscription in Lemon Squeezy
 * @param {string} subscriptionId - Lemon Squeezy subscription ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated subscription
 */
export async function updateSubscription(subscriptionId, updates) {
  const response = await apiRequest('PATCH', `/subscriptions/${subscriptionId}`, {
    data: {
      type: 'subscriptions',
      id: subscriptionId,
      attributes: updates
    }
  });

  console.log('[Lemon Squeezy] Updated subscription:', subscriptionId);
  return response.data;
}

/**
 * Retrieve subscription from Lemon Squeezy
 * @param {string} subscriptionId - Lemon Squeezy subscription ID
 * @returns {Promise<Object>} Subscription
 */
export async function getSubscription(subscriptionId) {
  const response = await apiRequest('GET', `/subscriptions/${subscriptionId}`);
  return response.data;
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Lemon Squeezy signature header
 * @returns {Promise<Object>} Webhook event data
 */
export async function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET environment variable is not set');
  }

  // Lemon Squeezy uses HMAC SHA256 for webhook verification
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  // Lemon Squeezy sends signature in format: "sha256=<signature>"
  const receivedSignature = signature.replace('sha256=', '');

  if (calculatedSignature !== receivedSignature) {
    throw new Error('Invalid webhook signature');
  }

  // Parse payload
  const event = JSON.parse(payload);
  return event;
}

