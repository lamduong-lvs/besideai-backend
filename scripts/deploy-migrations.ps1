# Deploy Database Migrations (PowerShell)
# Usage: .\scripts\deploy-migrations.ps1 [baseUrl] [cronSecret]

param(
    [string]$BaseUrl = "https://besideai.work",
    [string]$CronSecret = $env:CRON_SECRET
)

if (-not $CronSecret) {
    Write-Host "❌ Error: CRON_SECRET is required" -ForegroundColor Red
    Write-Host "   Usage: .\scripts\deploy-migrations.ps1 [baseUrl] [cronSecret]" -ForegroundColor Yellow
    Write-Host "   Or set CRON_SECRET environment variable" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🚀 Deploying Database Migrations" -ForegroundColor Cyan
Write-Host "📍 Base URL: $BaseUrl`n" -ForegroundColor Gray

try {
    $body = @{
        secret = $CronSecret
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/api/migrate" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    if ($response.success) {
        Write-Host "✅ Migrations completed successfully!`n" -ForegroundColor Green
        Write-Host "📊 Results:" -ForegroundColor Cyan
        foreach ($result in $response.results) {
            if ($result.status -eq "success") {
                $icon = "✅"
            } else {
                $icon = "⚠️"
            }
            Write-Host "   $icon $($result.migration): $($result.message)" -ForegroundColor White
        }
        Write-Host "`n⏰ Timestamp: $($response.timestamp)`n" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "❌ Migration failed:" -ForegroundColor Red
        $errorMsg = $response.error
        if (-not $errorMsg) {
            $errorMsg = $response.message
        }
        if (-not $errorMsg) {
            $errorMsg = "Unknown error"
        }
        Write-Host "   Error: $errorMsg" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        try {
            $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
            $detailMsg = $errorData.message
            if (-not $detailMsg) {
                $detailMsg = $errorData.error
            }
            Write-Host "   Details: $detailMsg" -ForegroundColor Red
        } catch {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    exit 1
}
