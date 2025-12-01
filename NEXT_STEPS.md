# 🚀 Next Steps - Action Plan

## 📋 Checklist theo thứ tự ưu tiên

### Bước 1: Setup Database (Supabase) ⚠️ QUAN TRỌNG

1. **Tạo Supabase account:**
   - Truy cập: https://supabase.com
   - Sign up (free tier đủ dùng)
   - Tạo new project

2. **Lấy connection string:**
   - Vào Settings → Database
   - Copy connection string (Connection string)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **Run migrations:**
   ```bash
   cd backend
   # Tạo file .env với DATABASE_URL
   echo "DATABASE_URL=your-connection-string" > .env
   
   # Run migrations
   npm install
   npm run migrate
   ```

4. **Verify tables:**
   - Vào Supabase Dashboard → Table Editor
   - Kiểm tra có 3 tables: `users`, `subscriptions`, `usage`

---

### Bước 2: Setup Google OAuth ⚠️ QUAN TRỌNG

1. **Tạo Google OAuth credentials:**
   - Truy cập: https://console.cloud.google.com
   - Tạo project mới (hoặc dùng project hiện có)
   - Vào APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: (có thể để trống hoặc thêm Extension redirect URI)
   - Copy Client ID và Client Secret

2. **Lưu credentials:**
   - `GOOGLE_CLIENT_ID`: Client ID
   - `GOOGLE_CLIENT_SECRET`: Client Secret

---

### Bước 3: Setup Stripe ⚠️ QUAN TRỌNG

1. **Tạo Stripe account:**
   - Truy cập: https://stripe.com
   - Sign up
   - Complete account setup

2. **Tạo Products & Prices:**
   
   **Professional Monthly:**
   - Products → Add product
   - Name: "Professional (Monthly)"
   - Price: $9.99 USD, Monthly
   - Copy Price ID (starts with `price_`)

   **Professional Yearly:**
   - Add price to same product
   - Price: $99.90 USD, Yearly
   - Copy Price ID

   **Premium Monthly:**
   - Add product: "Premium (Monthly)"
   - Price: $29.99 USD, Monthly
   - Copy Price ID

   **Premium Yearly:**
   - Add price: $299.90 USD, Yearly
   - Copy Price ID

3. **Setup Webhook:**
   - Developers → Webhooks → Add endpoint
   - URL: `https://besideai.work/api/webhooks/stripe` (sẽ update sau khi deploy)
   - Events: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy Signing secret (starts with `whsec_`)

4. **Lấy API keys:**
   - Dashboard → Developers → API keys
   - Copy Secret key (starts with `sk_test_` hoặc `sk_live_`)
   - Copy Publishable key (starts with `pk_test_` hoặc `pk_live_`)

---

### Bước 4: Deploy to Vercel 🚀

1. **Connect repository:**
   - Truy cập: https://vercel.com
   - Sign up/Login
   - Click "New Project"
   - Import Git repository (GitHub/GitLab/Bitbucket)
   - Select repository

2. **Configure project:**
   - **Root Directory:** `backend` (nếu repo root là parent folder)
   - **Framework Preset:** Other
   - **Build Command:** (để trống)
   - **Output Directory:** (để trống)
   - **Install Command:** `npm install`

3. **Add Environment Variables:**
   Vào Settings → Environment Variables, thêm:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://... (từ Supabase)
   GOOGLE_CLIENT_ID=... (từ Google)
   GOOGLE_CLIENT_SECRET=... (từ Google)
   STRIPE_SECRET_KEY=sk_test_... (từ Stripe)
   STRIPE_WEBHOOK_SECRET=whsec_... (từ Stripe)
   STRIPE_PUBLISHABLE_KEY=pk_test_... (từ Stripe)
   CORS_ORIGIN=chrome-extension://YOUR-EXTENSION-ID
   API_BASE_URL=https://besideai.work
   CRON_SECRET=your-random-secret-string
   ```

4. **Deploy:**
   - Click "Deploy"
   - Đợi deployment hoàn thành
   - Copy deployment URL

---

### Bước 5: Configure Domain 🌐

1. **Add domain trong Vercel:**
   - Vào Project → Settings → Domains
   - Add domain: `besideai.work`
   - Follow DNS instructions

2. **Configure DNS:**
   - Vào domain registrar (nơi mua domain)
   - Add CNAME record:
     - Name: `@` hoặc `besideai.work`
     - Value: `cname.vercel-dns.com` (hoặc giá trị Vercel cung cấp)

3. **Wait for SSL:**
   - Vercel tự động tạo SSL certificate
   - Đợi vài phút để SSL active

---

### Bước 6: Update Stripe Webhook URL 🔄

1. **Update webhook URL:**
   - Vào Stripe Dashboard → Webhooks
   - Edit webhook endpoint
   - Update URL: `https://besideai.work/api/webhooks/stripe`
   - Save

