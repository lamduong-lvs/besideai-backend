# ⚡ Quick Deploy Guide

## 🎯 Quick Steps

### 1. Generate Encryption Key (if not done)

```bash
cd backend
node scripts/generate-encryption-key.js
```

Copy the generated key.

### 2. Add to Vercel Environment Variables

Go to Vercel Dashboard → Project → Settings → Environment Variables

Add:
```
ENCRYPTION_KEY=<paste-generated-key-here>
```

**Important:** Redeploy after adding environment variable!

### 3. Deploy Migrations

```bash
# Option A: Via script
cd backend
node scripts/deploy-migrations.js https://besideai.work YOUR_CRON_SECRET

# Option B: Via curl
curl -X POST https://besideai.work/api/migrate \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_CRON_SECRET"}'
```

### 4. Add API Keys

```bash
# Via API (recommended)
curl -X POST https://besideai.work/api/admin/add-api-key \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_CRON_SECRET",
    "provider": "openai",
    "apiKey": "sk-...",
    "keyName": "Default OpenAI Key"
  }'

# Repeat for other providers:
# - provider: "anthropic"
# - provider: "google"
```

### 5. Test Endpoints

```bash
# Test health
curl https://besideai.work/api/health

# Test models
curl https://besideai.work/api/models

# Test with script
cd backend
node scripts/test-endpoints.js https://besideai.work
```

## ✅ Verification

- [ ] ENCRYPTION_KEY added to Vercel
- [ ] Migrations deployed successfully
- [ ] API keys added to database
- [ ] `/api/models` returns models list
- [ ] Extension can load models

## 📝 Notes

- **ENCRYPTION_KEY**: Must be 32-byte hex string (64 characters)
- **CRON_SECRET**: Get from Vercel environment variables
- **API Keys**: Will be encrypted automatically when stored

---

For detailed steps, see `DEPLOYMENT_STEPS.md`

