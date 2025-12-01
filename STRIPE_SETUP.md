# Stripe Setup Guide

## 📋 Prerequisites

1. Stripe account (https://stripe.com)
2. Backend deployed to Vercel
3. Environment variables configured

## 🔧 Setup Steps

### 1. Create Stripe Account

1. Go to https://stripe.com
2. Sign up for account
3. Complete account setup
4. Get API keys from Dashboard → Developers → API keys

### 2. Create Products & Prices

#### Professional Tier

**Monthly:**
1. Go to Products → Add product
2. Name: "Professional (Monthly)"
3. Price: $9.99 USD
4. Billing period: Monthly
5. Copy Price ID (starts with `price_`)

**Yearly:**
1. Add another price to same product
2. Price: $99.90 USD
3. Billing period: Yearly
4. Copy Price ID

#### Premium Tier

**Monthly:**
1. Add product: "Premium (Monthly)"
2. Price: $29.99 USD
3. Billing period: Monthly
4. Copy Price ID

**Yearly:**
1. Add price: $299.90 USD
2. Billing period: Yearly
3. Copy Price ID

### 3. Setup Webhook

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://besideai.work/api/webhooks/stripe`
4. Select events to listen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy "Signing secret" (starts with `whsec_`)

### 4. Environment Variables

Add to Vercel environment variables:

```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_... (for frontend)

# Optional: Custom price IDs (if not using defaults)
STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_...
STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_ID_PREMIUM_YEARLY=price_...
```

### 5. Test Mode

For development, use Stripe test mode:

1. Use test API keys (starts with `sk_test_` and `pk_test_`)
2. Use test webhook secret
3. Test with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

### 6. Local Testing with Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This will give you a webhook signing secret
# Use it in .env: STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🧪 Testing

### Test Checkout Flow

1. Call `POST /api/subscription/upgrade`:
```bash
curl -X POST https://besideai.work/api/subscription/upgrade \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "professional",
    "billingCycle": "monthly"
  }'
```

2. Get `checkoutUrl` from response
3. Open URL in browser
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify webhook received and subscription activated

### Test Webhook Events

```bash
# Trigger test events with Stripe CLI
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

## 🔐 Security

1. **Never commit API keys** to git
2. **Use environment variables** for all secrets
3. **Verify webhook signatures** (already implemented)
4. **Use HTTPS** for webhook endpoint (Vercel provides this)
5. **Rotate keys** if compromised

## 📝 Notes

- Test mode and live mode use different API keys
- Webhook signing secret is different for test/live
- Price IDs are different for test/live products
- Switch to live mode only after thorough testing

## 🚀 Production Checklist

- [ ] Create live mode products
- [ ] Get live API keys
- [ ] Setup production webhook endpoint
- [ ] Get production webhook secret
- [ ] Update environment variables in Vercel
- [ ] Test with real payment (small amount)
- [ ] Monitor webhook events
- [ ] Setup error alerts

