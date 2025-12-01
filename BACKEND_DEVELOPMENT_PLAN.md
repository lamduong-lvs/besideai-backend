# Backend Development Plan - besideai.work on Vercel

## 📋 Tổng quan

**Domain:** `besideai.work`  
**Hosting:** Vercel  
**Purpose:** Subscription management, user sync, usage tracking cho Chrome Extension

---

## 🎯 Tech Stack Recommendation (cho Vercel)

### Core Stack
- **Runtime:** Node.js 18+ (Vercel native support)
- **Framework:** Express.js hoặc Next.js API Routes
- **Database:** 
  - **Option 1 (Recommended):** PostgreSQL trên Vercel Postgres hoặc Supabase
  - **Option 2:** MongoDB Atlas (cloud MongoDB)
  - **Option 3:** PlanetScale (MySQL serverless)
- **Authentication:** Google OAuth 2.0 verification
- **Payment:** Stripe (recommended) hoặc PayPal
- **Storage:** Vercel Blob Storage (cho file uploads nếu cần)

### Why this stack?
- ✅ Vercel native support cho Node.js
- ✅ Serverless functions (auto-scaling)
- ✅ Easy deployment với Git integration
- ✅ Built-in environment variables
- ✅ Edge network (fast globally)

---

## 📐 Architecture Overview

```
Chrome Extension
    ↓
besideai.work/api/* (Vercel Serverless Functions)
    ↓
Database (PostgreSQL/MongoDB)
    ↓
External Services (Stripe, Google OAuth)
```

### API Structure
```
besideai.work/
├── /api
│   ├── /health                    → Health check
│   ├── /users
│   │   └── /me                    → Get/Update user profile
│   ├── /subscription
│   │   ├── /status                → Get subscription status
│   │   ├── /upgrade               → Upgrade subscription
│   │   ├── /cancel                → Cancel subscription
│   │   └── /limits                → Get subscription limits
│   └── /usage
│       ├── ?period=day|month      → Get usage data
│       └── /sync                  → Sync usage data
```

---

## 🗂️ Development Phases

### Phase 1: Project Setup & Infrastructure (1-2 days)

#### 1.1 Vercel Project Setup
- [ ] Tạo Vercel account (nếu chưa có)
- [ ] Connect GitHub repository
- [ ] Setup domain `besideai.work` trong Vercel
- [ ] Configure DNS records:
  - [ ] A record hoặc CNAME → Vercel
  - [ ] SSL certificate (auto với Vercel)
- [ ] Test domain access

#### 1.2 Database Setup
- [ ] Chọn database provider (Vercel Personal plan):
  - [ ] ⚠️ **Option A: Vercel Postgres** - KHÔNG có trong Hobby plan (chỉ Pro+)
  - [ ] ✅ **Option B: Supabase** (PostgreSQL, **RECOMMENDED cho Hobby plan**)
    - Free tier: 500MB database, 2GB bandwidth
    - PostgreSQL (same as Vercel Postgres)
    - Auto backups
    - Easy setup
  - [ ] ✅ **Option C: MongoDB Atlas** (NoSQL, free tier available)
    - Free tier: 512MB storage
    - Good for flexible schema
  - [ ] ✅ **Option D: PlanetScale** (MySQL serverless, free tier available)
    - Free tier: 5GB storage
    - Serverless MySQL
- [ ] Create database instance
- [ ] Get connection string
- [ ] Test connection
- [ ] Setup database backup strategy

#### 1.3 Project Structure
- [ ] Initialize Node.js project
- [ ] Setup folder structure:
  ```
  backend/
  ├── api/
  │   ├── users/
  │   ├── subscription/
  │   └── usage/
  ├── lib/
  │   ├── db.js          → Database connection
  │   ├── auth.js        → Google OAuth verification
  │   └── stripe.js      → Stripe integration
  ├── models/
  │   ├── User.js
  │   ├── Subscription.js
  │   └── Usage.js
  ├── middleware/
  │   ├── auth.js        → Auth middleware
  │   └── cors.js        → CORS config
  ├── utils/
  │   ├── errors.js
  │   └── validation.js
  └── vercel.json        → Vercel config
  ```
