# PowerShell Script to Setup Environment Variables
# Run this script to quickly update your .env file with Supabase keys

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you update your .env file with Supabase keys." -ForegroundColor Yellow
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✓ Found .env file" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "To get your Supabase keys:" -ForegroundColor Cyan
Write-Host "1. Go to: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Select your project: xtmbfrrlegmilxsbdwyu" -ForegroundColor White
Write-Host "3. Click Settings (⚙️) → API" -ForegroundColor White
Write-Host "4. Copy the keys shown below" -ForegroundColor White
Write-Host ""

# Prompt for anon key
Write-Host "Enter your ANON KEY (public key):" -ForegroundColor Yellow
Write-Host "(Starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6ImFub24i...)" -ForegroundColor Gray
$anonKey = Read-Host "Paste here"

Write-Host ""

# Prompt for service role key
Write-Host "Enter your SERVICE_ROLE KEY (secret key):" -ForegroundColor Yellow
Write-Host "(Starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSI...)" -ForegroundColor Gray
$serviceKey = Read-Host "Paste here"

Write-Host ""

# Validate keys
if ($anonKey -eq "" -or $serviceKey -eq "") {
    Write-Host "✗ Keys cannot be empty!" -ForegroundColor Red
    Write-Host "Please run the script again and paste your actual keys." -ForegroundColor Yellow
    exit 1
}

if ($anonKey.Length -lt 100 -or $serviceKey.Length -lt 100) {
    Write-Host "⚠ Warning: Keys seem too short. Make sure you copied the complete keys!" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Update .env file
Write-Host "Updating .env file..." -ForegroundColor Cyan

$envContent = @"
# Supabase Configuration
# Client-side (Vite) - Used by frontend
VITE_SUPABASE_URL=https://xtmbfrrlegmilxsbdwyu.supabase.co
VITE_SUPABASE_ANON_KEY=$anonKey

# Server-side - Used by backend
SUPABASE_URL=https://xtmbfrrlegmilxsbdwyu.supabase.co
SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceKey

# Supabase Storage Bucket
SUPABASE_UPLOAD_BUCKET=uploads

# Database Connection
DATABASE_URL=postgresql://postgres.xtmbfrrlegmilxsbdwyu:MP%232213@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# JWT Secret for authentication
JWT_SECRET=mysecret123

# Environment
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✓ .env file updated successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Restart your development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test check-in image upload" -ForegroundColor White
Write-Host ""
Write-Host "3. If you see 'Invalid Compact JWS' error:" -ForegroundColor White
Write-Host "   - Double-check your keys in Supabase Dashboard" -ForegroundColor Gray
Write-Host "   - Make sure you copied the COMPLETE keys" -ForegroundColor Gray
Write-Host "   - Run this script again" -ForegroundColor Gray
Write-Host ""
Write-Host "4. (Optional) Create 'uploads' bucket in Supabase:" -ForegroundColor White
Write-Host "   - Go to Storage in Supabase Dashboard" -ForegroundColor Gray
Write-Host "   - Create new bucket named 'uploads'" -ForegroundColor Gray
Write-Host "   - Make it public" -ForegroundColor Gray
Write-Host ""

Write-Host "✓ Setup complete!" -ForegroundColor Green
Write-Host ""
