# Run Database Migration for Lemon Squeezy
# Usage: .\scripts\run-migration-lemon-squeezy.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n🔄 Running Database Migration for Lemon Squeezy..." -ForegroundColor Cyan

# Get CRON_SECRET from environment or .env file
$cronSecret = $null

# Check .env file first
if (Test-Path ".env") {
    $envContent = Get-Content .env
    foreach ($line in $envContent) {
        if ($line -match '^\s*CRON_SECRET\s*=\s*(.+)$') {
            $cronSecret = $matches[1].Trim()
            break
        }
    }
}

# Check environment variable
if (-not $cronSecret) {
    $cronSecret = [Environment]::GetEnvironmentVariable("CRON_SECRET", "Process")
}

# If still not found, use default from vercel-env file
if (-not $cronSecret) {
    if (Test-Path "vercel-env-lemon-squeezy-final.txt") {
        $envContent = Get-Content "vercel-env-lemon-squeezy-final.txt"
        foreach ($line in $envContent) {
            if ($line -match '^\s*CRON_SECRET\s*=\s*(.+)$') {
                $cronSecret = $matches[1].Trim()
                break
            }
        }
    }
}

if (-not $cronSecret) {
    Write-Host "❌ CRON_SECRET not found!" -ForegroundColor Red
    Write-Host "`n💡 Please provide CRON_SECRET:" -ForegroundColor Yellow
    $cronSecret = Read-Host "Enter CRON_SECRET"
}

$apiBaseUrl = "https://besideai-backend.vercel.app"
Write-Host "`n📡 Calling migration endpoint: $apiBaseUrl/api/migrate" -ForegroundColor Yellow

try {
    $body = @{
        secret = $cronSecret
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    Write-Host "`n⏳ Running migration..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$apiBaseUrl/api/migrate" -Method POST -Body $body -Headers $headers -ErrorAction Stop

    if ($response.success) {
        Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "`n📊 Results:" -ForegroundColor Cyan
        
        foreach ($result in $response.results) {
            $status = $result.status
            $migration = $result.migration
            $message = $result.message
            
            if ($status -eq "success") {
                Write-Host "   ✅ $migration : $message" -ForegroundColor Green
            } elseif ($status -eq "skipped") {
                Write-Host "   ⚠️  $migration : $message" -ForegroundColor Yellow
            } else {
                Write-Host "   ❌ $migration : $message" -ForegroundColor Red
            }
        }
        
        Write-Host "`n✅ Database is ready for Lemon Squeezy!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed!" -ForegroundColor Red
        Write-Host "Error: $($response.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running migration!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorData = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorData) {
            Write-Host "Details: $($errorData.error)" -ForegroundColor Gray
            if ($errorData.message) {
                Write-Host "Message: $($errorData.message)" -ForegroundColor Gray
            }
        } else {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
    }
    
    exit 1
}

