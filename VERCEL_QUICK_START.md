# 🚀 Hướng Dẫn Deploy Lên Vercel - Quick Start

## 📋 Tổng Quan

Sau khi code đã được push lên GitHub, bây giờ chúng ta sẽ deploy lên Vercel để:
- ✅ Test database connection (Vercel hỗ trợ IPv6 tốt hơn Windows)
- ✅ Có URL production để extension kết nối
- ✅ Tự động deploy khi push code mới

---

## Bước 1: Đăng Nhập Vercel

### 1.1 Truy Cập Vercel
1. Vào **https://vercel.com**
2. Click **"Sign Up"** (nếu chưa có tài khoản) hoặc **"Log In"**
3. Chọn **"Continue with GitHub"** để liên kết với GitHub account

### 1.2 Authorize Vercel
- GitHub sẽ hỏi quyền truy cập repositories
- Chọn **"Authorize vercel"** hoặc **"Grant access"**
- Vercel sẽ có quyền đọc và deploy code từ GitHub

---

## Bước 2: Import Project

### 2.1 Tạo Project Mới
1. Sau khi đăng nhập, bạn sẽ thấy Dashboard
2. Click **"Add New..."** → **"Project"**
   - Hoặc click **"New Project"** button

### 2.2 Chọn Repository
1. Vercel sẽ hiển thị danh sách GitHub repositories
2. Tìm và chọn **`besideai-backend`** (hoặc `lamduong-lvs/besideai-backend`)
3. Click **"Import"**

### 2.3 Cấu Hình Project

**Project Settings:**
- **Project Name:** `besideai-backend` (hoặc để mặc định)
- **Framework Preset:** **Other** (hoặc "No Framework")
- **Root Directory:** 
  - ✅ **Leave empty** (vì repository chỉ chứa backend code)
  - ⚠️ Nếu repo có cả extension và backend, set = `backend`
- **Build Command:** 
  - ✅ **Leave empty** (không cần build)
- **Output Directory:** 
  - ✅ **Leave empty**
- **Install Command:** 
  - ✅ `npm install` (mặc định)

**⚠️ Lưu ý:** 
- Không cần thay đổi gì nếu repository chỉ chứa backend
- Chỉ cần đảm bảo Root Directory đúng

---

## Bước 3: Thêm Environment Variables

**⚠️ QUAN TRỌNG:** Đừng click "Deploy" ngay! Thêm environment variables trước.

### 3.1 Mở Environment Variables Section

Trong màn hình cấu hình project, scroll xuống phần **"Environment Variables"**

### 3.2 Thêm Từng Biến

Click **"Add"** và thêm từng biến sau (chọn **Environment** = **Production, Preview, Development**):

#### 3.2.1 Database URL
```
Key: DATABASE_URL
Value: postgresql://postgres:Dv007009%23%23%23%23@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres
Environment: ✅ Production ✅ Preview ✅ Development
```

**Lưu ý:** Password đã được URL encode (`####` → `%23%23%23%23`)

#### 3.2.2 Node Environment
```
Key: NODE_ENV
Value: production
Environment: ✅ Production
```

```
Key: NODE_ENV
Value: development
Environment: ✅ Preview ✅ Development
```

#### 3.2.3 Google OAuth (Tạm thời - placeholder)
```
Key: GOOGLE_CLIENT_ID
Value: your-google-client-id
Environment: ✅ Production ✅ Preview ✅ Development
```

```
Key: GOOGLE_CLIENT_SECRET
Value: your-google-client-secret
Environment: ✅ Production ✅ Preview ✅ Development
```

**📝 Note:** Sau này bạn sẽ cần thay bằng Google OAuth credentials thật.

#### 3.2.4 Stripe (Tạm thời - test keys)
```
Key: STRIPE_SECRET_KEY
Value: sk_test_your_key
Environment: ✅ Production ✅ Preview ✅ Development
```

