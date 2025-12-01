# 📖 Hướng Dẫn Set Environments trong Vercel

## 🎯 Environments là gì?

Trong Vercel, mỗi environment variable có thể áp dụng cho:
- **Production**: Khi deploy lên production (main branch)
- **Preview**: Khi deploy preview (pull requests, branches khác)
- **Development**: Khi chạy local development

## 📍 Cách Set Environments

### Bước 1: Thêm Environment Variable

1. Vào Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Click nút **"+ Add"** hoặc **"+ Add More"**

### Bước 2: Điền Key và Value

1. **Key:** Nhập tên biến (ví dụ: `NODE_ENV`)
2. **Value:** Nhập giá trị (ví dụ: `production`)

### Bước 3: Chọn Environments ⭐ (QUAN TRỌNG)

Sau khi điền Key và Value, bạn sẽ thấy phần **"Environments"** hoặc **"Apply to"** với 3 checkbox:

```
☐ Production
☐ Preview  
☐ Development
```

**Cách chọn:**

#### Ví dụ 1: NODE_ENV cho Production
- Key: `NODE_ENV`
- Value: `production`
- Environments: 
  - ✅ **Production** (check)
  - ☐ Preview (không check)
  - ☐ Development (không check)

#### Ví dụ 2: NODE_ENV cho Preview/Development
- Key: `NODE_ENV`
- Value: `development`
- Environments:
  - ☐ Production (không check)
  - ✅ **Preview** (check)
  - ✅ **Development** (check)

#### Ví dụ 3: DATABASE_URL cho tất cả
- Key: `DATABASE_URL`
- Value: `postgresql://...`
- Environments:
  - ✅ **Production** (check)
  - ✅ **Preview** (check)
  - ✅ **Development** (check)

### Bước 4: Save

Click nút **"Save"** hoặc **"Add"** để lưu.

## 🖼️ Mô Tả Giao Diện

Khi bạn click **"+ Add"**, sẽ có form như sau:

```
┌─────────────────────────────────────────┐
│ Add Environment Variable                │
├─────────────────────────────────────────┤
│ Key: [NODE_ENV____________]             │
│                                          │
│ Value: [production________]             │
│                                          │
│ Environments:                           │
│ ☐ Production                            │
│ ☐ Preview                               │
│ ☐ Development                           │
│                                          │
│ [Cancel]  [Save]                        │
└─────────────────────────────────────────┘
```

Bạn click vào các checkbox để chọn environments.

## 📋 Ví Dụ Cụ Thể: NODE_ENV

### Entry 1: Production
```
Key: NODE_ENV
Value: production
Environments: ✅ Production (chỉ check Production)
```

### Entry 2: Preview/Development
```
Key: NODE_ENV
Value: development
Environments: ✅ Preview, ✅ Development (check cả 2)
```

**Kết quả:** Bạn sẽ có 2 entries `NODE_ENV` trong danh sách, mỗi entry cho environments khác nhau.

## 🔍 Cách Kiểm Tra

Sau khi thêm, trong danh sách Environment Variables, bạn sẽ thấy:

```
NODE_ENV = production (Production)
NODE_ENV = development (Preview, Development)
```

Hoặc có thể hiển thị dạng:
```
NODE_ENV = production
  └─ Production

NODE_ENV = development
  └─ Preview, Development
```

## ⚠️ Lưu Ý

1. **Một Key có thể có nhiều entries** nếu environments khác nhau
2. **Không thể có 2 entries cùng Key và cùng Environments**
3. **Nếu muốn thay đổi**, phải xóa entry cũ và tạo lại

## 🎯 Checklist

Khi thêm environment variable, đảm bảo:
- [ ] Đã điền Key
- [ ] Đã điền Value
- [ ] Đã chọn ít nhất 1 Environment (Production, Preview, hoặc Development)
- [ ] Đã click Save

---

**Nếu vẫn không thấy phần Environments, có thể:**
- Scroll xuống trong form
- Hoặc form hiển thị dạng dropdown/select thay vì checkbox
- Tìm text "Apply to" hoặc "Target environments"

