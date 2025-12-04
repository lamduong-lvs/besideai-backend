# PowerShell script để kiểm tra deployment status và logs
# Usage: .\scripts\check-deployment.ps1 [frontend|backend|all]

param(
    [Parameter(Position=0)]
    [ValidateSet("frontend", "backend", "all")]
    [string]$Target = "all"
)

$FrontendUrl = if ($env:FRONTEND_URL) { $env:FRONTEND_URL } else { "https://your-frontend-domain.vercel.app" }
$BackendUrl = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "https://besideai.work" }

function Check-Frontend {
    Write-Host "🔍 Checking Frontend Deployment..." -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    
    # Check if frontend is accessible
    Write-Host "1. Checking frontend accessibility..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $FrontendUrl -Method Get -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend is accessible" -ForegroundColor Green
        } else {
            Write-Host "❌ Frontend returned status code: $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Frontend is not accessible: $_" -ForegroundColor Red
        return
    }
    
    # Check login page
    Write-Host "2. Checking login page..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$FrontendUrl/login" -Method Get -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Login page is accessible" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Login page is not accessible: $_" -ForegroundColor Red
    }
    
    # Check callback page
    Write-Host "3. Checking callback page..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$FrontendUrl/callback" -Method Get -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Callback page is accessible" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Callback page is not accessible: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Check-Backend {
    Write-Host "🔍 Checking Backend Deployment..." -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    
    # Check health endpoint
    Write-Host "1. Checking health endpoint..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method Get -ErrorAction Stop
        if ($response.success) {
            Write-Host "✅ Health endpoint is working" -ForegroundColor Green
            Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Health endpoint returned error" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Health endpoint is not working: $_" -ForegroundColor Red
    }
    
    # Check OAuth callback endpoint
    Write-Host "2. Checking OAuth callback endpoint..." -ForegroundColor Yellow
    try {
        $body = @{ code = "test" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/callback" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "⚠️  OAuth callback endpoint may have issues" -ForegroundColor Yellow
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Host "✅ OAuth callback endpoint exists (expected error without valid code)" -ForegroundColor Green
        } else {
            Write-Host "❌ OAuth callback endpoint error: $_" -ForegroundColor Red
        }
    }
    
    # Check AI call endpoint
    Write-Host "3. Checking AI call endpoint..." -ForegroundColor Yellow
    try {
        $body = @{
            model = "test"
            messages = @()
        } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/ai/call" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "⚠️  AI call endpoint may have issues" -ForegroundColor Yellow
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ AI call endpoint exists (expected 401 without auth)" -ForegroundColor Green
        } else {
            Write-Host "❌ AI call endpoint error: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

function Check-EnvVars {
    Write-Host "🔍 Checking Environment Variables..." -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    
    Write-Host "⚠️  Note: This script cannot check Vercel environment variables directly." -ForegroundColor Yellow
    Write-Host "   Please check manually in Vercel Dashboard:" -ForegroundColor Yellow
    Write-Host "   - Frontend: Settings > Environment Variables" -ForegroundColor Yellow
    Write-Host "   - Backend: Settings > Environment Variables" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Required Frontend Variables:" -ForegroundColor White
    Write-Host "  - NEXT_PUBLIC_API_URL" -ForegroundColor Gray
    Write-Host "  - NEXT_PUBLIC_GOOGLE_CLIENT_ID" -ForegroundColor Gray
    Write-Host "  - NEXT_PUBLIC_GOOGLE_REDIRECT_URI" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Required Backend Variables:" -ForegroundColor White
    Write-Host "  - GOOGLE_CLIENT_ID" -ForegroundColor Gray
    Write-Host "  - GOOGLE_CLIENT_SECRET" -ForegroundColor Gray
    Write-Host "  - GOOGLE_REDIRECT_URI" -ForegroundColor Gray
    Write-Host "  - CORS_ORIGIN" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
switch ($Target) {
    "frontend" {
        Check-Frontend
    }
    "backend" {
        Check-Backend
    }
    "all" {
        Check-Frontend
        Check-Backend
        Check-EnvVars
    }
}

Write-Host "✅ Deployment check completed!" -ForegroundColor Green

