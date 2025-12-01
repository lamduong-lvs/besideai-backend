# Phase 2: Database Schema & Models - ✅ COMPLETE

## ✅ Đã hoàn thành

### 1. Database Schema (Migrations)

#### ✅ Users Table
- `id` (UUID, primary key)
- `email` (unique, indexed)
- `name`, `picture`
- `google_id` (unique, indexed)
- `preferences` (JSONB)
- `created_at`, `updated_at` (auto-updated)

#### ✅ Subscriptions Table
- `id` (UUID, primary key)
- `user_id` (foreign key to users)
- `tier` (enum: free, professional, premium, byok)
- `status` (enum: active, trial, expired, cancelled)
- `trial_ends_at`, `subscription_ends_at`
- `stripe_subscription_id`, `stripe_customer_id`
- `billing_cycle` (monthly, yearly)
- `created_at`, `updated_at`
- **Constraint:** One subscription per user (unique user_id)

#### ✅ Usage Table
- `id` (UUID, primary key)
- `user_id` (foreign key to users)
- `date` (DATE, indexed)
- `tokens`, `requests` (integers)
- `recording_time`, `translation_time` (minutes)
- `created_at`, `updated_at`
- **Constraint:** One record per user per day (unique user_id, date)

### 2. Models Implementation

#### ✅ User Model (`src/models/User.js`)
Methods:
- `create(userData)` - Create new user
- `findById(id)` - Find by UUID
- `findByEmail(email)` - Find by email
- `findByGoogleId(googleId)` - Find by Google ID
- `findOrCreateByGoogleId(userData)` - Find or create (for OAuth)
- `update(id, updates)` - Update user
- `delete(id)` - Delete user
- `getWithSubscription(id)` - Get user with subscription info

#### ✅ Subscription Model (`src/models/Subscription.js`)
Methods:
- `create(subscriptionData)` - Create subscription
- `findByUserId(userId)` - Find by user ID
- `findById(id)` - Find by subscription ID
- `findByStripeSubscriptionId(stripeId)` - Find by Stripe ID
- `update(userId, updates)` - Update subscription
- `upgrade(userId, newTier, options)` - Upgrade tier
- `cancel(userId)` - Cancel subscription
- `expire(userId)` - Expire subscription
- `startTrial(userId, tier, trialDays)` - Start trial

#### ✅ Usage Model (`src/models/Usage.js`)
Methods:
- `upsert(usageData)` - Create or increment usage
- `set(usageData)` - Set usage values (replace)
- `findByUserIdAndDate(userId, date)` - Find specific date
- `getTodayUsage(userId)` - Get today's usage
- `getUsageRange(userId, startDate, endDate)` - Get date range
- `getMonthUsage(userId, month)` - Get monthly totals
- `increment(userId, date, increments)` - Increment usage

### 3. Migration System

#### ✅ Migration Files
- `migrations/001_create_users_table.sql`
- `migrations/002_create_subscriptions_table.sql`
- `migrations/003_create_usage_table.sql`

#### ✅ Migration Script
- `scripts/run-migrations.js` - Run all migrations
- `npm run migrate` - Command to run migrations

## 📋 Database Schema Details

### Users Table
```sql
- id: UUID (primary key)
- email: VARCHAR(255) UNIQUE
- name: VARCHAR(255)
- picture: TEXT
- google_id: VARCHAR(255) UNIQUE
- preferences: JSONB (default: {})
- created_at, updated_at: TIMESTAMP
```

### Subscriptions Table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key, unique)
- tier: VARCHAR(50) (free, professional, premium, byok)
- status: VARCHAR(50) (active, trial, expired, cancelled)
- trial_ends_at: TIMESTAMP
- subscription_ends_at: TIMESTAMP
- stripe_subscription_id: VARCHAR(255)
- stripe_customer_id: VARCHAR(255)
- billing_cycle: VARCHAR(20) (monthly, yearly)
- created_at, updated_at: TIMESTAMP
```

### Usage Table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key)
- date: DATE
- tokens: INTEGER (default: 0)
- requests: INTEGER (default: 0)
- recording_time: INTEGER (minutes, default: 0)
- translation_time: INTEGER (minutes, default: 0)
- created_at, updated_at: TIMESTAMP
- UNIQUE (user_id, date)
```

## 🚀 Next Steps

### 1. Run Migrations
```bash
# Setup database connection in .env first
npm run migrate
```

### 2. Test Models
```javascript
import { User, Subscription, Usage } from './src/models/index.js';

// Test user creation
const user = await User.findOrCreateByGoogleId({
  googleId: '123',
  email: 'test@example.com',
  name: 'Test User'
});

// Test subscription
const subscription = await Subscription.create({
  userId: user.id,
  tier: 'free',
  status: 'active'
});

// Test usage
await Usage.upsert({
  userId: user.id,
  date: new Date(),
  tokens: 1000,
  requests: 5
});
```

### 3. Phase 3: Authentication & Middleware
- Google OAuth verification (already in `src/lib/auth.js`)
- Auth middleware (already in `src/middleware/auth.js`)
- CORS configuration (already in `src/middleware/cors.js`)
- Error handling (already in `src/middleware/error-handler.js`)

## 📝 Notes

- All models use connection pooling (via `src/lib/db.js`)
- Models are portable (work on Vercel and standalone server)
- Database uses PostgreSQL (Supabase compatible)
- UUIDs are used for all primary keys
- Timestamps are automatically updated via triggers
- Foreign keys have CASCADE delete (deleting user deletes related records)

## ✅ Checklist

- [x] Database schema design
- [x] Users table migration
- [x] Subscriptions table migration
- [x] Usage table migration
- [x] Indexes and constraints
- [x] User model implementation
- [x] Subscription model implementation
- [x] Usage model implementation
- [x] Migration system
- [x] Documentation

**Phase 2 Status: ✅ COMPLETE**

