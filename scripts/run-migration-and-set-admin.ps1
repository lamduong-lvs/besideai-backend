# Script to run migration and set admin user
# Usage: .\scripts\run-migration-and-set-admin.ps1 -AdminEmail "user@example.com" [-CronSecret "secret"]

param(
    [Parameter(Mandatory=$true)]
    [string]$AdminEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$CronSecret
)

# Get API URL from environment or use default
$apiUrl = $env:API_BASE_URL
if (-not $apiUrl) {
    $apiUrl = "https://besideai.work"
}

# Get CRON_SECRET from parameter, environment, or .env file
if (-not $CronSecret) {
    $CronSecret = $env:CRON_SECRET
}

if (-not $CronSecret) {
    # Try to read from .env file
    $envPath = Join-Path $PSScriptRoot "..\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath
        foreach ($line in $envContent) {
            if ($line -match '^\s*CRON_SECRET\s*=\s*(.+)$') {
                $CronSecret = $matches[1].Trim()
                break
            }
        }
    }
}

if (-not $CronSecret) {
    Write-Host "❌ CRON_SECRET not found!" -ForegroundColor Red
    Write-Host "`n💡 Please provide CRON_SECRET:" -ForegroundColor Yellow
    $CronSecret = Read-Host "Enter CRON_SECRET"
}

Write-Host "🚀 Starting migration and admin setup...`n" -ForegroundColor Cyan
Write-Host "API URL: $apiUrl" -ForegroundColor White
Write-Host "Admin Email: $AdminEmail`n" -ForegroundColor White

# Step 1: Run migration
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow

try {
    $migrationBody = @{
        secret = $CronSecret
    } | ConvertTo-Json

    $migrationResponse = Invoke-RestMethod -Uri "$apiUrl/api/migrate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $migrationBody `
        -ErrorAction Stop

    Write-Host "✅ Migrations completed successfully" -ForegroundColor Green
    Write-Host "Results:" -ForegroundColor White
    $migrationResponse.results | ForEach-Object {
        Write-Host "  - $($_.migration): $($_.status) - $($_.message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   $($errorDetails.message)" -ForegroundColor Red
    }
    exit 1
}

# Step 2: Set admin user
Write-Host "`n👤 Setting $AdminEmail as admin..." -ForegroundColor Yellow

try {
    $adminBody = @{
        secret = $CronSecret
        email = $AdminEmail
    } | ConvertTo-Json

    $adminResponse = Invoke-RestMethod -Uri "$apiUrl/api/admin/set-admin" `
        -Method POST `
        -ContentType "application/json" `
        -Body $adminBody `
        -ErrorAction Stop

    Write-Host "✅ Admin user set successfully" -ForegroundColor Green
    Write-Host "User:" -ForegroundColor White
    Write-Host "  - ID: $($adminResponse.user.id)" -ForegroundColor Gray
    Write-Host "  - Email: $($adminResponse.user.email)" -ForegroundColor Gray
    Write-Host "  - Role: $($adminResponse.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to set admin user: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   $($errorDetails.message)" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n✅ All done! Admin user is ready." -ForegroundColor Green


