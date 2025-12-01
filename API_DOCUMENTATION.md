# API Documentation

## Base URL
- Development: `http://localhost:3000`
- Production: `https://besideai.work`

## Authentication
All endpoints (except `/api/health`) require authentication:
```
Authorization: Bearer <google-oauth-token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Health Check

#### GET /api/health
Check API and database status.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

---

### User Endpoints

#### GET /api/users/me
Get current user with subscription info.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://...",
    "googleId": "google-id",
    "preferences": {},
    "subscription": {
      "id": "uuid",
      "tier": "free",
      "status": "active",
      ...
    }
  }
}
```

#### PUT /api/users/me
Update current user.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "New Name",
  "picture": "https://...",
  "preferences": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

---

### Subscription Endpoints

#### GET /api/subscription/status
Get subscription status.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "userId": "uuid",
    "tier": "free",
    "status": "active",
    "trialEndsAt": null,
    "subscriptionEndsAt": null,
    ...
  }
}
```

#### PUT /api/subscription/status
Update subscription status.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "tier": "professional",
  "status": "trial",
  "trialEndsAt": "2025-01-08T00:00:00Z",
  "billingCycle": "monthly"
}
```

#### GET /api/subscription/limits
Get subscription limits based on tier.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "tier": "free",
  "limits": {
    "tokensPerDay": 50000,
    "tokensPerMonth": 1500000,
    "maxTokensPerRequest": 2000,
    "requestsPerDay": 10,
    "requestsPerMonth": 300,
    "recordingTimePerDay": 0,
    "translationTimePerDay": 0,
    "rateLimit": { ... },
    "allowedModels": [ ... ]
  }
}
```

#### POST /api/subscription/upgrade
Upgrade subscription (creates Stripe checkout session).

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
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

#### POST /api/subscription/cancel
Cancel subscription.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
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

#### POST /api/subscription/portal
Create Stripe customer portal session.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "returnUrl": "https://besideai.work/account"
}
```

**Response:**
```json
{
  "success": true,
  "portalUrl": "https://billing.stripe.com/...",
  "message": "Portal session created..."
}
```

---

### Usage Endpoints

#### GET /api/usage?period=day|month
Get usage data.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `period`: `day` (default) or `month`

**Response (day):**
```json
{
  "success": true,
  "period": "day",
  "tier": "free",
  "usage": {
    "tokens": 1000,
    "requests": 5,
    "recordingTime": 0,
    "translationTime": 0
  },
  "limits": {
    "tokensPerDay": 50000,
    "requestsPerDay": 10
  }
}
```

**Response (month):**
```json
{
  "success": true,
  "period": "month",
  "tier": "free",
  "usage": {
    "tokens": 50000,
    "requests": 100,
    ...
  },
  "details": [
    { "date": "2025-01-01", "tokens": 1000, ... },
    ...
  ],
  "limits": { ... }
}
```

#### POST /api/usage/sync
Sync usage data from extension.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "date": "2025-01-01",
  "tokens": 1000,
  "requests": 5,
  "recordingTime": 0,
  "translationTime": 0
}
```

**Response:**
```json
{
  "success": true,
  "usage": {
    "id": "uuid",
    "userId": "uuid",
    "date": "2025-01-01",
    "tokens": 1000,
    ...
  },
  "message": "Usage synced successfully"
}
```

---

### Webhook Endpoints

#### POST /api/webhooks/stripe
Stripe webhook endpoint (handled by Stripe).

**Headers:**
- `stripe-signature`: Stripe webhook signature

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `bad_request` | 400 | Invalid request |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Access forbidden |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict |
| `validation_error` | 422 | Validation failed |
| `too_many_requests` | 429 | Rate limit exceeded |
| `internal_server_error` | 500 | Server error |
| `service_unavailable` | 503 | Service unavailable |

## Rate Limits

- Default: 100 requests/minute per user
- Strict endpoints: 10 requests/minute
- Headers:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## Examples

### cURL Examples

```bash
# Health check
curl https://besideai.work/api/health

# Get user
curl -H "Authorization: Bearer <token>" \
  https://besideai.work/api/users/me

# Get subscription
curl -H "Authorization: Bearer <token>" \
  https://besideai.work/api/subscription/status

# Upgrade subscription
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tier": "professional", "billingCycle": "monthly"}' \
  https://besideai.work/api/subscription/upgrade

# Sync usage
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tokens": 1000, "requests": 5}' \
  https://besideai.work/api/usage/sync
```

