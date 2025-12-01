# 🚀 Deployment Steps for Backend-Managed Models

## Step 1: Set Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following variables:

### Required:
```
ENCRYPTION_KEY=<32-byte-hex-string>
```
**Important:** Generate a secure 32-byte hex string:
```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Optional (if you want to add API keys via script):
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

3. **Redeploy** your Vercel project after adding environment variables

## Step 2: Deploy Database Migrations

### Option A: Via API Endpoint (Recommended)

```bash
# Get your CRON_SECRET from Vercel environment variables
curl -X POST https://besideai.work/api/migrate \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_CRON_SECRET"}'
```

### Option B: Via Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of:
   - `backend/migrations/004_create_models_table.sql`
   - `backend/migrations/005_create_api_keys_table.sql`
3. Run each SQL file

## Step 3: Add API Keys to Database

### Option A: Via API Endpoint

```bash
curl -X POST https://besideai.work/api/admin/add-api-key \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_CRON_SECRET",
    "provider": "openai",
    "apiKey": "sk-...",
    "keyName": "Default OpenAI Key"
  }'
```

Repeat for each provider:
- `provider: "anthropic"` with Anthropic API key
- `provider: "google"` with Google AI API key

### Option B: Via Script (Local)

1. Set environment variables in `.env`:
```env
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<your-32-byte-hex>
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

2. Run script:
```bash
cd backend
node scripts/add-api-keys.js
```

## Step 4: Test Endpoints

### Option A: Via Script

```bash
cd backend
node scripts/test-endpoints.js https://besideai.work
```

### Option B: Manual Testing

1. **Test Health Check:**
```bash
curl https://besideai.work/api/health
```

2. **Test Models Endpoint:**
```bash
curl https://besideai.work/api/models
curl https://besideai.work/api/models?tier=pro
```

3. **Test AI Call Endpoint (requires auth):**
```bash
# This should return 401 without auth token
curl -X POST https://besideai.work/api/ai/call \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Step 5: Verify Extension Integration

1. **Load Extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select your extension directory

2. **Open Settings:**
   - Click extension icon
   - Open settings panel
   - Go to "AI Models" tab

3. **Select a Model:**
   - Models should load from backend
   - Select a model based on your subscription tier
   - Click "Save Selection"

4. **Test AI Call:**
   - Make a test AI request
   - Verify it uses the selected model
   - Check that response comes from backend

## Step 6: Monitor and Debug

### Check Vercel Logs:
```bash
# View deployment logs in Vercel Dashboard
# Or use Vercel CLI:
vercel logs
```

### Check Database:
```sql
-- Verify models table
SELECT * FROM models WHERE enabled = true ORDER BY tier, priority DESC;

-- Verify API keys (encrypted)
SELECT provider, key_name, is_active, usage_count, last_used_at 
FROM api_keys 
WHERE is_active = true;
```

### Common Issues:

1. **"ENCRYPTION_KEY not set"**
   - Make sure ENCRYPTION_KEY is set in Vercel
   - Redeploy after adding environment variable

2. **"No API key found for provider"**
   - Add API keys to database (Step 3)
   - Verify keys are active in database

3. **"Model not available for tier"**
   - Check models table has correct tier assignments
   - Verify user's subscription tier

4. **"401 Unauthorized"**
   - Check Google OAuth token is valid
   - Verify CORS settings allow extension origin

## ✅ Verification Checklist

- [ ] ENCRYPTION_KEY set in Vercel
- [ ] Migrations deployed (models, api_keys tables exist)
- [ ] API keys added to database
- [ ] `/api/health` returns 200
- [ ] `/api/models` returns models list
- [ ] `/api/ai/call` requires authentication
- [ ] Extension loads models from backend
- [ ] Extension can make AI calls via backend
- [ ] Usage tracking works

## 📝 Next Steps After Deployment

1. **Monitor Usage:**
   - Check usage table for API call statistics
   - Monitor API key usage counts

2. **Add More Models:**
   - Insert new models into `models` table
   - Update priorities as needed

3. **Rotate API Keys:**
   - Add new keys, deactivate old ones
   - Monitor for any issues

4. **Scale:**
   - Add more API keys for load balancing
   - Monitor rate limits from providers

---

**Need Help?** Check `TROUBLESHOOTING.md` or Vercel logs.