- [ ] Setup package.json với dependencies
- [ ] Setup .env.example
- [ ] Setup .gitignore

#### 1.4 Environment Variables
- [ ] Database connection string
- [ ] Google OAuth client ID & secret
- [ ] Stripe API keys (test & production)
- [ ] JWT secret (nếu dùng)
- [ ] CORS allowed origins (Extension ID)
- [ ] Environment (development/staging/production)

---

### Phase 2: Database Schema & Models (1 day)

#### 2.1 Database Schema Design
- [ ] **Users Table**
  - [ ] id (UUID/string)
  - [ ] email (unique, indexed)
  - [ ] name
  - [ ] picture (URL)
  - [ ] google_id (unique, indexed)
  - [ ] preferences (JSON)
  - [ ] created_at
  - [ ] updated_at

- [ ] **Subscriptions Table**
  - [ ] id (UUID/string)
  - [ ] user_id (foreign key)
  - [ ] tier (enum: free, professional, premium, byok)
  - [ ] status (enum: active, trial, expired, cancelled)
  - [ ] trial_ends_at (timestamp, nullable)
  - [ ] subscription_ends_at (timestamp, nullable)
  - [ ] stripe_subscription_id (nullable)
  - [ ] stripe_customer_id (nullable)
  - [ ] billing_cycle (monthly/yearly, nullable)
  - [ ] created_at
  - [ ] updated_at

- [ ] **Usage Table**
  - [ ] id (UUID/string)
  - [ ] user_id (foreign key)
  - [ ] date (date, indexed)
  - [ ] tokens (integer, default 0)
  - [ ] requests (integer, default 0)
  - [ ] recording_time (integer, minutes, default 0)
  - [ ] translation_time (integer, minutes, default 0)
  - [ ] created_at
  - [ ] updated_at
  - [ ] Unique constraint: (user_id, date)

#### 2.2 Database Migrations
- [ ] Create migration system (nếu dùng PostgreSQL: node-pg-migrate hoặc Knex)
- [ ] Migration: Create users table
- [ ] Migration: Create subscriptions table
- [ ] Migration: Create usage table
- [ ] Migration: Create indexes
- [ ] Migration: Create foreign keys
- [ ] Test migrations (up & down)

#### 2.3 Models Implementation
- [ ] User model với methods:
  - [ ] create, findById, findByEmail, findByGoogleId
  - [ ] update, delete
  - [ ] getSubscription, getUsage
- [ ] Subscription model với methods:
  - [ ] create, findByUserId, update
  - [ ] upgrade, cancel, expire
- [ ] Usage model với methods:
  - [ ] create, findByUserIdAndDate, update
  - [ ] getTodayUsage, getMonthUsage
  - [ ] incrementUsage

---

### Phase 3: Authentication & Middleware (1 day)

#### 3.1 Google OAuth Verification
- [ ] Setup Google OAuth credentials:
  - [ ] Create OAuth 2.0 client trong Google Cloud Console
  - [ ] Add authorized redirect URIs
  - [ ] Get client ID & secret
- [ ] Implement token verification:
  - [ ] Verify Google token với Google API
  - [ ] Extract user info (email, name, picture, google_id)
  - [ ] Create or get user from database
- [ ] Error handling cho invalid tokens

#### 3.2 Auth Middleware
- [ ] Create `verifyAuth` middleware:
  - [ ] Extract token từ Authorization header
  - [ ] Verify token với Google
  - [ ] Attach user to request object
  - [ ] Handle errors (401, 403)
- [ ] Test middleware với valid/invalid tokens

