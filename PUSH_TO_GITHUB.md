# 🚀 Hướng Dẫn Push Code Lên GitHub

## Bước 1: Cài Đặt Git (Nếu Chưa Có)

Nếu Git chưa được cài đặt:

1. **Download Git for Windows:**
   - Vào: https://git-scm.com/download/win
   - Download và cài đặt Git
   - Trong quá trình cài, chọn "Add Git to PATH"

2. **Hoặc dùng GitHub Desktop:**
   - Vào: https://desktop.github.com/
   - Download và cài đặt GitHub Desktop
   - Đăng nhập với GitHub account

## Bước 2: Khởi Tạo Git Repository

Mở **Git Bash** hoặc **PowerShell** (sau khi cài Git) và chạy:

```bash
# Di chuyển vào thư mục backend
cd "C:\Users\lamen\Desktop\Chrome Extension\backend"

# Khởi tạo Git repository
git init

# Kiểm tra .gitignore đã có chưa (đã có rồi)
# .gitignore đã được tạo và ignore .env, node_modules, etc.
```

## Bước 3: Add Remote và Push Code

```bash
# Add tất cả files (trừ những file trong .gitignore)
git add .

# Commit
git commit -m "Initial commit: Backend API for BesideAI"

# Add remote repository
git remote add origin https://github.com/lamduong-lvs/besideai-backend.git

# Set branch name
git branch -M main

# Push lên GitHub
git push -u origin main
```

**Lưu ý:** 
- Lần đầu push, GitHub sẽ yêu cầu authentication
- Có thể dùng Personal Access Token thay vì password
- Hoặc dùng GitHub Desktop để push dễ hơn

## Bước 4: Tạo Personal Access Token (Nếu Cần)

Nếu GitHub yêu cầu authentication:

1. Vào GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Đặt tên: "besideai-backend"
4. Chọn scopes: `repo` (full control)
5. Click "Generate token"
6. Copy token (chỉ hiện 1 lần!)
7. Khi push, dùng token thay vì password

## Bước 5: Verify

Sau khi push thành công:

1. Vào https://github.com/lamduong-lvs/besideai-backend
2. Kiểm tra xem code đã được upload chưa
3. Kiểm tra `.env` **KHÔNG** có trong repository (đã được ignore)

## Alternative: Dùng GitHub Desktop

Nếu không muốn dùng command line:

1. **Download GitHub Desktop:** https://desktop.github.com/
2. **Đăng nhập** với GitHub account
3. **Add local repository:**
   - File → Add Local Repository
   - Chọn folder: `C:\Users\lamen\Desktop\Chrome Extension\backend`
4. **Commit và Push:**
   - Viết commit message: "Initial commit: Backend API for BesideAI"
   - Click "Commit to main"
   - Click "Publish repository" (lần đầu) hoặc "Push origin" (lần sau)

## Troubleshooting

### Lỗi: "remote origin already exists"
```bash
# Xóa remote cũ
git remote remove origin

# Add lại
git remote add origin https://github.com/lamduong-lvs/besideai-backend.git
```

### Lỗi: "Authentication failed"
- Kiểm tra username/password
- Hoặc dùng Personal Access Token
- Hoặc setup SSH key

### Lỗi: "Permission denied"
- Kiểm tra bạn có quyền write vào repository không
- Kiểm tra repository là public hay private

## Files Được Ignore (Không Push Lên)

Theo `.gitignore`, các file sau **KHÔNG** được push:
- ✅ `.env` (chứa sensitive data)
- ✅ `node_modules/` (dependencies)
- ✅ `.vercel/` (Vercel config)
- ✅ Logs và temporary files

**Quan trọng:** Đảm bảo `.env` không được commit!

## Sau Khi Push Thành Công

1. ✅ Code đã trên GitHub
2. ✅ Có thể tiếp tục với Vercel deployment
3. ✅ Có thể share repository với team
4. ✅ Có thể setup CI/CD

---

**Chúc bạn push thành công! 🎉**

