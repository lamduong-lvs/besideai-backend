# Phase 5: Payment Integration (Stripe) - ✅ COMPLETE

## ✅ Đã hoàn thành

### 1. Stripe Setup ✅

#### ✅ Stripe SDK Integration
- Added `stripe` package to `package.json`
- Created `src/lib/stripe.js` với Stripe utilities
- Environment variables:
  - `STRIPE_SECRET_KEY` - Stripe secret key
  - `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
  - `STRIPE_PRICE_ID_*` - Price IDs for products (optional)

#### ✅ Pricing Plans Configuration
- Professional tier:
  - Monthly: $9.99
  - Yearly: $99.90 (save ~17%)
- Premium tier:
  - Monthly: $29.99
  - Yearly: $299.90 (save ~17%)
- 7-day free trial for both tiers

### 2. Stripe Utilities ✅

#### ✅ Customer Management
- `createCustomer(user)` - Create Stripe customer
- `getOrCreateCustomer(user, existingCustomerId)` - Get or create customer

#### ✅ Checkout Session
- `createCheckoutSession(options)` - Create checkout session
  - Supports monthly/yearly billing
  - Includes 7-day trial
  - Metadata: userId, tier, billingCycle
  - Success/cancel URLs

#### ✅ Portal Session
- `createPortalSession(user, customerId, returnUrl)` - Create customer portal
  - Manage subscription
  - Update payment methods
  - View invoices

#### ✅ Subscription Management
- `cancelSubscription(subscriptionId, immediately)` - Cancel subscription
- `updateSubscription(subscriptionId, updates)` - Update subscription
- `getSubscription(subscriptionId)` - Retrieve subscription

#### ✅ Webhook Verification
- `verifyWebhookSignature(payload, signature)` - Verify webhook signature

### 3. Webhook Endpoint ✅

#### ✅ POST /api/webhooks/stripe
- Verifies webhook signature
- Handles events:
  - `checkout.session.completed` → Activate subscription
  - `customer.subscription.updated` → Update subscription
  - `customer.subscription.deleted` → Cancel subscription
  - `invoice.payment_failed` → Handle failed payment

**Event Handlers:**
- `handleCheckoutSessionCompleted()` - Creates/updates subscription after payment
- `handleSubscriptionUpdated()` - Updates subscription status and dates
- `handleSubscriptionDeleted()` - Expires subscription (downgrade to free)
- `handleInvoicePaymentFailed()` - Logs failed payment (can send notification)

### 4. Upgrade Flow ✅

#### ✅ POST /api/subscription/upgrade (Updated)
- Creates Stripe checkout session
- Returns checkout URL
- User redirects to Stripe checkout
- After payment, webhook activates subscription

**Request:**
```json
{
  "tier": "professional",
  "billingCycle": "monthly",
  "successUrl": "https://besideai.work/success",
  "cancelUrl": "https://besideai.work/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_...",
  "message": "Checkout session created..."
}
```

### 5. Cancel Flow ✅

#### ✅ POST /api/subscription/cancel (Updated)
- Cancels subscription in Stripe
- Updates database
- Supports immediate or end-of-period cancellation

**Request:**
```json
{
  "immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "subscription": { ... },
  "message": "Subscription will be cancelled at the end of the billing period"
}
```

### 6. Portal Endpoint ✅

#### ✅ POST /api/subscription/portal
- Creates Stripe customer portal session
- Returns portal URL
- User can manage subscription, payment methods, invoices

**Response:**
```json
{
  "success": true,
  "portalUrl": "https://billing.stripe.com/...",
  "message": "Portal session created..."
}
```

## 📁 Files Created/Updated

### New Files
```
backend/
├── src/lib/
│   └── stripe.js ✅ (Stripe utilities)
├── api/
│   ├── subscription/
│   │   └── portal.js ✅ (Portal endpoint)
│   └── webhooks/
│       └── stripe.js ✅ (Webhook handler)
└── src/routes/
    └── webhooks.js ✅ (Webhook routes for standalone)
```

### Updated Files
```
backend/
├── package.json ✅ (Added stripe dependency)
├── api/subscription/
│   ├── upgrade.js ✅ (Stripe checkout integration)
│   └── cancel.js ✅ (Stripe cancel integration)
├── src/routes/
│   └── subscription.js ✅ (Stripe integration)
├── server.js ✅ (Added webhook routes)
└── vercel.json ✅ (Added webhook route)
```

## 🔧 Stripe Configuration

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_... (for frontend)

# Optional: Custom price IDs
STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_...
STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_ID_PREMIUM_YEARLY=price_...
```

### Stripe Dashboard Setup

1. **Create Products:**
   - Professional (Monthly) - $9.99/month
   - Professional (Yearly) - $99.90/year
   - Premium (Monthly) - $29.99/month
   - Premium (Yearly) - $299.90/year

2. **Setup Webhook:**
   - URL: `https://besideai.work/api/webhooks/stripe`
   - Events to listen:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Get webhook signing secret

3. **Test Mode:**
   - Use test API keys for development
   - Use Stripe CLI for local testing:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```

## 🚀 Usage Flow

### Upgrade Flow
1. User calls `POST /api/subscription/upgrade`
2. Backend creates Stripe checkout session
3. User redirected to Stripe checkout
4. User completes payment
5. Stripe sends `checkout.session.completed` webhook
6. Backend activates subscription
7. User redirected to success URL

### Cancel Flow
1. User calls `POST /api/subscription/cancel`
2. Backend cancels subscription in Stripe
3. Backend updates database
4. Subscription expires at period end (or immediately)

### Portal Flow
1. User calls `POST /api/subscription/portal`
2. Backend creates portal session
3. User redirected to Stripe portal
4. User manages subscription, payment methods, invoices
5. User redirected back to return URL

## 📋 Webhook Events

### checkout.session.completed
- Triggered when payment succeeds
- Creates/updates subscription in database
- Sets status to 'active'
- Stores Stripe subscription ID and customer ID

### customer.subscription.updated
- Triggered when subscription changes
- Updates subscription status, dates
- Handles trial period, cancellation schedule

### customer.subscription.deleted
- Triggered when subscription cancelled
- Expires subscription (downgrade to free)

### invoice.payment_failed
- Triggered when payment fails
- Logs failure (can send notification to user)

## ✅ Checklist

- [x] Stripe SDK integration
- [x] Customer management
- [x] Checkout session creation
- [x] Webhook endpoint
- [x] Webhook signature verification
- [x] Event handlers (checkout, subscription updated/deleted, payment failed)
- [x] Upgrade flow with Stripe
- [x] Cancel flow with Stripe
- [x] Portal session creation
- [x] Pricing plans configuration
- [x] Trial period support
- [x] Monthly/yearly billing
- [x] Error handling
- [x] Documentation

**Phase 5 Status: ✅ COMPLETE**

## 🔄 Next Steps

### Setup Required
1. Create Stripe account
2. Create products in Stripe Dashboard
3. Setup webhook endpoint
4. Get API keys and webhook secret
5. Add to environment variables

### Testing
1. Test checkout flow with test cards
2. Test webhook events with Stripe CLI
3. Test cancel flow
4. Test portal flow

### Optional Enhancements
- Email notifications for payment events
- Retry failed payments
- Proration for upgrades/downgrades
- Coupon/promotion code support (already enabled in checkout)

