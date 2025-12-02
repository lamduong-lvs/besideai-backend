# Test Lemon Squeezy Connection (PowerShell)
# Usage: .\scripts\test-lemon-squeezy.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n🧪 Testing Lemon Squeezy Integration..." -ForegroundColor Cyan

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "`n📝 Loading .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check environment variables
Write-Host "`n1️⃣ Checking environment variables..." -ForegroundColor Yellow
$requiredVars = @(
    "LEMON_SQUEEZY_API_KEY",
    "LEMON_SQUEEZY_STORE_ID",
    "LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY",
    "LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY",
    "LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY",
    "LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY"
)

$missing = @()
foreach ($varName in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($varName, "Process")
    if (-not $value) {
        $missing += $varName
        Write-Host "   ❌ $varName : Not set" -ForegroundColor Red
    } else {
        $displayValue = if ($varName -like "*KEY*" -or $varName -like "*SECRET*") {
            "$($value.Substring(0, [Math]::Min(20, $value.Length)))..."
        } else {
            $value
        }
        Write-Host "   ✅ $varName : $displayValue" -ForegroundColor Green
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n❌ Missing required variables: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "`n💡 Set these in Vercel environment variables or .env file" -ForegroundColor Yellow
    exit 1
}

# Test API connection
Write-Host "`n2️⃣ Testing API connection..." -ForegroundColor Yellow
$apiKey = [Environment]::GetEnvironmentVariable("LEMON_SQUEEZY_API_KEY", "Process")
$storeId = [Environment]::GetEnvironmentVariable("LEMON_SQUEEZY_STORE_ID", "Process")

try {
    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Accept" = "application/vnd.api+json"
    }
    
    $response = Invoke-RestMethod -Uri "https://api.lemonsqueezy.com/v1/stores/$storeId" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   ✅ API connection successful!" -ForegroundColor Green
    Write-Host "   ✅ Store: $($response.data.attributes.name)" -ForegroundColor Green
    Write-Host "   ✅ Store ID: $($response.data.id)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ API connection failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    exit 1
}

# Test variant IDs
Write-Host "`n3️⃣ Verifying variant IDs..." -ForegroundColor Yellow
$variants = @(
    @{ Name = "Professional Monthly"; Id = [Environment]::GetEnvironmentVariable("LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY", "Process") },
    @{ Name = "Professional Yearly"; Id = [Environment]::GetEnvironmentVariable("LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY", "Process") },
    @{ Name = "Premium Monthly"; Id = [Environment]::GetEnvironmentVariable("LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY", "Process") },
    @{ Name = "Premium Yearly"; Id = [Environment]::GetEnvironmentVariable("LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY", "Process") }
)

foreach ($variant in $variants) {
    if (-not $variant.Id) {
        Write-Host "   ⚠️  $($variant.Name): Not set" -ForegroundColor Yellow
        continue
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $apiKey"
            "Accept" = "application/vnd.api+json"
        }
        
        $response = Invoke-RestMethod -Uri "https://api.lemonsqueezy.com/v1/variants/$($variant.Id)" -Method GET -Headers $headers -ErrorAction Stop
        $v = $response.data
        Write-Host "   ✅ $($variant.Name) ($($variant.Id))" -ForegroundColor Green
        Write-Host "      Name: $($v.attributes.name)" -ForegroundColor Gray
        Write-Host "      Price: `$$([math]::Round($v.attributes.price / 100, 2)) $($v.attributes.currency)" -ForegroundColor Gray
        Write-Host "      Interval: $($v.attributes.interval) ($($v.attributes.interval_count))" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ $($variant.Name) ($($variant.Id)): Invalid or not found" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "      Error: $($errorData.errors[0].detail)" -ForegroundColor Gray
        }
    }
}

Write-Host "`n✅ Lemon Squeezy integration test completed!" -ForegroundColor Green
Write-Host "`n💡 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Set these variables in Vercel environment variables" -ForegroundColor White
Write-Host "   2. Run database migration (006_update_subscriptions_for_lemon_squeezy.sql)" -ForegroundColor White
Write-Host "   3. Setup webhook in Lemon Squeezy dashboard" -ForegroundColor White
Write-Host "   4. Test checkout flow" -ForegroundColor White