```
Key: STRIPE_PUBLISHABLE_KEY
Value: pk_test_your_key
Environment: ✅ Production ✅ Preview ✅ Development
```

```
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_your_secret
Environment: ✅ Production ✅ Preview ✅ Development
```

**📝 Note:** Sau này bạn sẽ cần thay bằng Stripe keys thật.

#### 3.2.5 CORS Origin
```
Key: CORS_ORIGIN
Value: chrome-extension://YOUR_EXTENSION_ID
Environment: ✅ Production ✅ Preview ✅ Development
```

**📝 Note:** 
- Thay `YOUR_EXTENSION_ID` bằng Extension ID thật của bạn
- Để tìm Extension ID: Chrome → Extensions → Developer mode → Copy ID

#### 3.2.6 API Base URL
```
Key: API_BASE_URL
Value: https://besideai.work
Environment: ✅ Production
```

```
Key: API_BASE_URL
Value: https://YOUR_PROJECT.vercel.app
Environment: ✅ Preview ✅ Development
```

**📝 Note:** `YOUR_PROJECT` sẽ là tên project bạn đặt ở Bước 2.3

#### 3.2.7 Cron Secret
```
Key: CRON_SECRET
Value: [GENERATE_RANDOM_STRING]
Environment: ✅ Production ✅ Preview ✅ Development
```

**Tạo random secret:**
```powershell
# Chạy trong PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output và paste vào value.

### 3.3 Verify Environment Variables

Sau khi thêm tất cả, kiểm tra lại danh sách:
- ✅ DATABASE_URL
- ✅ NODE_ENV (2 entries: production và development)
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_PUBLISHABLE_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ CORS_ORIGIN
- ✅ API_BASE_URL (2 entries: production và preview/development)
- ✅ CRON_SECRET

**Tổng cộng:** 11 environment variables

---

## Bước 4: Deploy

### 4.1 Trigger Deployment
1. Sau khi thêm tất cả environment variables
2. Scroll xuống cuối trang
3. Click **"Deploy"** button

### 4.2 Chờ Deployment

Vercel sẽ:
1. Install dependencies (`npm install`)
2. Build project (nếu có)
3. Deploy functions
4. Tạo URLs

**Thời gian:** Thường 1-3 phút

### 4.3 Xem Deployment Logs

Trong quá trình deploy, bạn sẽ thấy:
- ✅ Installing dependencies...
- ✅ Building...
- ✅ Deploying...

Nếu có lỗi, sẽ hiển thị trong logs.

---

## Bước 5: Kiểm Tra Deployment

### 5.1 Lấy Deployment URL

Sau khi deploy thành công, bạn sẽ thấy:
- **Production URL:** `https://besideai-backend.vercel.app` (hoặc tên project của bạn)
- **Deployment Status:** ✅ Ready

### 5.2 Test Health Endpoint

Mở browser hoặc dùng PowerShell:

