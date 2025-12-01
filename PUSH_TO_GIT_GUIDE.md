# 🚀 Hướng Dẫn Push Code Lên Git

## ⚠️ Git Chưa Được Cài

Bạn cần cài Git trước khi push code.

## 📦 Cách 1: Cài Git (Khuyến nghị)

### Option A: Git for Windows
1. Download từ: https://git-scm.com/download/win
2. Cài đặt (giữ default settings)
3. Restart PowerShell/Terminal
4. Chạy lại script

### Option B: GitHub Desktop (Dễ hơn)
1. Download từ: https://desktop.github.com/
2. Cài đặt và login
3. Add repository
4. Commit và push qua UI

## 🔧 Cách 2: Dùng Script PowerShell (Sau khi cài Git)

Script sẽ tự động:
- Check Git đã cài chưa
- Init repository (nếu chưa có)
- Add remote (nếu chưa có)
- Add, commit, và push code

```powershell
cd backend
.\push-to-github.ps1
```

## 📋 Các Files Cần Push

Các files mới cần được push:
- `api/models.js`
- `api/ai/call.js`
- `api/admin/add-api-key.js`
- `src/services/models-service.js`
- `src/services/api-keys-service.js`
- `src/lib/ai-providers/*`
- `src/middleware/limits-enforcer.js`
- `src/config/subscription-limits.js`
- `migrations/004_create_models_table.sql`
- `migrations/005_create_api_keys_table.sql`
- `vercel.json` (updated routes)

## 🎯 Sau Khi Push

1. Vercel sẽ tự động detect và deploy
2. Đợi 2-3 phút
3. Test endpoints:
   ```powershell
   Invoke-RestMethod -Uri "https://besideai.work/api/models"
   ```

---

**Bạn muốn cài Git hay dùng GitHub Desktop?**

