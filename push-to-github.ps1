# PowerShell Script để Push Code Lên GitHub
# Chạy script này sau khi đã cài Git

Write-Host "🚀 BesideAI Backend - Push to GitHub" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Git đã được cài chưa
$gitPath = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitPath = "git"
    Write-Host "✅ Git found in PATH" -ForegroundColor Green
} elseif (Test-Path "C:\Program Files\Git\bin\git.exe") {
    $gitPath = "C:\Program Files\Git\bin\git.exe"
    Write-Host "✅ Git found at: $gitPath" -ForegroundColor Green
} elseif (Test-Path "C:\Program Files (x86)\Git\bin\git.exe") {
    $gitPath = "C:\Program Files (x86)\Git\bin\git.exe"
    Write-Host "✅ Git found at: $gitPath" -ForegroundColor Green
} else {
    Write-Host "❌ Git not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vui lòng cài đặt Git trước:" -ForegroundColor Yellow
    Write-Host "1. Download từ: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "2. Hoặc dùng GitHub Desktop: https://desktop.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Sau khi cài xong, chạy lại script này." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Kiểm tra đã có .git chưa
if (Test-Path ".git") {
    Write-Host "✅ Git repository đã được khởi tạo" -ForegroundColor Green
} else {
    Write-Host "📦 Khởi tạo Git repository..." -ForegroundColor Yellow
    & $gitPath init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Lỗi khi khởi tạo Git repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Git repository đã được khởi tạo" -ForegroundColor Green
}

Write-Host ""

# Kiểm tra remote
$remoteUrl = & $gitPath remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "✅ Remote origin đã được cấu hình: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "📡 Thêm remote origin..." -ForegroundColor Yellow
    & $gitPath remote add origin https://github.com/lamduong-lvs/besideai-backend.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Remote có thể đã tồn tại, tiếp tục..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Remote origin đã được thêm" -ForegroundColor Green
    }
}

Write-Host ""

# Kiểm tra .gitignore
if (Test-Path ".gitignore") {
    Write-Host "✅ .gitignore đã tồn tại" -ForegroundColor Green
    # Kiểm tra .env có trong .gitignore không
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Write-Host "✅ .env đã được ignore (an toàn)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Cảnh báo: .env có thể không được ignore!" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .gitignore không tồn tại!" -ForegroundColor Yellow
}

Write-Host ""

# Kiểm tra .env có trong staging không
$stagedFiles = & $gitPath diff --cached --name-only 2>$null
if ($stagedFiles -contains ".env") {
    Write-Host "⚠️  CẢNH BÁO: .env đang trong staging area!" -ForegroundColor Red
    Write-Host "   Vui lòng unstage .env trước khi commit:" -ForegroundColor Yellow
    Write-Host "   git reset HEAD .env" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Bạn có muốn tiếp tục? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host ""

# Add files
Write-Host "📝 Đang add files..." -ForegroundColor Yellow
& $gitPath add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khi add files" -ForegroundColor Red
    exit 1
}

# Kiểm tra có changes không
$status = & $gitPath status --porcelain
if (-not $status) {
    Write-Host "ℹ️  Không có thay đổi để commit" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Để push code hiện tại lên GitHub:" -ForegroundColor Yellow
    Write-Host "1. Tạo commit mới với thay đổi" -ForegroundColor Yellow
    Write-Host "2. Hoặc push branch hiện tại: git push -u origin main" -ForegroundColor Yellow
    exit 0
}

Write-Host "✅ Files đã được add" -ForegroundColor Green
Write-Host ""

# Commit
Write-Host "💾 Đang commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Backend API for BesideAI"
& $gitPath commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khi commit" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Commit thành công" -ForegroundColor Green
Write-Host ""

# Set branch name
Write-Host "🌿 Đang set branch name..." -ForegroundColor Yellow
& $gitPath branch -M main
Write-Host "✅ Branch name: main" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "🚀 Đang push lên GitHub..." -ForegroundColor Yellow
Write-Host "   (Có thể cần nhập GitHub credentials)" -ForegroundColor Cyan
Write-Host ""
& $gitPath push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Repository: https://github.com/lamduong-lvs/besideai-backend" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Bước tiếp theo:" -ForegroundColor Yellow
    Write-Host "1. Vào Vercel và import repository này" -ForegroundColor Yellow
    Write-Host "2. Thêm environment variables" -ForegroundColor Yellow
    Write-Host "3. Deploy!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Push thất bại" -ForegroundColor Red
    Write-Host ""
    Write-Host "Có thể do:" -ForegroundColor Yellow
    Write-Host "1. Chưa đăng nhập GitHub" -ForegroundColor Yellow
    Write-Host "2. Cần Personal Access Token" -ForegroundColor Yellow
    Write-Host "3. Repository chưa được tạo trên GitHub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Xem hướng dẫn chi tiết trong: PUSH_TO_GITHUB.md" -ForegroundColor Cyan
}

