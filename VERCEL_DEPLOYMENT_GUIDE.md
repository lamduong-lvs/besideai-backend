# 🚀 Hướng Dẫn Deploy Backend Lên Vercel (Chi Tiết)

## 📋 Mục Lục
1. [Chuẩn Bị](#chuẩn-bị)
2. [Setup GitHub Repository](#setup-github-repository)
3. [Tạo Vercel Project](#tạo-vercel-project)
4. [Cấu Hình Environment Variables](#cấu-hình-environment-variables)
5. [Deploy](#deploy)
6. [Test Database Connection](#test-database-connection)
7. [Chạy Database Migrations](#chạy-database-migrations)
8. [Cấu Hình Domain](#cấu-hình-domain)
9. [Troubleshooting](#troubleshooting)

---

## 1. Chuẩn Bị

### 1.1 Kiểm Tra Code
Đảm bảo bạn đã có:
- ✅ File `package.json` với dependencies
- ✅ File `vercel.json` với routing configuration
- ✅ File `.env` với connection string (để tham khảo, không commit)
- ✅ Tất cả code backend đã hoàn thiện

### 1.2 Kiểm Tra Git
```bash
# Kiểm tra xem đã có Git repository chưa
cd backend
git status

# Nếu chưa có, khởi tạo Git
git init
```

---

## 2. Setup GitHub Repository

### 2.1 Tạo Repository trên GitHub

1. Đăng nhập vào [GitHub](https://github.com)
2. Click **"New repository"** (hoặc vào https://github.com/new)
3. Điền thông tin:
   - **Repository name:** `besideai-backend` (hoặc tên bạn muốn)
   - **Description:** "Backend API for BesideAI Chrome Extension"
   - **Visibility:** Private (khuyến nghị) hoặc Public
   - **Không** check "Initialize with README" (nếu code đã có sẵn)
4. Click **"Create repository"**

### 2.2 Push Code Lên GitHub

```bash
# Đảm bảo bạn đang ở thư mục backend
cd backend

# Kiểm tra .gitignore có ignore .env chưa
# Nếu chưa có .gitignore, tạo file:
cat > .gitignore << EOF
node_modules/
.env
.env.local
.env.production
.DS_Store
*.log
.vercel
EOF

# Add tất cả files
git add .

# Commit
git commit -m "Initial commit: Backend API for BesideAI"

# Thêm remote (thay YOUR_USERNAME và YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push lên GitHub
git branch -M main
git push -u origin main
```

**Lưu ý:** 
- Thay `YOUR_USERNAME` bằng GitHub username của bạn
- Thay `YOUR_REPO` bằng tên repository bạn vừa tạo
- Nếu dùng SSH: `git@github.com:YOUR_USERNAME/YOUR_REPO.git`

### 2.3 Verify
Kiểm tra trên GitHub xem code đã được push thành công.

---

## 3. Tạo Vercel Project

### 3.1 Đăng Ký/Đăng Nhập Vercel

1. Vào [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"** (nếu chưa có tài khoản)
3. Chọn **"Continue with GitHub"** để liên kết với GitHub
4. Authorize Vercel truy cập GitHub repositories

### 3.2 Import Project

1. Sau khi đăng nhập, click **"Add New..."** → **"Project"**
2. Tìm và chọn repository `besideai-backend` (hoặc tên repo bạn đã tạo)
3. Click **"Import"**

### 3.3 Cấu Hình Project

**Project Settings:**
- **Project Name:** `besideai-backend` (hoặc tên bạn muốn)
- **Framework Preset:** **Other** (hoặc "No Framework")
- **Root Directory:** 
  - Nếu repo chỉ chứa backend code: **Leave empty** hoặc `./`
  - Nếu repo chứa cả extension và backend: `backend`
- **Build Command:** **Leave empty** (không cần build)
- **Output Directory:** **Leave empty**
- **Install Command:** `npm install`

**Lưu ý:** 
- Nếu bạn đã tạo repo riêng cho backend, Root Directory để trống
- Nếu backend nằm trong subfolder của repo lớn, set Root Directory = `backend`

### 3.4 Environment Variables (Tạm thời bỏ qua)
Chúng ta sẽ thêm environment variables ở bước sau. Click **"Deploy"** trước để tạo project.

---

## 4. Cấu Hình Environment Variables

Sau khi project được tạo, vào **Settings** → **Environment Variables**

### 4.1 Thêm Các Biến Môi Trường

Thêm từng biến một, chọn **Environment** = **Production, Preview, Development** (hoặc chỉ Production nếu muốn):

#### 4.1.1 Database Configuration
```
Key: DATABASE_URL
Value: postgresql://postgres:Dv007009%23%23%23%23@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres
Environment: Production, Preview, Development
```

**Lưu ý:** Password đã được URL encode (`####` → `%23%23%23%23`)

#### 4.1.2 Node Environment
```
Key: NODE_ENV
Value: production
Environment: Production
```

```
Key: NODE_ENV
Value: development
Environment: Preview, Development
```

#### 4.1.3 Google OAuth (Tạm thời dùng placeholder)
```
Key: GOOGLE_CLIENT_ID
Value: your-google-client-id
Environment: Production, Preview, Development
```

```
Key: GOOGLE_CLIENT_SECRET
Value: your-google-client-secret
Environment: Production, Preview, Development
```

**Lưu ý:** Sau này bạn sẽ cần thay bằng Google OAuth credentials thật.

#### 4.1.4 Stripe (Tạm thời dùng test keys)
```
Key: STRIPE_SECRET_KEY
Value: sk_test_your_key
Environment: Production, Preview, Development
```

```
Key: STRIPE_PUBLISHABLE_KEY
Value: pk_test_your_key
Environment: Production, Preview, Development
```

```
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_your_secret
Environment: Production, Preview, Development
```

**Lưu ý:** Sau này bạn sẽ cần thay bằng Stripe keys thật.

#### 4.1.5 CORS & API
```
Key: CORS_ORIGIN
Value: chrome-extension://YOUR_EXTENSION_ID
Environment: Production, Preview, Development
```

**Lưu ý:** Thay `YOUR_EXTENSION_ID` bằng Extension ID thật của bạn.

```
Key: API_BASE_URL
Value: https://besideai.work
Environment: Production
```

```
Key: API_BASE_URL
Value: https://YOUR_PROJECT.vercel.app
Environment: Preview, Development
```

#### 4.1.6 Cron Secret
```
Key: CRON_SECRET
Value: your-random-secret-string-here
Environment: Production, Preview, Development
```

**Tạo random secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.2 Verify Environment Variables

Sau khi thêm tất cả, kiểm tra lại danh sách:
- ✅ DATABASE_URL
- ✅ NODE_ENV
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_PUBLISHABLE_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ CORS_ORIGIN
- ✅ API_BASE_URL
- ✅ CRON_SECRET

---

## 5. Deploy

### 5.1 Trigger Deployment

Sau khi thêm environment variables, Vercel sẽ tự động trigger deployment mới. Hoặc:

1. Vào **Deployments** tab
2. Click **"Redeploy"** → **"Use Existing Build Cache"** (hoặc không dùng cache)
3. Chờ deployment hoàn thành (thường 1-3 phút)

### 5.2 Kiểm Tra Deployment Logs

1. Click vào deployment mới nhất
2. Xem **Build Logs** để kiểm tra:
   - ✅ Dependencies installed successfully
   - ✅ No build errors
   - ✅ Functions deployed

### 5.3 Lấy Deployment URL

Sau khi deploy thành công, bạn sẽ có URL:
- **Production:** `https://YOUR_PROJECT.vercel.app`
- **Preview:** `https://YOUR_PROJECT-GIT_BRANCH.vercel.app`

Copy URL này để test.

---

## 6. Test Database Connection

### 6.1 Test Health Endpoint

Mở browser hoặc dùng curl:

```bash
# Thay YOUR_PROJECT bằng tên project của bạn
curl https://YOUR_PROJECT.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Nếu thấy `"database": "connected"` → ✅ Database connection thành công!

### 6.2 Kiểm Tra Vercel Function Logs

1. Vào Vercel Dashboard → **Functions** tab
2. Click vào function `/api/health`
3. Xem **Logs** để kiểm tra:
   - ✅ `[DB] Database connection pool created`
   - ✅ `[DB] Query executed`
   - ❌ Không có lỗi `ENOTFOUND` hoặc `ENETUNREACH`

### 6.3 Troubleshooting

Nếu health check fail:
1. Kiểm tra **Function Logs** để xem lỗi cụ thể
2. Kiểm tra `DATABASE_URL` trong Environment Variables
3. Kiểm tra Supabase project status (phải Active)
4. Xem `backend/TROUBLESHOOTING.md` để biết thêm

---

## 7. Chạy Database Migrations

Sau khi database connection thành công, chạy migrations để tạo tables.

### 7.1 Option A: Tạo Migration Script trên Vercel (Khuyến nghị)

Tạo một API endpoint tạm thời để chạy migrations:

**File: `backend/api/migrate.js`** (tạo mới)
```javascript
import { query } from '../../src/lib/db.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function handler(req, res) {
  // Security: Only allow POST with secret
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const migrationsDir = join(__dirname, '../../migrations');
    const migrations = [
      '001_create_users_table.sql',
      '002_create_subscriptions_table.sql',
      '003_create_usage_table.sql'
    ];

    const results = [];

    for (const migration of migrations) {
      const sql = readFileSync(join(migrationsDir, migration), 'utf-8');
      await query(sql);
      results.push({ migration, status: 'success' });
      console.log(`[Migration] ✅ ${migration} executed`);
    }

    return res.status(200).json({
      success: true,
      message: 'Migrations completed',
      results
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

**Cách sử dụng:**
```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/migrate \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-cron-secret"}'
```

### 7.2 Option B: Chạy từ Supabase SQL Editor

1. Vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Copy nội dung từ `backend/migrations/001_create_users_table.sql`
5. Paste vào SQL Editor và click **Run**
6. Lặp lại cho các file migration còn lại:
   - `002_create_subscriptions_table.sql`
   - `003_create_usage_table.sql`

### 7.3 Verify Tables Created

Test bằng cách query:

```bash
# Test users table
curl https://YOUR_PROJECT.vercel.app/api/users/me \
  -H "Authorization: Bearer test-token"
```

Hoặc từ Supabase Dashboard → **Table Editor**, kiểm tra xem có 3 tables:
- ✅ `users`
- ✅ `subscriptions`
- ✅ `usage`

---

## 8. Cấu Hình Domain

### 8.1 Thêm Domain vào Vercel

1. Vào Vercel Dashboard → **Settings** → **Domains**
2. Nhập domain: `besideai.work`
3. Click **Add**

### 8.2 Cấu Hình DNS

Vercel sẽ hiển thị hướng dẫn DNS. Thường là:

**Option 1: CNAME (Khuyến nghị)**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**Option 2: A Record**
```
Type: A
Name: @
Value: 76.76.21.21 (hoặc IP mà Vercel cung cấp)
```

**Option 3: CNAME cho subdomain**
```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

### 8.3 Chờ SSL Certificate

Sau khi DNS được cấu hình đúng:
1. Vercel sẽ tự động tạo SSL certificate (Let's Encrypt)
2. Thường mất 1-5 phút
3. Kiểm tra: `https://besideai.work/api/health`

### 8.4 Update Environment Variables

Sau khi domain hoạt động, update `API_BASE_URL`:
```
Key: API_BASE_URL
Value: https://besideai.work
Environment: Production
```

---

## 9. Troubleshooting

### 9.1 Deployment Failed

**Lỗi:** "Build failed"
- Kiểm tra `package.json` có đúng dependencies không
- Kiểm tra Node.js version (Vercel auto-detect, thường là 18.x)
- Xem Build Logs để biết lỗi cụ thể

**Lỗi:** "Function timeout"
- Kiểm tra `vercel.json` có đúng timeout không
- Database connection có thể mất thời gian, tăng timeout nếu cần

### 9.2 Database Connection Failed

**Lỗi:** "ENOTFOUND" hoặc "ENETUNREACH"
- Kiểm tra `DATABASE_URL` trong Environment Variables
- Kiểm tra Supabase project status (phải Active)
- Xem `backend/TROUBLESHOOTING.md`

**Lỗi:** "password authentication failed"
- Kiểm tra password đã được URL encode chưa (`#` → `%23`)
- Kiểm tra password trong Supabase Dashboard

### 9.3 API Endpoints Not Working

**Lỗi:** "404 Not Found"
- Kiểm tra `vercel.json` routing configuration
- Kiểm tra file structure: `api/` folder phải ở root hoặc đúng path
- Kiểm tra function name có đúng không

**Lỗi:** "CORS error"
- Kiểm tra `CORS_ORIGIN` trong Environment Variables
- Kiểm tra Extension ID có đúng không
- Kiểm tra CORS middleware trong code

### 9.4 Migrations Failed

**Lỗi:** "relation already exists"
- Tables đã được tạo rồi, không cần chạy lại
- Hoặc drop tables và chạy lại (cẩn thận với production data!)

**Lỗi:** "permission denied"
- Kiểm tra database user có quyền CREATE TABLE không
- Supabase thường cho phép, nhưng kiểm tra lại

---

## 10. Next Steps

Sau khi deploy thành công:

1. ✅ **Test tất cả API endpoints:**
   - `/api/health`
   - `/api/users/me`
   - `/api/subscription/status`
   - `/api/usage`

2. ✅ **Update Extension:**
   - Update `BACKEND_URL` trong extension code
   - Test extension connection với backend

3. ✅ **Setup Google OAuth:**
   - Tạo OAuth credentials
   - Update `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`

4. ✅ **Setup Stripe:**
   - Tạo Stripe account
   - Tạo products & prices
   - Setup webhook
   - Update Stripe keys

5. ✅ **Monitor:**
   - Xem Vercel Analytics
   - Xem Function Logs
   - Setup error tracking (nếu cần)

---

## 📞 Support

Nếu gặp vấn đề:
1. Xem `backend/TROUBLESHOOTING.md`
2. Xem Vercel Documentation: https://vercel.com/docs
3. Xem Supabase Documentation: https://supabase.com/docs

---

**Chúc bạn deploy thành công! 🎉**

