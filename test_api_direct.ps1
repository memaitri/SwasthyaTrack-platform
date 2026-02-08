# Test Critical Students API Directly
# Run this after logging in to get your token

Write-Host "🧪 Testing Critical Students API" -ForegroundColor Cyan
Write-Host ""

# Instructions
Write-Host "STEP 1: Get your auth token" -ForegroundColor Yellow
Write-Host "  1. Login to http://localhost:5000 as po1"
Write-Host "  2. Press F12 to open DevTools"
Write-Host "  3. Go to Application tab → Local Storage → http://localhost:5000"
Write-Host "  4. Find 'token' and copy its value"
Write-Host ""

$token = Read-Host "Paste your token here"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "❌ No token provided!" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "STEP 2: Testing API..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $url = "http://localhost:5000/api/po/critical-students?schoolType=All&limit=100"
    
    Write-Host "  URL: $url" -ForegroundColor Gray
    Write-Host "  Making request..." -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri $url -Headers $headers -Method GET
    
    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "📊 RESULTS:" -ForegroundColor Cyan
    Write-Host "  Total Critical Students: $($data.total)" -ForegroundColor White
    Write-Host "  District: $($data.metadata.district)" -ForegroundColor White
    Write-Host "  School Type: $($data.metadata.schoolType)" -ForegroundColor White
    
    if ($data.criticalStudents.Count -gt 0) {
        Write-Host ""
        Write-Host "🔥 Critical Students Found:" -ForegroundColor Red
        
        foreach ($student in $data.criticalStudents | Select-Object -First 5) {
            Write-Host ""
            Write-Host "  $($student.studentName) - Priority: $($student.priorityScore)" -ForegroundColor Yellow
            Write-Host "    School: $($student.schoolName)" -ForegroundColor Gray
            Write-Host "    Class: $($student.classSection) | Gender: $($student.gender)" -ForegroundColor Gray
            Write-Host "    Reasons: $($student.reasons.Count)" -ForegroundColor Gray
            
            foreach ($reason in $student.reasons | Select-Object -First 3) {
                Write-Host "      - [$($reason.severity)] $($reason.description)" -ForegroundColor DarkGray
            }
        }
        
        if ($data.criticalStudents.Count -gt 5) {
            Write-Host ""
            Write-Host "  ... and $($data.criticalStudents.Count - 5) more students" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "✅ API IS WORKING!" -ForegroundColor Green
        Write-Host "The backend is returning data correctly." -ForegroundColor Green
        Write-Host ""
        Write-Host "If the UI still shows 'No critical students':" -ForegroundColor Yellow
        Write-Host "  1. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor White
        Write-Host "  2. Check browser console (F12) for errors" -ForegroundColor White
        Write-Host "  3. Make sure server was restarted after build" -ForegroundColor White
        
    } else {
        Write-Host ""
        Write-Host "⚠️  No critical students in response" -ForegroundColor Yellow
        Write-Host "This means the backend is working but not finding students." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Run: node debug_api_call.mjs" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "  This means: Invalid or expired token" -ForegroundColor Yellow
            Write-Host "  Fix: Logout and login again, then get a fresh token" -ForegroundColor White
        } elseif ($statusCode -eq 403) {
            Write-Host ""
            Write-Host "  This means: User doesn't have permission" -ForegroundColor Yellow
            Write-Host "  Fix: Make sure you're logged in as po1 (PO role)" -ForegroundColor White
        } elseif ($statusCode -eq 500) {
            Write-Host ""
            Write-Host "  This means: Server error" -ForegroundColor Yellow
            Write-Host "  Fix: Check server terminal for error logs" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
