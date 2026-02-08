# Critical Students Not Showing - Quick Fix

## Problem
Backend returns 12 critical students, but frontend shows "No critical students identified"

## Root Cause
The server needs to be restarted after building the new code.

## Solution

### Step 1: Stop the Server
Press `Ctrl + C` in the terminal where the server is running

### Step 2: Rebuild
```bash
npm run build
```

### Step 3: Start Server
```bash
npm run dev
```

### Step 4: Hard Refresh Browser
Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

### Step 5: Login and Test
1. Login as po1
2. Go to Dashboard
3. Click "Critical Students" tab
4. You should now see 12 critical students

## Alternative: Test API Directly

If the above doesn't work, test the API directly:

### Method 1: Using the Test Page
1. Open `test_api_endpoint.html` in your browser
2. Login to the app in another tab
3. Open DevTools (F12) → Application → Local Storage
4. Copy the token value
5. Paste it in the test page
6. Click "Test API"
7. You should see the 12 critical students

### Method 2: Using curl
```bash
# Get your token from browser DevTools
TOKEN="your_token_here"

# Test the endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students" | jq .
```

## Verification

After restarting, check the server logs. You should see:
```
[API] Critical students request from user: po1, role: PO, district: Jalgaon
[Critical Students] Fetching for district: Jalgaon, schoolType: All
[Critical Students] Found 4 schools in district Jalgaon
[Critical Students] Found 12 active students to evaluate
[Critical Students] Evaluated 12 students, found 12 critical
[API] Returning 12 critical students
```

## Expected Result

You should see:
- **Critical Students [12]** at the top
- **test student** with red badge (Priority: 100)
- **5 underweight students** with yellow badges (Priority: 40)
- **6 students with no meal data** (Priority: 10)

## If Still Not Working

### Check 1: Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Share screenshot

### Check 2: Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Click Critical Students tab
4. Look for `/api/po/critical-students` request
5. Check status code and response
6. Share screenshot

### Check 3: Server Logs
Look at the terminal where server is running
- Are there any errors?
- Do you see the log messages above?
- Share the logs

## Common Issues

### Issue 1: 403 Forbidden
**Cause**: User doesn't have PO role or district is null
**Fix**: Run `node verify_po1_district.mjs` to check

### Issue 2: Empty Response
**Cause**: District mismatch
**Fix**: Run `node fix_district_mismatch.mjs --apply-test-fix`

### Issue 3: Component Not Rendering
**Cause**: React component error
**Fix**: Check browser console for React errors

### Issue 4: Stale Cache
**Cause**: Browser cached old version
**Fix**: Clear cache and hard refresh (Ctrl+Shift+R)

## Quick Test Commands

```bash
# Verify po1 setup
node verify_po1_district.mjs

# Test backend service
node debug_api_call.mjs

# Test API simulation
node test_po1_critical_students_api.mjs
```

All three should show 12 critical students.

## Contact

If none of the above works, please share:
1. Screenshot of browser console (F12 → Console tab)
2. Screenshot of network tab showing the API request
3. Server logs from terminal
4. Output of `node verify_po1_district.mjs`

---

**Most Likely Fix**: Just restart the server after building!
