# 📥 Hướng Dẫn Import .env vào Vercel

## ✅ Có thể dùng Import .env!

Từ hình ảnh, tôi thấy có nút **"Import .env"** - bạn có thể dùng cách này.

## ⚠️ Lưu ý Quan Trọng

### 1. Vấn đề với Import .env

Khi import .env, **TẤT CẢ** các biến sẽ được set cho **TẤT CẢ** environments (Production, Preview, Development).

Nhưng bạn cần:
- `NODE_ENV=production` chỉ cho Production
- `NODE_ENV=development` cho Preview + Development
- `API_BASE_URL` cũng tương tự

### 2. Giải Pháp: Import + Sửa Thủ Công

**Bước 1: Import .env**
1. Click nút **"Import .env"**
2. Chọn file `.env` hoặc paste nội dung
3. Click Import

**Bước 2: Sửa NODE_ENV và API_BASE_URL thủ công**

Sau khi import, bạn cần:
1. **Xóa** entry `NODE_ENV=production` (nếu đã set cho tất cả)
2. **Tạo lại** 2 entries riêng:
   - `NODE_ENV=production` (chỉ Production)
   - `NODE_ENV=development` (Preview + Development)
3. Tương tự với `API_BASE_URL` nếu cần

## 📋 Cách Import

### Option 1: Import File .env

1. Click nút **"Import .env"**
2. Chọn file `.env` từ máy
3. Vercel sẽ tự động parse và thêm các biến

### Option 2: Paste Nội Dung

1. Click nút **"Import .env"**
2. Paste nội dung file .env vào text area
3. Click Import

## 📝 File .env để Import

Tôi đã tạo file `vercel-env.txt` với nội dung sẵn. Bạn có thể:

1. **Copy nội dung** từ `backend/vercel-env.txt`
2. **Paste** vào Vercel khi click "Import .env"
3. Hoặc **đổi tên** file thành `.env` và import

## ⚠️ Các Lỗi Cần Sửa Sau Khi Import

Từ hình ảnh, tôi thấy có một số vấn đề:

### 1. CRON_SECRET sai
**Hiện tại:** `postgresql://postgres:Dv007009%23%2` (giống DATABASE_URL)  
**Phải là:** `3cec484dbc3e83de4b43ba8817229ea13c812a228f24329770ae85236e4648fd`

### 2. DATABASE_URL bị truncate
**Hiện tại:** `postgresql://postgres:Dv007009%23%2` (thiếu phần sau)  
**Phải là:** `postgresql://postgres:Dv007009%23%23%23%23@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres`

### 3. CORS_ORIGIN bị truncate
**Hiện tại:** `chrome-extension://lmijhojdkfmgihb` (thiếu phần sau)  
**Phải là:** `chrome-extension://lmijhojdkfmgihbkmjhgmedlibcndlag`

## 🔧 Cách Sửa Sau Khi Import

1. **Click vào từng biến** cần sửa
2. **Sửa Value** cho đúng
3. **Click Save**

## 📋 Checklist Sau Khi Import

- [ ] ✅ DATABASE_URL - Đầy đủ, không bị truncate
- [ ] ✅ NODE_ENV - Có 2 entries (production và development)
- [ ] ✅ GOOGLE_CLIENT_ID - Đúng
- [ ] ✅ GOOGLE_CLIENT_SECRET - Đúng
- [ ] ✅ STRIPE keys - Placeholder (OK tạm thời)
- [ ] ✅ CORS_ORIGIN - Đầy đủ, không bị truncate
- [ ] ✅ API_BASE_URL - Có 2 entries nếu cần
- [ ] ✅ CRON_SECRET - Random string, không phải DATABASE_URL

## 🎯 Khuyến Nghị

**Cách tốt nhất:**
1. Import .env để thêm nhanh các biến
2. Sau đó sửa thủ công:
   - CRON_SECRET (đang sai)
   - DATABASE_URL (bị truncate)
   - CORS_ORIGIN (bị truncate)
   - NODE_ENV (tạo 2 entries riêng)
   - API_BASE_URL (tạo 2 entries nếu cần)

## 📝 Nội Dung File .env để Import

Xem file `backend/vercel-env.txt` - đã có sẵn format đúng.

---

**Lưu ý:** Sau khi import và sửa xong, nhớ click **"Deploy"** để áp dụng thay đổi!