```powershell
# Thay YOUR_PROJECT bằng tên project của bạn
$url = "https://YOUR_PROJECT.vercel.app/api/health"
Invoke-WebRequest -Uri $url | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**✅ Nếu thấy `"database": "connected"` → Database connection thành công!**

### 5.3 Kiểm Tra Function Logs

1. Vào Vercel Dashboard → **Functions** tab
2. Click vào function `/api/health`
3. Xem **Logs** để kiểm tra:
   - ✅ `[DB] Database connection pool created`
   - ✅ `[DB] Query executed`
   - ❌ Không có lỗi `ENOTFOUND` hoặc `ENETUNREACH`

---

## Bước 6: Chạy Database Migrations

Sau khi database connection thành công, chạy migrations để tạo tables.

### Option A: Dùng Migration Endpoint (Khuyến nghị)

```powershell
# Thay YOUR_PROJECT và YOUR_CRON_SECRET
$url = "https://YOUR_PROJECT.vercel.app/api/migrate"
$body = @{
    secret = "YOUR_CRON_SECRET"
} | ConvertTo-Json

Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Migrations completed",
  "results": [
    {"migration": "001_create_users_table.sql", "status": "success"},
    {"migration": "002_create_subscriptions_table.sql", "status": "success"},
    {"migration": "003_create_usage_table.sql", "status": "success"}
  ]
}
```

### Option B: Dùng Supabase SQL Editor

1. Vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Copy nội dung từ `backend/migrations/001_create_users_table.sql`
5. Paste và click **Run**
6. Lặp lại cho:
   - `002_create_subscriptions_table.sql`
   - `003_create_usage_table.sql`

### Verify Tables Created

Từ Supabase Dashboard → **Table Editor**, kiểm tra có 3 tables:
- ✅ `users`
- ✅ `subscriptions`
- ✅ `usage`

---

## Bước 7: Cấu Hình Domain (Optional - Sau Này)

### 7.1 Thêm Domain

1. Vào Vercel Dashboard → **Settings** → **Domains**
2. Nhập domain: `besideai.work`
3. Click **Add**

### 7.2 Cấu Hình DNS

Vercel sẽ hiển thị hướng dẫn DNS. Thường là:

**CNAME Record:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

Hoặc **A Record** (nếu Vercel cung cấp IP)

### 7.3 Chờ SSL Certificate

- Vercel tự động tạo SSL certificate (Let's Encrypt)
- Thường mất 1-5 phút
- Test: `https://besideai.work/api/health`

### 7.4 Update Environment Variables

Sau khi domain hoạt động, update `API_BASE_URL`:
```
Key: API_BASE_URL
Value: https://besideai.work
Environment: Production
```

---

## ✅ Checklist Hoàn Thành

Sau khi deploy, đảm bảo:

- [ ] ✅ Code đã được push lên GitHub
- [ ] ✅ Vercel project đã được tạo
- [ ] ✅ Tất cả environment variables đã được thêm
- [ ] ✅ Deployment thành công
- [ ] ✅ Health endpoint trả về `"database": "connected"`
- [ ] ✅ Database migrations đã được chạy
- [ ] ✅ Tables đã được tạo trong Supabase
- [ ] ✅ Function logs không có lỗi

---

## 🐛 Troubleshooting

### Lỗi: "Build failed"
- Kiểm tra `package.json` có đúng dependencies không
- Xem Build Logs để biết lỗi cụ thể

### Lỗi: "Database connection failed"
- Kiểm tra `DATABASE_URL` trong Environment Variables
- Kiểm tra Supabase project status (phải Active)
- Xem Function Logs để biết lỗi cụ thể

### Lỗi: "Function timeout"
- Database connection có thể mất thời gian
- Kiểm tra Supabase connection string
- Xem `backend/TROUBLESHOOTING.md`

### Lỗi: "404 Not Found"
- Kiểm tra `vercel.json` routing configuration
- Kiểm tra file structure: `api/` folder phải ở root

---

## 📚 Tài Liệu Tham Khảo

- **Chi tiết hơn:** Xem `VERCEL_DEPLOYMENT_GUIDE.md`
- **Troubleshooting:** Xem `TROUBLESHOOTING.md`
- **API Documentation:** Xem `API_DOCUMENTATION.md`

---

## 🎉 Sau Khi Deploy Thành Công

1. ✅ **Update Extension:**
   - Update `BACKEND_URL` trong extension code
   - Test extension connection với backend

2. ✅ **Setup Google OAuth:**
   - Tạo OAuth credentials
   - Update `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` trong Vercel

3. ✅ **Setup Stripe:**
   - Tạo Stripe account
   - Tạo products & prices
   - Setup webhook
   - Update Stripe keys trong Vercel

4. ✅ **Monitor:**
   - Xem Vercel Analytics
   - Xem Function Logs
   - Setup error tracking (nếu cần)

---

**Chúc bạn deploy thành công! 🚀**

