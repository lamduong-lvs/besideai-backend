# 🚀 Cách Deploy Code Mới Lên Vercel

Có 3 cách để deploy code mới lên Vercel:

## ⚡ Cách 1: Chạy Migrations Trực Tiếp (NHANH NHẤT - Khuyến nghị)

**Không cần deploy code mới!** Chạy migrations trực tiếp trên Supabase:

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Copy nội dung `migrations/004_create_models_table.sql` → Paste → Run
3. Copy nội dung `migrations/005_create_api_keys_table.sql` → Paste → Run

**Xem chi tiết:** `RUN_MIGRATIONS_MANUAL.md`

---

## 📦 Cách 2: Deploy Qua Vercel Dashboard (Manual Upload)

### Bước 1: Chuẩn bị files

1. **Zip folder `backend`:**
   - Right-click folder `backend`
   - Chọn "Send to" → "Compressed (zipped) folder"
   - Hoặc dùng PowerShell:
   ```powershell
   Compress-Archive -Path "backend\*" -DestinationPath "backend.zip" -Force
   ```

### Bước 2: Deploy trên Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project của bạn
3. Go to **Settings** → **General**
4. Scroll xuống **Deployments**
5. Click **"..."** → **"Redeploy"**
6. Hoặc tạo deployment mới:
   - Click **"Add New..."** → **"Project"**
   - Upload `backend.zip`
   - Configure:
     - **Framework Preset:** Other
     - **Root Directory:** `backend`
     - **Build Command:** (để trống)
     - **Output Directory:** (để trống)
   - Click **Deploy**

**Lưu ý:** Cách này có thể mất thời gian và phức tạp hơn.

---

## 🔧 Cách 3: Deploy Qua Vercel CLI (Nếu có CLI)

### Bước 1: Install Vercel CLI

```powershell
npm install -g vercel
```

### Bước 2: Login

```powershell
vercel login
```

### Bước 3: Deploy

```powershell
cd backend
vercel --prod
```

**Lưu ý:** Cần có Vercel CLI và đã login.

---

## 🎯 Khuyến Nghị

**Dùng Cách 1 (Chạy migrations trực tiếp trên Supabase)** vì:
- ✅ Nhanh nhất (2 phút)
- ✅ Không cần deploy code
- ✅ Không cần Git/CLI
- ✅ Đơn giản nhất

Sau khi chạy migrations xong, code mới sẽ tự động có khi Vercel deploy lần sau (hoặc khi bạn push Git).

---

## ✅ Sau Khi Deploy

1. **Verify migrations đã chạy:**
   ```powershell
   $body = @{secret = "YOUR_CRON_SECRET"} | ConvertTo-Json
   Invoke-RestMethod -Uri "https://besideai.work/api/migrate" -Method Post -ContentType "application/json" -Body $body
   ```

2. **Nếu thấy migrations 004, 005 trong kết quả** → Thành công!

3. **Tiếp tục với Step 3:** Add API Keys

---

**Cần giúp?** Xem `CONTINUE_DEPLOYMENT.md`

