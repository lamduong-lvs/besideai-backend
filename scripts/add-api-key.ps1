# Add API Key to Database (PowerShell)
# Usage: .\scripts\add-api-key.ps1 -Provider "openai" -ApiKey "sk-..." -KeyName "Default" -CronSecret "..."

param(
    [Parameter(Mandatory=$true)]
    [string]$Provider,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$KeyName = "Default",
    
    [string]$BaseUrl = "https://besideai.work",
    
    [string]$CronSecret = $env:CRON_SECRET
)

if (-not $CronSecret) {
    Write-Host "❌ Error: CRON_SECRET is required" -ForegroundColor Red
    Write-Host "   Usage: .\scripts\add-api-key.ps1 -Provider openai -ApiKey sk-... -CronSecret ..." -ForegroundColor Yellow
    Write-Host "   Or set CRON_SECRET environment variable" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🔐 Adding API Key" -ForegroundColor Cyan
Write-Host "   Provider: $Provider" -ForegroundColor Gray
Write-Host "   Key Name: $KeyName" -ForegroundColor Gray
Write-Host "   Base URL: $BaseUrl`n" -ForegroundColor Gray

try {
    $body = @{
        secret = $CronSecret
        provider = $Provider
        apiKey = $ApiKey
        keyName = $KeyName
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin/add-api-key" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    if ($response.success) {
        Write-Host "✅ API key added successfully!`n" -ForegroundColor Green
        Write-Host "   Key ID: $($response.keyId)" -ForegroundColor White
        Write-Host "   Provider: $($response.provider)" -ForegroundColor White
        Write-Host "   Timestamp: $($response.timestamp)`n" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "❌ Failed to add API key:" -ForegroundColor Red
        $errorMsg = $response.error
        if (-not $errorMsg) {
            $errorMsg = $response.message
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

