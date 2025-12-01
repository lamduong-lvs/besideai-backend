# 🚀 Tiếp Tục Deployment - Các Bước Còn Lại

## ✅ Đã Hoàn Thành
- [x] Step 1: Add ENCRYPTION_KEY to Vercel

## 📋 Các Bước Tiếp Theo

### Step 2: Deploy Database Migrations ⚠️ CẦN LÀM

**Vấn đề:** Migrations 004 và 005 chưa được chạy vì code mới chưa deploy lên Vercel.

**Giải pháp nhanh nhất:** Chạy migrations trực tiếp trên Supabase

1. **Mở Supabase SQL Editor:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select project
   - Go to **SQL Editor** → **New Query**

2. **Chạy Migration 004:**
   - Copy toàn bộ nội dung file: `backend/migrations/004_create_models_table.sql`
   - Paste vào SQL Editor
   - Click **Run** (hoặc Ctrl+Enter)

3. **Chạy Migration 005:**
   - Copy toàn bộ nội dung file: `backend/migrations/005_create_api_keys_table.sql`
   - Paste vào SQL Editor
   - Click **Run**

4. **Verify:**
   ```sql
   SELECT COUNT(*) FROM models;
   SELECT * FROM models WHERE enabled = true;
   ```

**Xem chi tiết:** `RUN_MIGRATIONS_MANUAL.md`

---

### Step 3: Add API Keys 🔑

Sau khi migrations chạy xong, add API keys:

```powershell
# OpenAI
.\scripts\add-api-key.ps1 -Provider "openai" -ApiKey "sk-..." -KeyName "Default OpenAI Key" -CronSecret "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"

# Anthropic
.\scripts\add-api-key.ps1 -Provider "anthropic" -ApiKey "sk-ant-..." -KeyName "Default Anthropic Key" -CronSecret "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"

# Google AI
.\scripts\add-api-key.ps1 -Provider "google" -ApiKey "..." -KeyName "Default Google AI Key" -CronSecret "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"
```

**Lưu ý:** Thay `sk-...` bằng API key thật của bạn.

---

### Step 4: Test Endpoints 🧪

```powershell
.\scripts\test-endpoints.ps1
```

Hoặc test manual:
```powershell
# Test health
Invoke-RestMethod -Uri "https://besideai.work/api/health"

# Test models
Invoke-RestMethod -Uri "https://besideai.work/api/models"
```

---

### Step 5: Test Extension 🧪

1. **Load Extension:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select extension folder

2. **Test Models:**
   - Click extension icon
   - Open Settings
   - Go to **"AI Models"** tab
   - Models should load from backend
   - Select a model and save

3. **Test AI Call:**
   - Make a test AI request
   - Verify it works

---

## 📝 Checklist

- [ ] Step 2: Run migrations 004, 005 on Supabase
- [ ] Step 3: Add API keys (OpenAI, Anthropic, Google)
- [ ] Step 4: Test endpoints
- [ ] Step 5: Test extension

---

## 🆘 Troubleshooting

### "Table already exists"
- OK, migrations đã chạy rồi. Tiếp tục với Step 3.

### "No API key found for provider"
- Chưa add API keys. Chạy Step 3.

### "401 Unauthorized"
- Check CRON_SECRET đúng chưa
- Check API endpoint URL đúng chưa

### Models not loading in extension
- Check backend URL trong extension code
- Check CORS settings
- Check browser console for errors

---

**Sẵn sàng? Bắt đầu với Step 2!** 🚀

