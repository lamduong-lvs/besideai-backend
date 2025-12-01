# 🔧 Fix NODE_ENV Environment Variable

## ❌ Lỗi
```
A variable with the name `NODE_ENV` already exists for the targets `production`, `preview` and `development`
```

## ✅ Giải Pháp

### Cách 1: Xóa và Tạo Lại (Khuyến nghị)

1. **Xóa NODE_ENV cũ:**
   - Tìm `NODE_ENV` trong danh sách Environment Variables
   - Click nút **"-"** (minus) bên phải để xóa
   - Confirm xóa

2. **Tạo Entry 1 - Production:**
   - Click **"+ Add More"**
   - Key: `NODE_ENV`
   - Value: `production`
   - Environment: **Chỉ chọn** ✅ **Production** (bỏ Preview và Development)
   - Click **"Save"**

3. **Tạo Entry 2 - Preview/Development:**
   - Click **"+ Add More"** (lần nữa)
   - Key: `NODE_ENV`
   - Value: `development`
   - Environment: **Chọn** ✅ **Preview** và ✅ **Development** (bỏ Production)
   - Click **"Save"**

### Cách 2: Chỉnh Sửa Entry Hiện Tại

1. **Click vào NODE_ENV hiện tại:**
   - Sẽ mở dialog để edit

2. **Nếu Value = `production`:**
   - Giữ nguyên Value: `production`
   - Environment: **Chỉ chọn** ✅ **Production**
   - Click **"Save"**
   - Sau đó tạo entry mới cho Preview/Development

3. **Nếu Value = `development`:**
   - Giữ nguyên Value: `development`
   - Environment: **Chọn** ✅ **Preview** và ✅ **Development**
   - Click **"Save"**
   - Sau đó tạo entry mới cho Production

## 📋 Kết Quả Cuối Cùng

Sau khi fix, bạn sẽ có **2 entries** cho `NODE_ENV`:

| Key | Value | Environment |
|-----|-------|-------------|
| NODE_ENV | `production` | Production only |
| NODE_ENV | `development` | Preview + Development |

## ✅ Verify

Sau khi tạo xong, kiểm tra:
- ✅ Có 2 entries `NODE_ENV` trong danh sách
- ✅ Entry 1: Value = `production`, Environment = Production
- ✅ Entry 2: Value = `development`, Environment = Preview + Development

## 🚀 Sau Khi Fix

1. **Redeploy** project để áp dụng thay đổi
2. **Test** deployment
3. **Kiểm tra** Function Logs để đảm bảo `NODE_ENV` đúng

---

**Lưu ý:** Trong Vercel, bạn có thể có nhiều entries cho cùng một key, nhưng mỗi entry phải có Environment targets khác nhau.