#### 3.3 CORS Configuration
- [ ] Setup CORS middleware:
  - [ ] Allow Extension origin (chrome-extension://...)
  - [ ] Allow specific methods (GET, POST, PUT)
  - [ ] Allow specific headers (Authorization, Content-Type)
  - [ ] Handle preflight requests
- [ ] Test CORS với Extension

#### 3.4 Error Handling
- [ ] Create error handler middleware
- [ ] Standardize error responses:
  ```json
  {
    "error": "error_code",
    "message": "Human readable message",
    "details": {} // optional
  }
  ```
- [ ] Handle common errors:
  - [ ] 400 Bad Request
  - [ ] 401 Unauthorized
  - [ ] 403 Forbidden
  - [ ] 404 Not Found
  - [ ] 500 Internal Server Error

---

### Phase 4: Core API Endpoints (2-3 days)

#### 4.1 Health Check
- [ ] `GET /api/health`
  - [ ] Check database connection
  - [ ] Return status: `{ status: 'ok', timestamp: ... }`
  - [ ] Test endpoint

#### 4.2 User Endpoints
- [ ] `GET /api/users/me`
  - [ ] Require auth
  - [ ] Get user from database
  - [ ] Include subscription info
  - [ ] Return user object
  - [ ] Test endpoint

- [ ] `PUT /api/users/me`
  - [ ] Require auth
  - [ ] Validate request body
  - [ ] Update user preferences
  - [ ] Return updated user
  - [ ] Test endpoint

#### 4.3 Subscription Endpoints
- [ ] `GET /api/subscription/status`
  - [ ] Require auth
  - [ ] Get subscription from database
  - [ ] Return subscription object
  - [ ] Handle missing subscription (default to free)
  - [ ] Test endpoint

- [ ] `PUT /api/subscription/status`
  - [ ] Require auth
  - [ ] Validate request body
  - [ ] Update subscription status
  - [ ] Return updated subscription
  - [ ] Test endpoint

- [ ] `POST /api/subscription/upgrade`
  - [ ] Require auth
  - [ ] Validate tier & billing cycle
  - [ ] Create Stripe checkout session (nếu dùng Stripe)
  - [ ] Return checkout URL hoặc subscription data
  - [ ] Test endpoint

- [ ] `POST /api/subscription/cancel`
  - [ ] Require auth
  - [ ] Cancel Stripe subscription (nếu có)
  - [ ] Update subscription status to 'cancelled'
  - [ ] Return success
  - [ ] Test endpoint

- [ ] `GET /api/subscription/limits`
  - [ ] Require auth
  - [ ] Get subscription tier
  - [ ] Return limits based on tier
  - [ ] Test endpoint

#### 4.4 Usage Endpoints
- [ ] `GET /api/usage?period=day|month`
  - [ ] Require auth
  - [ ] Get usage data from database
  - [ ] Calculate totals (today/month)
  - [ ] Get limits from subscription
  - [ ] Return usage object
  - [ ] Test endpoint

- [ ] `POST /api/usage/sync`
  - [ ] Require auth
  - [ ] Validate request body
  - [ ] Upsert usage data (create or update)
  - [ ] Handle conflicts (backend-wins strategy)
  - [ ] Return success
  - [ ] Test endpoint

---

### Phase 5: Payment Integration (1-2 days)

#### 5.1 Stripe Setup
- [ ] Create Stripe account
- [ ] Get API keys (test & production)
- [ ] Setup webhook endpoint:
  - [ ] `POST /api/webhooks/stripe`
  - [ ] Verify webhook signature
  - [ ] Handle events:
    - [ ] `checkout.session.completed` → Activate subscription
    - [ ] `customer.subscription.updated` → Update subscription
    - [ ] `customer.subscription.deleted` → Cancel subscription
    - [ ] `invoice.payment_failed` → Handle failed payment
- [ ] Test webhook với Stripe CLI

#### 5.2 Upgrade Flow
- [ ] Create checkout session:
  - [ ] Setup pricing plans (Professional, Premium)
  - [ ] Create session với metadata (user_id, tier)
  - [ ] Return checkout URL
- [ ] Handle successful payment:
  - [ ] Webhook updates subscription
  - [ ] User redirected back to Extension
- [ ] Test full upgrade flow

#### 5.3 Subscription Management
- [ ] Cancel subscription:
  - [ ] Cancel in Stripe
  - [ ] Update database
  - [ ] Handle grace period (nếu có)
- [ ] Downgrade subscription:
  - [ ] Update tier
  - [ ] Prorate billing (nếu cần)
- [ ] Test cancel/downgrade flows

---

### Phase 6: Advanced Features (1-2 days)

#### 6.1 Usage Tracking Optimization
- [ ] Batch usage updates (reduce DB writes)
- [ ] Usage aggregation (daily/monthly summaries)
- [ ] Auto-reset daily limits (cron job hoặc scheduled function)
- [ ] Usage analytics (nếu cần)

#### 6.2 Rate Limiting
- [ ] Implement rate limiting:
  - [ ] Per user (prevent abuse)
  - [ ] Per endpoint
  - [ ] Use Vercel Edge Config hoặc Redis (nếu cần)
- [ ] Return 429 Too Many Requests
- [ ] Test rate limiting

#### 6.3 Data Validation
- [ ] Request validation middleware:
  - [ ] Validate request body schemas
  - [ ] Validate query parameters
  - [ ] Return 400 với validation errors
- [ ] Use library: Joi, Zod, hoặc express-validator

#### 6.4 Logging & Monitoring
- [ ] Setup logging:
  - [ ] Request logging
  - [ ] Error logging
  - [ ] Usage logging
- [ ] Integrate với Vercel Analytics (nếu cần)
- [ ] Setup error tracking (Sentry, LogRocket, etc.)

---

### Phase 7: Testing & Security (1-2 days)

#### 7.1 Unit Tests
- [ ] Test database models
- [ ] Test API endpoints (mocked)
- [ ] Test utility functions
- [ ] Setup test framework (Jest, Mocha, etc.)

#### 7.2 Integration Tests
- [ ] Test full API flows:
  - [ ] Login → Get user → Get subscription
  - [ ] Upgrade → Webhook → Subscription updated
  - [ ] Usage sync → Get usage
- [ ] Test với real database (test DB)
- [ ] Test error scenarios

#### 7.3 Security Audit
- [ ] Review authentication flow
- [ ] Review CORS configuration
- [ ] Review SQL injection prevention
- [ ] Review XSS prevention
- [ ] Review rate limiting
- [ ] Review environment variables (no secrets in code)
- [ ] Setup security headers (helmet.js)

#### 7.4 Performance Testing
- [ ] Test API response times
- [ ] Test database query performance
- [ ] Optimize slow queries
- [ ] Test concurrent requests
- [ ] Test with load (nếu cần)

---

### Phase 8: Deployment & Production (1 day)

#### 8.1 Pre-Deployment
- [ ] Review all environment variables
- [ ] Setup production database
- [ ] Run migrations on production DB
- [ ] Test với production database
- [ ] Review error handling
- [ ] Review logging

#### 8.2 Vercel Deployment
- [ ] Connect repository to Vercel
- [ ] Configure build settings:
  - [ ] Build command (nếu cần)
  - [ ] Output directory
  - [ ] Install command
- [ ] Setup environment variables trong Vercel:
  - [ ] Database URL
  - [ ] Google OAuth credentials
  - [ ] Stripe keys
  - [ ] CORS origins
- [ ] Deploy to preview
- [ ] Test preview deployment

#### 8.3 Domain Configuration
- [ ] Add domain `besideai.work` trong Vercel
- [ ] Configure DNS:
  - [ ] Add CNAME record: `api.besideai.work` → Vercel
  - [ ] Hoặc root domain: `besideai.work` → Vercel
- [ ] Wait for SSL certificate (auto)
- [ ] Test domain access

#### 8.4 Production Testing
- [ ] Test health check: `https://besideai.work/api/health`
- [ ] Test authentication flow
- [ ] Test subscription endpoints
- [ ] Test usage endpoints
- [ ] Test Stripe webhooks (production)
- [ ] Test CORS với Extension
- [ ] Monitor error logs

#### 8.5 Post-Deployment
- [ ] Setup monitoring alerts
- [ ] Setup backup strategy cho database
- [ ] Document API endpoints
- [ ] Create API documentation (nếu cần)
- [ ] Share backend URL với Extension team

---

## 🔧 Technical Decisions

### Database Choice: PostgreSQL trên Supabase (Recommended cho Hobby plan)

**Why Supabase?**
- ✅ **Free tier available** (500MB, perfect cho Hobby plan)
- ✅ PostgreSQL (same as Vercel Postgres)
- ✅ Strong consistency
- ✅ ACID transactions
- ✅ Good for subscription data
- ✅ Easy migrations
- ✅ Auto backups
- ✅ REST API available (bonus)
- ⚠️ Vercel Postgres KHÔNG có trong Hobby plan (chỉ Pro+ $20/month)

**Alternative: MongoDB Atlas**
- ✅ NoSQL flexibility
- ✅ Easy scaling
- ✅ Free tier available
- ⚠️ Less structured (có thể phức tạp hơn cho subscription logic)

### Payment Provider: Stripe (Recommended)

**Why Stripe?**
- ✅ Industry standard
- ✅ Good documentation
- ✅ Webhook support
- ✅ Subscription management
- ✅ Test mode available
- ✅ Multiple payment methods

**Alternative: PayPal**
- ✅ Popular
- ⚠️ Less flexible cho subscriptions

### Authentication: Google OAuth 2.0

**Implementation:**
- Extension đã có Google token
- Backend verify token với Google API
- Extract user info
- Create/get user in database

**No need for:**
- ❌ JWT tokens (dùng Google token trực tiếp)
- ❌ Session management (stateless API)

---

## 📊 API Contract Summary

### Request Format
```
Headers:
  Authorization: Bearer <google_token>
  Content-Type: application/json
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Error Format
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message",
  "details": {}
}
```

---

## 🚀 Quick Start Checklist

### Before Starting Development
- [ ] Vercel account created
- [ ] Domain `besideai.work` ready
- [ ] Database provider chosen
- [ ] Stripe account created (nếu dùng)
- [ ] Google OAuth credentials ready

### Development Order
1. ✅ Phase 1: Setup (1-2 days)
2. ✅ Phase 2: Database (1 day)
3. ✅ Phase 3: Auth (1 day)
4. ✅ Phase 4: Core APIs (2-3 days)
5. ✅ Phase 5: Payment (1-2 days)
6. ✅ Phase 6: Advanced (1-2 days)
7. ✅ Phase 7: Testing (1-2 days)
8. ✅ Phase 8: Deploy (1 day)

**Total Estimated Time: 9-14 days**

---

## 📝 Notes

### Vercel Personal (Hobby) Plan Limitations

**Available:**
- ✅ 100GB bandwidth/month (đủ cho small-medium traffic)
- ✅ 100GB-hours serverless functions/month
- ✅ Unlimited builds
- ✅ Custom domains
- ✅ SSL certificates
- ✅ Environment variables

**Limitations:**
- ⚠️ **Function timeout: 10 seconds** (Pro plan: 60s)
  - **Impact:** API calls phải hoàn thành trong 10s
  - **Solution:** Optimize database queries, use async operations
- ⚠️ **Vercel Postgres: KHÔNG có** (chỉ có trong Pro+)
  - **Solution:** Dùng Supabase, MongoDB Atlas, hoặc PlanetScale
- ⚠️ Cold starts (first request có thể chậm ~1-2s)
  - **Impact:** First request sau idle period
  - **Solution:** Keep functions warm với periodic pings (nếu cần)

**Recommendations:**
- ✅ **Supabase** là best choice cho Hobby plan (PostgreSQL, free tier)
- ✅ Function timeout 10s là đủ cho most API calls
- ✅ 100GB bandwidth đủ cho thousands of requests/month
- ✅ Monitor usage trong Vercel dashboard

### Database Connection
- **Important:** Vercel serverless functions cần connection pooling
- Use: `pg` với `pg-pool` hoặc `@vercel/postgres` SDK
- Avoid: Creating new connections mỗi request

### Cost Estimation
- **Vercel Personal (Hobby):** ✅ FREE
  - 100GB bandwidth/month
  - 100GB-hours serverless functions/month
  - 10s function timeout
  - Unlimited builds
- **Database:** 
  - ⚠️ Vercel Postgres: **KHÔNG có trong Hobby plan** (chỉ có trong Pro+)
  - ✅ Supabase: Free tier (500MB, perfect cho Hobby plan)
  - ✅ MongoDB Atlas: Free tier (512MB)
  - ✅ PlanetScale: Free tier (5GB)
- **Stripe:** Pay per transaction (2.9% + $0.30)
- **Total:** ~$0/month cho small-medium scale (với Supabase/MongoDB free tier)

---

## 🔄 Migration từ Vercel sang Server riêng

### Có trở ngại không?

**TL;DR: KHÔNG có trở ngại lớn nếu code được viết đúng cách.**

### ✅ Portable Components (Dễ migrate)

#### 1. Code Structure
- ✅ **Express.js/Node.js code** → 100% portable
- ✅ **API endpoints** → Chạy được trên bất kỳ Node.js server nào
- ✅ **Database models** → Không phụ thuộc Vercel
- ✅ **Business logic** → Independent

#### 2. Database
- ✅ **Supabase PostgreSQL** → Portable (standard PostgreSQL)
- ✅ **MongoDB Atlas** → Portable (standard MongoDB)
- ✅ **PlanetScale** → Portable (standard MySQL)
- ✅ Có thể export/import data dễ dàng

#### 3. External Services
- ✅ **Stripe** → Không phụ thuộc hosting
- ✅ **Google OAuth** → Không phụ thuộc hosting
- ✅ **Environment variables** → Standard, portable

### ⚠️ Vercel-Specific Features (Cần thay đổi)

#### 1. Serverless Functions
- **Vercel:** `/api/*` → Auto-routed serverless functions
- **Server riêng:** Cần Express.js routes thay vì serverless structure
- **Solution:** Code structure có thể dùng cho cả 2:
  ```javascript
  // Vercel: /api/users/me.js
  export default async function handler(req, res) { ... }
  
  // Server riêng: routes/users.js
  router.get('/me', async (req, res) => { ... })
  ```
- **Migration effort:** Low (chỉ cần refactor routing)

#### 2. Environment Variables
- **Vercel:** Dashboard-based
- **Server riêng:** `.env` file hoặc system env
- **Solution:** Dùng `.env` file từ đầu (Vercel cũng support)
- **Migration effort:** None (same format)

#### 3. Deployment
- **Vercel:** Git-based auto-deploy
- **Server riêng:** Manual deploy hoặc CI/CD
- **Solution:** Setup CI/CD (GitHub Actions, etc.)
- **Migration effort:** Medium (setup CI/CD)

#### 4. Domain & SSL
- **Vercel:** Auto SSL
- **Server riêng:** Cần setup Let's Encrypt hoặc SSL certificate
- **Solution:** Let's Encrypt (free, auto-renew)
- **Migration effort:** Low (one-time setup)

### 📋 Migration Checklist (Khi chuyển sang Server riêng)

#### Pre-Migration Preparation
- [ ] Code đã dùng standard Express.js (không dùng Vercel-specific APIs)
- [ ] Database connection dùng standard libraries (pg, mongodb, etc.)
- [ ] Environment variables trong `.env` file
- [ ] No hardcoded Vercel URLs
- [ ] API routes có thể chuyển sang Express router

#### Migration Steps
- [ ] Setup server (VPS, AWS EC2, DigitalOcean, etc.)
- [ ] Install Node.js, PM2 (process manager)
- [ ] Setup database (same PostgreSQL/MongoDB)
- [ ] Migrate code:
  - [ ] Convert serverless functions → Express routes
  - [ ] Update routing structure
  - [ ] Test all endpoints
- [ ] Setup reverse proxy (Nginx hoặc Caddy)
- [ ] Setup SSL (Let's Encrypt)
- [ ] Update DNS records
- [ ] Migrate environment variables
- [ ] Test production deployment
- [ ] Monitor và verify

#### Post-Migration
- [ ] Update Extension backend URL
- [ ] Test full integration
- [ ] Monitor performance
- [ ] Setup backups
- [ ] Setup monitoring (nếu cần)

### 🎯 Best Practices để Code Portable

#### 1. Use Standard Libraries
```javascript
// ✅ Good: Standard pg library
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ❌ Bad: Vercel-specific SDK
import { sql } from '@vercel/postgres';
```

#### 2. Abstract Database Connection
```javascript
// ✅ Good: Abstract connection
// lib/db.js
export function getDbConnection() {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

// ❌ Bad: Hardcode Vercel-specific connection
```

#### 3. Use Environment Variables
```javascript
// ✅ Good: Environment-based
const API_URL = process.env.API_URL || 'http://localhost:3000';

// ❌ Bad: Hardcode Vercel URL
const API_URL = 'https://besideai.work';
```

#### 4. Standard Express Structure
```javascript
// ✅ Good: Standard Express app
const app = express();
app.get('/api/users/me', handler);

// ❌ Bad: Vercel serverless-only structure
export default async function handler(req, res) { ... }
```

### 📊 Migration Effort Estimate

**Easy Migration (1-2 days):**
- ✅ Code dùng standard Express.js
- ✅ Database là Supabase/MongoDB (external)
- ✅ No Vercel-specific features
- ✅ Environment variables trong `.env`

**Medium Migration (3-5 days):**
- ⚠️ Cần refactor serverless functions → Express routes
- ⚠️ Cần setup CI/CD
- ⚠️ Cần setup SSL và domain

**Hard Migration (1+ week):**
- ❌ Code dùng nhiều Vercel-specific features
- ❌ Database là Vercel Postgres (cần migrate data)
- ❌ Tight coupling với Vercel infrastructure

### 💡 Recommendation

**Để dễ migrate sau này:**

1. ✅ **Dùng Supabase thay vì Vercel Postgres**
   - Database external, không lock-in
   - Dễ export/import

2. ✅ **Code structure:**
   - Dùng Express.js standard structure
   - Có thể chạy standalone hoặc trên Vercel
   - Abstract database connection

3. ✅ **Environment variables:**
   - Dùng `.env` file
   - Không hardcode URLs

4. ✅ **Avoid Vercel-specific features:**
   - Không dùng `@vercel/postgres`
   - Không dùng Vercel Edge Functions (nếu không cần)
   - Dùng standard Node.js libraries

### 🎯 Code Structure Recommendation

**Hybrid approach (chạy được cả Vercel và Server riêng):**

```
backend/
├── src/
│   ├── routes/          → Express routes (portable)
│   ├── models/          → Database models (portable)
│   ├── middleware/      → Middleware (portable)
│   └── utils/           → Utilities (portable)
├── api/                 → Vercel serverless wrappers
│   ├── users/
│   │   └── me.js        → Wrapper cho Vercel
│   └── subscription/
├── server.js            → Standalone Express server (cho server riêng)
├── vercel.json          → Vercel config
└── package.json
```

**Logic:**
- Core code trong `src/` → 100% portable
- Vercel wrappers trong `api/` → Chỉ cho Vercel
- `server.js` → Standalone server cho migration

---

## ✅ Status: READY TO START

Plan đã sẵn sàng. Có thể bắt đầu Phase 1 ngay!

**Next Step:** Confirm database choice và bắt đầu Phase 1.

**Migration Strategy:** Code sẽ được viết portable từ đầu để dễ migrate sau này.

