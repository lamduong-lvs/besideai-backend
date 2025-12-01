# Test Backend Endpoints (PowerShell)
# Usage: .\scripts\test-endpoints.ps1 [baseUrl]

param(
    [string]$BaseUrl = "https://besideai.work"
)

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Options = @{}
    )
    
    Write-Host "`n🧪 Testing $Name..." -ForegroundColor Cyan
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = if ($Options.Method) { $Options.Method } else { "Get" }
        }
        
        if ($Options.Body) {
            $params.ContentType = "application/json"
            $params.Body = $Options.Body | ConvertTo-Json
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "   ✅ Status: OK" -ForegroundColor Green
        
        if ($response.success -ne $null) {
            Write-Host "   ✅ Success: $($response.success)" -ForegroundColor Green
        }
        if ($response.models) {
            Write-Host "   ✅ Models: $($response.models.Count) available" -ForegroundColor Green
        }
        
        return @{ success = $true; data = $response }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ Status: $statusCode" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            try {
                $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
                $errorMsg = $errorData.message
                if (-not $errorMsg) {
                    $errorMsg = $errorData.error
                }
                Write-Host "   ❌ Error: $errorMsg" -ForegroundColor Red
            } catch {
                Write-Host "   ❌ Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        return @{ success = $false; error = $_.Exception.Message }
    }
}

Write-Host "🚀 Testing Backend Endpoints" -ForegroundColor Cyan
Write-Host "📍 Base URL: $BaseUrl`n" -ForegroundColor Gray

$results = @()

# Test 1: Health check
$results += Test-Endpoint "Health Check" "$BaseUrl/api/health"

# Test 2: Models endpoint (no auth)
$results += Test-Endpoint "Models Endpoint (Public)" "$BaseUrl/api/models"

# Test 3: Models endpoint with tier
$results += Test-Endpoint "Models Endpoint (Free Tier)" "$BaseUrl/api/models?tier=free"

# Test 4: Models endpoint (Pro tier)
$results += Test-Endpoint "Models Endpoint (Pro Tier)" "$BaseUrl/api/models?tier=pro"

# Test 5: AI Call endpoint (should fail without auth)
$results += Test-Endpoint "AI Call Endpoint (No Auth - Should Fail)" "$BaseUrl/api/ai/call" @{
    Method = "Post"
    Body = @{
        model = "gpt-4o"
        messages = @(@{ role = "user"; content = "Hello" })
    }
}

# Summary
Write-Host "`n" + ("=" * 50) -ForegroundColor Gray
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Gray

$passed = ($results | Where-Object { $_.success }).Count
$failed = ($results | Where-Object { -not $_.success }).Count

Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red
$successRate = [math]::Round(($passed / $results.Count) * 100, 1)
Write-Host "📈 Success Rate: $successRate%`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    Write-Host "⚠️  Some tests failed. Check the output above for details.`n" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ All tests passed!`n" -ForegroundColor Green
    exit 0
}