2. **Test webhook:**
   - Click "Send test webhook"
   - Verify webhook received

---

### Bước 7: Test Backend ✅

1. **Test health check:**
   ```bash
   curl https://besideai.work/api/health
   ```
   Expected: `{"success":true,"status":"ok",...}`

2. **Test authentication:**
   - Lấy Google OAuth token từ Extension
   - Test endpoint:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://besideai.work/api/users/me
   ```

3. **Test subscription:**
   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://besideai.work/api/subscription/status
   ```

4. **Test Stripe checkout:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"tier":"professional","billingCycle":"monthly"}' \
     https://besideai.work/api/subscription/upgrade
   ```

---

### Bước 8: Update Extension Configuration 🔌

1. **Update backend URL trong Extension:**
   - File: `modules/subscription/subscription-api-client.js`
   - Update `DEFAULT_BACKEND_URL`:
   ```javascript
   const DEFAULT_BACKEND_URL = 'https://besideai.work';
   ```

2. **Test Extension integration:**
   - Reload Extension
   - Test login flow
   - Test subscription sync
   - Test usage sync

---

### Bước 9: Monitor & Verify 📊

1. **Check Vercel logs:**
   - Vào Vercel Dashboard → Deployments
   - Click vào deployment → View Function Logs
   - Monitor errors

2. **Check Supabase:**
   - Monitor database usage
   - Check table data
   - Verify connections

3. **Check Stripe:**
   - Monitor webhook events
   - Check payment test
   - Verify subscriptions

---

## ⚠️ Important Notes

### Test Mode vs Production

**Development/Testing:**
- Use Stripe test keys (`sk_test_`, `pk_test_`)
- Use test webhook secret
- Test với Stripe test cards

**Production:**
- Switch to live keys (`sk_live_`, `pk_live_`)
- Create live products
- Update webhook secret
- Test với real payment (small amount)

### Security Checklist

- [ ] All environment variables set
- [ ] No secrets in code
- [ ] Database access restricted
- [ ] CORS properly configured
- [ ] Webhook signature verified
- [ ] SSL certificate active

### Performance

- Monitor Vercel function execution time
- Keep under 10s (Hobby plan limit)
- Optimize slow queries if needed
- Monitor database connection pool

---

## 🆘 Troubleshooting

### Database Connection Failed
- Check `DATABASE_URL` format
- Verify Supabase project is active
- Check network access

### Stripe Webhook Not Working
- Verify webhook URL is correct
- Check webhook secret matches
- Verify signature verification

### CORS Errors
- Check `CORS_ORIGIN` matches Extension ID
- Verify preflight requests
- Check browser console

### Function Timeout
- Optimize database queries
- Reduce function execution time
- Consider upgrading to Pro plan

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2

---

## ✅ Completion Checklist

- [ ] Database setup (Supabase)
- [ ] Migrations run
- [ ] Google OAuth configured
- [ ] Stripe account created
- [ ] Stripe products created
- [ ] Stripe webhook configured
- [ ] Vercel project created
- [ ] Environment variables added
- [ ] Deployed to Vercel
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Health check passing
- [ ] Authentication tested
- [ ] Subscription tested
- [ ] Stripe webhook tested
- [ ] Extension updated
- [ ] Integration tested
- [ ] Monitoring setup

**Sau khi hoàn thành tất cả, backend sẽ sẵn sàng cho production!** 🎉

