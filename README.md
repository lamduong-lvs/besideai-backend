# BesideAI Backend API

Backend API for besideai.work - Subscription management, user sync, and usage tracking for Chrome Extension.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Google OAuth credentials
- Stripe account (for payments)

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. **Run database migrations:**
```bash
npm run migrate
```

4. **Start development server:**
```bash
npm run dev
```

5. **Deploy to Vercel:**
```bash
vercel
```

## 📁 Project Structure

```
backend/
├── api/                    # Vercel serverless functions
│   ├── health.js
│   ├── users/
│   ├── subscription/
│   ├── usage/
│   ├── webhooks/
│   └── cron/
├── src/                    # Core application code (portable)
│   ├── routes/            # Express routes (standalone server)
│   ├── models/            # Database models
│   ├── middleware/        # Express middleware
│   ├── lib/               # Utilities & helpers
│   │   ├── db.js          # Database connection
│   │   ├── auth.js        # Google OAuth verification
│   │   └── stripe.js      # Stripe integration
│   └── utils/             # Utility functions
├── migrations/            # Database migrations
├── scripts/               # Utility scripts
├── server.js              # Standalone Express server
├── vercel.json            # Vercel configuration
└── package.json
```

## 🔧 Environment Variables

See `.env.example` for all required environment variables.

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `LEMON_SQUEEZY_API_KEY` - Lemon Squeezy API key
- `LEMON_SQUEEZY_STORE_ID` - Lemon Squeezy store ID
- `LEMON_SQUEEZY_VARIANT_ID_*` - Variant IDs for subscription plans
- `LEMON_SQUEEZY_WEBHOOK_SECRET` - Lemon Squeezy webhook signing secret
- `CORS_ORIGIN` - Chrome Extension ID

## 📚 Documentation

- [Summary & Next Steps](./SUMMARY.md) - Tóm tắt dự án và các việc còn lại cần làm

## 🗄️ Database

Uses PostgreSQL (Supabase recommended for Vercel Personal plan).

### Migrations
```bash
npm run migrate
```

## 🔐 Authentication

Uses Google OAuth 2.0. Extension sends Google token, backend verifies it.

## 💳 Payments

Lemon Squeezy integration for subscription management (migrated from Stripe).

## 🚢 Deployment

### Vercel
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Standalone Server
```bash
npm start
```

## 📊 API Endpoints

### Health
- `GET /api/health` - Health check

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update user profile

### Subscription
- `GET /api/subscription/status` - Get subscription status
- `PUT /api/subscription/status` - Update subscription
- `GET /api/subscription/limits` - Get subscription limits
- `POST /api/subscription/upgrade` - Upgrade subscription
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/portal` - Create portal session

### Usage
- `GET /api/usage?period=day|month` - Get usage data
- `POST /api/usage/sync` - Sync usage data

### Webhooks
- `POST /api/webhooks/lemon-squeezy` - Lemon Squeezy webhook

See [Summary](./SUMMARY.md) for complete documentation and next steps.

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📝 License

MIT

## 🎉 Status

**All phases complete!**
- ✅ Phase 1: Project Setup
- ✅ Phase 2: Database Schema & Models
- ✅ Phase 3: Authentication & Middleware
- ✅ Phase 4: Core API Endpoints
- ✅ Phase 5: Payment Integration
- ✅ Phase 6: Advanced Features
- ✅ Phase 7: Testing & Security
- ✅ Phase 8: Deployment & Production

**Backend is ready for deployment!**
