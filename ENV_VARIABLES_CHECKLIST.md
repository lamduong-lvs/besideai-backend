# ✅ Environment Variables Checklist

## ❌ Các Lỗi Cần Sửa Ngay

### 1. DATABASE_URL - ❌ SAI
**Hiện tại:** `ddsqqjybxczz.supabase.co:5432/postgres`  
**Phải là:**
```
postgresql://postgres:Dv007009%23%23%23%23@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres
```

**Lưu ý:** 
- Phải có đầy đủ: `postgresql://postgres:PASSWORD@HOST:PORT/DATABASE`
- Password đã được URL encode: `####` → `%23%23%23%23`
- Hostname đầy đủ: `db.gvllnfqmddsqqjybxczz.supabase.co`

---

### 2. CORS_ORIGIN - ❌ SAI
**Hiện tại:** `ision://lmijhojdkfmgihbkmjhgmedlibcndlag`  
**Phải là:**
```
chrome-extension://lmijhojdkfmgihbkmjhgmedlibcndlag
```

**Lưu ý:** 
- Phải có prefix `chrome-extension://`
- Extension ID: `lmijhojdkfmgihbkmjhgmedlibcndlag` (đúng)

---

### 3. API_BASE_URL (thứ 2) - ❌ SAI
**Hiện tại:** `besideai-backend.vercel.app`  
**Phải là:**
```
https://besideai-backend.vercel.app
```

**Lưu ý:** 
- Phải có protocol `https://`
- Hoặc dùng URL production thật sau khi deploy

---

### 4. CRON_SECRET - ❌ SAI
**Hiện tại:** `[GENERATE_RANDOM_STRING]`  
**Phải là:** Random string thật (64 ký tự hex)

**Cách tạo:**
```powershell
# Chạy trong PowerShell
.\generate-cron-secret.ps1
```

Hoặc:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Ví dụ output:** `7c1ecae9fa0696f75155cb825ce1ab9d367ccdc4a78ae09c1e96354cf2a4062c`

---

## ✅ Các Biến Đúng

### 1. NODE_ENV
- ✅ `production` (Production environment)
- ✅ `development` (Preview/Development environments)

### 2. GOOGLE_CLIENT_ID
- ✅ `3ftedv3kc1rs.apps.googleusercontent.com` (Format đúng)

### 3. GOOGLE_CLIENT_SECRET
- ✅ `j+3Dovgug7fmxkRxtfh7TjeNdJStBn0jOyc=` (Format đúng)

### 4. STRIPE_SECRET_KEY
- ⚠️ `sk_test_your_key` (Placeholder - cần thay bằng key thật sau)

### 5. STRIPE_PUBLISHABLE_KEY
- ⚠️ `pk_test_your_key` (Placeholder - cần thay bằng key thật sau)

### 6. STRIPE_WEBHOOK_SECRET
- ⚠️ `whsec_your_secret` (Placeholder - cần thay bằng secret thật sau)

### 7. API_BASE_URL (thứ 1)
- ✅ `https://besideai.work` (Production)

---

## 📋 Checklist Hoàn Chỉnh

Sau khi sửa, đảm bảo có đầy đủ:

- [ ] ✅ DATABASE_URL - Đầy đủ connection string với password encoded
- [ ] ✅ NODE_ENV (2 entries) - production và development
- [ ] ✅ GOOGLE_CLIENT_ID - Google OAuth Client ID
- [ ] ✅ GOOGLE_CLIENT_SECRET - Google OAuth Secret
- [ ] ⚠️ STRIPE_SECRET_KEY - Placeholder (OK tạm thời)
- [ ] ⚠️ STRIPE_PUBLISHABLE_KEY - Placeholder (OK tạm thời)
- [ ] ⚠️ STRIPE_WEBHOOK_SECRET - Placeholder (OK tạm thời)
- [ ] ✅ CORS_ORIGIN - Đầy đủ `chrome-extension://...`
- [ ] ✅ API_BASE_URL (2 entries) - Cả 2 đều có `https://`
- [ ] ✅ CRON_SECRET - Random string thật (64 ký tự hex)

---

## 🔧 Cách Sửa Trong Vercel

1. Vào Vercel Dashboard → Project → Settings → Environment Variables
2. Tìm biến cần sửa
3. Click vào biến đó
4. Sửa Value
5. Click "Save" hoặc "Update"
6. Redeploy project để áp dụng thay đổi

---

## ⚠️ Lưu Ý Quan Trọng

1. **DATABASE_URL** - Nếu sai, database connection sẽ fail
2. **CORS_ORIGIN** - Nếu sai, extension không thể gọi API
3. **CRON_SECRET** - Nếu là placeholder, migration endpoint sẽ không hoạt động
4. **API_BASE_URL** - Nếu thiếu `https://`, có thể gây lỗi khi gọi API

---

## ✅ Sau Khi Sửa

1. **Redeploy** project để áp dụng thay đổi
2. **Test** `/api/health` endpoint
3. **Kiểm tra** Function Logs để đảm bảo không có lỗi
4. **Test** database connection

