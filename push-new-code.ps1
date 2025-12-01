# Push New Code to Git
# This script helps push the new backend-managed models code to Git

Write-Host "🚀 Push New Code to Git" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
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
    Write-Host "Please install Git first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "2. Or use GitHub Desktop: https://desktop.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Navigate to project root (one level up from backend)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "📍 Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Check if .git exists
if (Test-Path ".git") {
    Write-Host "✅ Git repository exists" -ForegroundColor Green
} else {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    & $gitPath init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to initialize Git repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
}

Write-Host ""

# Check remote
$remoteUrl = & $gitPath remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "✅ Remote origin: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "⚠️  No remote origin configured" -ForegroundColor Yellow
    Write-Host ""
    $repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git)"
    if ($repoUrl) {
        & $gitPath remote add origin $repoUrl
        Write-Host "✅ Remote origin added" -ForegroundColor Green
    } else {
        Write-Host "❌ No repository URL provided. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Check status
Write-Host "📋 Checking status..." -ForegroundColor Cyan
& $gitPath status --short
Write-Host ""

# Add all files
Write-Host "➕ Adding files..." -ForegroundColor Cyan
& $gitPath add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to add files" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files added" -ForegroundColor Green
Write-Host ""

# Commit
$commitMessage = "Add backend-managed AI models system

- Add models and api_keys tables
- Add models service and API endpoint
- Add API keys service with encryption
- Add AI providers (OpenAI, Anthropic, Google)
- Add /api/ai/call endpoint
- Update vercel.json routes"

Write-Host "💾 Committing changes..." -ForegroundColor Cyan
& $gitPath commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No changes to commit (or commit failed)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Changes committed" -ForegroundColor Green
}
Write-Host ""

# Push
Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
$branch = & $gitPath branch --show-current 2>$null
if (-not $branch) {
    $branch = "main"
    & $gitPath branch -M $branch
}

& $gitPath push -u origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push. You may need to:" -ForegroundColor Red
    Write-Host "   1. Set upstream: git push -u origin $branch" -ForegroundColor Yellow
    Write-Host "   2. Or pull first: git pull origin $branch --rebase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Wait 2-3 minutes for Vercel to auto-deploy" -ForegroundColor White
Write-Host "   2. Test endpoints:" -ForegroundColor White
Write-Host "      Invoke-RestMethod -Uri 'https://besideai.work/api/models'" -ForegroundColor Gray
Write-Host ""

