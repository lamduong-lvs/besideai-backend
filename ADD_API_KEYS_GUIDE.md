# 🔑 Step 3: Add API Keys - Hướng Dẫn

## ✅ Đã Hoàn Thành
- [x] Step 1: Add ENCRYPTION_KEY to Vercel
- [x] Step 2: Deploy Migrations

## 🔑 Step 3: Add API Keys

Bạn cần add API keys cho các AI providers vào database. Keys sẽ được **tự động mã hóa** khi lưu.

### Cách 1: Sử dụng PowerShell Script (Khuyến nghị)

```powershell
cd backend

# OpenAI
.\scripts\add-api-key.ps1 -Provider "openai" -ApiKey "sk-..." -KeyName "Default OpenAI Key" -CronSecret "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"

# Anthropic
.\scripts\add-api-key.ps1 -Provider "anthropic" -ApiKey "sk-ant-..." -KeyName "Default Anthropic Key" -CronSecret "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"

# Google AI
.\scripts\add-api-key.ps1 -Provider "google" -ApiKey "..." -KeyName "Default Google AI Key" -CronSecret "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"
```

**Lưu ý:** Thay `sk-...` bằng API key thật của bạn.

### Cách 2: Sử dụng curl (PowerShell)

```powershell
# OpenAI
$body = @{
    secret = "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"
    provider = "openai"
    apiKey = "sk-..."
    keyName = "Default OpenAI Key"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://besideai.work/api/admin/add-api-key" -Method Post -ContentType "application/json" -Body $body

# Anthropic
$body = @{
    secret = "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"
    provider = "anthropic"
    apiKey = "sk-ant-..."
    keyName = "Default Anthropic Key"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://besideai.work/api/admin/add-api-key" -Method Post -ContentType "application/json" -Body $body

# Google AI
$body = @{
    secret = "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"
    provider = "google"
    apiKey = "..."
    keyName = "Default Google AI Key"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://besideai.work/api/admin/add-api-key" -Method Post -ContentType "application/json" -Body $body
```

## 📝 Lấy API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy key (bắt đầu với `sk-`)

### Anthropic
1. Go to https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy key (bắt đầu với `sk-ant-`)

### Google AI
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy key

## ✅ Verify API Keys Đã Được Add

Sau khi add xong, verify bằng cách test endpoint:

```powershell
.\scripts\test-endpoints.ps1
```

Hoặc test manual:
```powershell
Invoke-RestMethod -Uri "https://besideai.work/api/models"
```

## 🆘 Troubleshooting

### "401 Unauthorized"
- Check CRON_SECRET đúng chưa
- Check API endpoint URL đúng chưa

### "No API key found for provider"
- API key chưa được add
- Check provider name đúng chưa (openai, anthropic, google)

### "Invalid API key"
- Check API key format đúng chưa
- Check API key còn valid không

## 🎯 Sau Khi Add Xong

Tiếp tục với **Step 4: Test Endpoints**

---

**Cần giúp?** Xem `CONTINUE_DEPLOYMENT.md`

