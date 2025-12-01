# Generate CRON_SECRET for Vercel Environment Variables
# Run this script to generate a random secret for CRON_SECRET

Write-Host "🔐 Generating CRON_SECRET..." -ForegroundColor Cyan
Write-Host ""

try {
    $secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    
    if ($secret) {
        Write-Host "✅ CRON_SECRET generated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Copy this value to Vercel Environment Variables:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Key: CRON_SECRET" -ForegroundColor White
        Write-Host "Value: $secret" -ForegroundColor Green
        Write-Host "Environment: Production, Preview, Development" -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Value (ready to copy):" -ForegroundColor Cyan
        Write-Host $secret -ForegroundColor Green -BackgroundColor Black
        Write-Host ""
        
        # Copy to clipboard if available
        try {
            $secret | Set-Clipboard
            Write-Host "✅ Value đã được copy vào clipboard!" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Không thể copy vào clipboard, vui lòng copy thủ công" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Failed to generate secret" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Node.js is installed and in PATH" -ForegroundColor Yellow
    exit 1
}

