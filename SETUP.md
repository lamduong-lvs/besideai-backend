# Setup Guide - Phase 1

## ✅ Đã hoàn thành

### 1. Project Structure
- ✅ Tạo folder structure đầy đủ
- ✅ `package.json` với dependencies
- ✅ `vercel.json` configuration
- ✅ `.gitignore`
- ✅ `README.md`

### 2. Core Files
- ✅ `server.js` - Standalone Express server (portable)
- ✅ `src/lib/db.js` - Database connection (PostgreSQL)
- ✅ `src/lib/auth.js` - Google OAuth verification
- ✅ `src/middleware/auth.js` - Auth middleware
- ✅ `src/middleware/cors.js` - CORS configuration
- ✅ `src/middleware/error-handler.js` - Error handling
- ✅ `api/health.js` - Health check endpoint

## 📋 Next Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create `.env` File
Copy `.env.example` to `.env` and fill in:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Or manually create .env file with:
NODE_ENV=development
PORT=3000
DATABASE_URL=your-supabase-connection-string
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
CORS_ORIGIN=chrome-extension://your-extension-id
API_BASE_URL=https://besideai.work
```

### 3. Setup Supabase Database
1. Go to https://supabase.com
2. Create new project
3. Get connection string from Settings → Database
4. Add to `.env` as `DATABASE_URL`

### 4. Setup Google OAuth
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add to `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### 5. Setup Stripe
1. Go to https://stripe.com
2. Get test API keys from Dashboard
3. Add to `.env` as `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`

### 6. Test Locally
```bash
npm run dev
```

Visit: http://localhost:3000/health

### 7. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

## 🔍 Verify Setup

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

## 📝 Notes

- Database connection uses `pg` library (portable, not Vercel-specific)
- Code structure supports both Vercel serverless and standalone server
- All environment variables are in `.env.example`
- CORS is configured for Chrome Extension

