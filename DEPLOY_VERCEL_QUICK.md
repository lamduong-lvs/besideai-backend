# ⚡ Deploy Vercel - Quick Guide

## 🎯 Cách Nhanh Nhất: Chạy Migrations Trực Tiếp

**Không cần deploy code!** Chỉ cần chạy SQL trên Supabase:

### Bước 1: Mở Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select project
3. Click **SQL Editor** → **New Query**

### Bước 2: Chạy Migration 004
1. Mở file: `backend/migrations/004_create_models_table.sql`
2. Copy **TOÀN BỘ** nội dung
3. Paste vào SQL Editor
4. Click **Run** (hoặc Ctrl+Enter)

### Bước 3: Chạy Migration 005
1. Mở file: `backend/migrations/005_create_api_keys_table.sql`
2. Copy **TOÀN BỘ** nội dung
3. Paste vào SQL Editor
4. Click **Run**

### Bước 4: Verify
Chạy query này để kiểm tra:
```sql
SELECT COUNT(*) as model_count FROM models;
SELECT * FROM models WHERE enabled = true LIMIT 5;
```

Nếu thấy kết quả → ✅ Thành công!

---

## 📦 Nếu Muốn Deploy Code Lên Vercel

### Option A: Vercel Dashboard (Redeploy)
1. Go to https://vercel.com/dashboard
2. Select project
3. Go to **Deployments** tab
4. Click **"..."** trên deployment mới nhất
5. Click **"Redeploy"**
6. Chọn **"Use existing Build Cache"** = OFF (để build lại)
7. Click **"Redeploy"**

**Lưu ý:** Cần code đã được push lên Git repo mà Vercel connected.

### Option B: Vercel CLI
```powershell
# Install CLI (nếu chưa có)
npm install -g vercel

# Login
vercel login

# Deploy
cd backend
vercel --prod
```

---

## ✅ Sau Khi Hoàn Thành

1. Test migrations:
   ```powershell
   $body = @{secret = "3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd"} | ConvertTo-Json
   Invoke-RestMethod -Uri "https://besideai.work/api/migrate" -Method Post -ContentType "application/json" -Body $body
   ```

2. Nếu thấy migrations 004, 005 trong results → ✅ Done!

3. Tiếp tục: Add API Keys (Step 3)

---

**💡 Tip:** Cách nhanh nhất là chạy migrations trực tiếp trên Supabase (không cần deploy code)!

