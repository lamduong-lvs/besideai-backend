# Lemon Squeezy Setup Guide

## Overview

This guide will help you set up Lemon Squeezy for payment processing, replacing Stripe.

## Why Lemon Squeezy?

- ✅ Supports Vietnam and many other countries
- ✅ Lower transaction fees
- ✅ Built-in subscription management
- ✅ Easy API integration
- ✅ Webhook support

## Setup Steps

### 1. Create Lemon Squeezy Account

1. Go to [Lemon Squeezy](https://www.lemonsqueezy.com/)
2. Sign up for an account
3. Complete store setup

### 2. Get API Credentials

1. Go to **Settings** > **API** in Lemon Squeezy dashboard
2. Create a new API Key
3. **Important**: Copy and save the API key immediately (you can only see it once)

### 3. Get Store ID

1. Go to **Settings** > **Stores** in Lemon Squeezy dashboard
2. Copy your **Store ID**

### 4. Create Products and Variants

1. Go to **Products** in Lemon Squeezy dashboard
2. Create products for:
   - Professional Plan (Monthly)
   - Professional Plan (Yearly)
   - Premium Plan (Monthly)
   - Premium Plan (Yearly)

3. For each product, create a variant with:
   - Price matching your pricing
   - Billing interval (monthly/yearly)
   - Trial period (7 days if desired)

4. Copy the **Variant ID** for each variant

### 5. Set Environment Variables

Add these to your Vercel environment variables:

```bash
# Lemon Squeezy API
LEMON_SQUEEZY_API_KEY=your_api_key_here
LEMON_SQUEEZY_STORE_ID=your_store_id_here

# Variant IDs (get from Lemon Squeezy dashboard)
LEMON_SQUEEZY_VARIANT_ID_PROFESSIONAL_MONTHLY=variant_id_here
LEMON_SQUEEZY_VARIANT_ID_PROFESSIONAL_YEARLY=variant_id_here
LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY=variant_id_here
LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY=variant_id_here

# Webhook Secret (set after creating webhook)
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

### 6. Setup Webhook

1. Go to **Settings** > **Webhooks** in Lemon Squeezy dashboard
2. Click **Create Webhook**
3. Set webhook URL: `https://besideai.work/api/webhooks/lemon-squeezy`
4. Select events to listen for:
   - `order_created`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_payment_success`
   - `subscription_payment_failed`

5. Copy the **Signing Secret** and add to `LEMON_SQUEEZY_WEBHOOK_SECRET`

### 7. Run Database Migration

Run the migration to add Lemon Squeezy columns:

```sql
-- Run this in Supabase SQL Editor
-- Or use the migration script
```

Or use the migration endpoint:
```bash
POST https://besideai.work/api/migrate
{
  "secret": "your_cron_secret"
}
```

## API Differences from Stripe

### Checkout Session

**Stripe:**
```javascript
const session = await stripe.checkout.sessions.create({...});
// Returns: { id, url }
```

**Lemon Squeezy:**
```javascript
const session = await createCheckoutSession({...});
// Returns: { id, url, checkout_id }
```

### Customer Portal

**Stripe:**
- Has built-in billing portal

**Lemon Squeezy:**
- No built-in portal
- We create a custom management URL
- You may need to build a custom subscription management page

### Subscription Cancellation

**Stripe:**
```javascript
await stripe.subscriptions.cancel(subscriptionId);
```

**Lemon Squeezy:**
```javascript
await cancelSubscription(subscriptionId, immediately);
```

## Webhook Events

Lemon Squeezy webhook events:

- `order_created` - New order placed
- `subscription_created` - New subscription created
- `subscription_updated` - Subscription updated
- `subscription_cancelled` - Subscription cancelled
- `subscription_payment_success` - Payment succeeded
- `subscription_payment_failed` - Payment failed

## Testing

1. Use Lemon Squeezy test mode
2. Test checkout flow
3. Test webhook events
4. Verify subscription activation

## Migration Notes

- Stripe columns are kept for backward compatibility
- New subscriptions use Lemon Squeezy
- Old Stripe subscriptions can coexist

## Resources

- [Lemon Squeezy API Docs](https://docs.lemonsqueezy.com/api)
- [Lemon Squeezy Developer Guide](https://docs.lemonsqueezy.com/guides/developer-guide/getting-started)
- [Webhook Documentation](https://docs.lemonsqueezy.com/help/webhooks)

