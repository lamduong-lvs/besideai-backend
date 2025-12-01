# Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Database URL (Supabase connection string)
- [ ] Google OAuth Client ID & Secret
- [ ] Stripe Secret Key & Webhook Secret
- [ ] CORS Origin (Chrome Extension ID)
- [ ] API Base URL
- [ ] Node Environment (production)

### 2. Database Setup
- [ ] Create production database (Supabase)
- [ ] Run migrations on production DB
- [ ] Test database connection
- [ ] Setup database backups

### 3. Stripe Setup
- [ ] Create Stripe account
- [ ] Create products & prices
- [ ] Setup webhook endpoint
- [ ] Get webhook signing secret
- [ ] Test with test mode

### 4. Code Review
- [ ] Review all environment variables
- [ ] Review error handling
- [ ] Review logging
- [ ] Review security measures

## 🚀 Vercel Deployment

### Step 1: Connect Repository
1. Go to https://vercel.com
2. Click "New Project"
3. Import your Git repository
4. Select the `backend` folder as root (or configure)

### Step 2: Configure Build Settings
Vercel auto-detects Node.js projects, but verify:
- **Framework Preset:** Other
- **Root Directory:** `backend` (if repo root is parent)
- **Build Command:** (leave empty, no build needed)
- **Output Directory:** (leave empty)
- **Install Command:** `npm install`

### Step 3: Environment Variables
Add in Vercel Dashboard → Settings → Environment Variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
CORS_ORIGIN=chrome-extension://...
API_BASE_URL=https://besideai.work
CRON_SECRET=your-random-secret
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment
3. Check deployment logs
4. Test health endpoint

### Step 5: Domain Configuration
1. Go to Settings → Domains
2. Add domain: `besideai.work`
3. Configure DNS:
   - Add CNAME: `@` → `cname.vercel-dns.com`
   - Or A record (if provided by Vercel)
4. Wait for SSL certificate (auto)
5. Test domain access

## 🧪 Post-Deployment Testing

### 1. Health Check
```bash
curl https://besideai.work/api/health
```

### 2. Authentication
```bash
curl -H "Authorization: Bearer <token>" \
  https://besideai.work/api/users/me
```

### 3. Subscription Endpoints
```bash
# Get subscription
curl -H "Authorization: Bearer <token>" \
  https://besideai.work/api/subscription/status

# Get limits
curl -H "Authorization: Bearer <token>" \
  https://besideai.work/api/subscription/limits
```

### 4. Usage Endpoints
```bash
# Get usage
curl -H "Authorization: Bearer <token>" \
  "https://besideai.work/api/usage?period=day"

# Sync usage
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tokens": 1000, "requests": 5}' \
  https://besideai.work/api/usage/sync
```

### 5. Stripe Webhook
1. Go to Stripe Dashboard → Webhooks
2. Test webhook endpoint
3. Verify events are received
4. Check database for updates

### 6. CORS Test
Test from Chrome Extension:
- Verify CORS headers
- Test preflight requests
- Test actual requests

## 📊 Monitoring

### Vercel Analytics
- View in Vercel Dashboard
- Monitor request counts
- Monitor response times
- Monitor error rates

### Error Tracking
- Setup Sentry (optional)
- Monitor error logs in Vercel
- Setup alerts for critical errors

### Database Monitoring
- Monitor Supabase dashboard
- Check connection pool usage
- Monitor query performance
- Setup alerts for high usage

## 🔄 Updates & Maintenance

### Deploying Updates
1. Push to Git repository
2. Vercel auto-deploys
3. Check deployment logs
4. Test endpoints
5. Monitor for errors

### Database Migrations
```bash
# Run migrations on production
npm run migrate
# Or manually run SQL files in Supabase dashboard
```

### Rollback
1. Go to Vercel Dashboard → Deployments
2. Find previous deployment
3. Click "Promote to Production"

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Check DATABASE_URL
- Verify database is accessible
- Check SSL settings

**2. Stripe Webhook Not Working**
- Verify webhook URL
- Check webhook secret
- Verify signature verification

**3. CORS Errors**
- Check CORS_ORIGIN
- Verify Extension ID
- Check preflight requests

**4. Function Timeout**
- Optimize database queries
- Reduce function execution time
- Consider upgrading to Pro plan

## 📝 Production Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Stripe webhook configured
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Health check passing
- [ ] All endpoints tested
- [ ] Error monitoring setup
- [ ] Backup strategy in place
- [ ] Documentation updated

