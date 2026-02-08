# Debugging Steps for Critical Students Not Showing

## Issue
Backend service returns 12 critical students, but frontend shows "No critical students identified"

## Confirmed Working
✅ Backend service (`getCriticalStudentsForDistrict`) works correctly
✅ Returns 12 critical students for Jalgaon district
✅ Priority scores calculated correctly

## Possible Issues

### 1. API Endpoint Not Being Called
**Check**: Look at browser Network tab for `/api/po/critical-students` request

**Expected**: Should see a GET request to this endpoint when you click the Critical Students tab

**If missing**: The frontend component might not be making the API call

### 2. Authentication Issue
**Check**: Look for 401 or 403 errors in Network tab

**Expected**: Request should have `Authorization: Bearer <token>` header

**If 403**: User might not have PO role or district is null

### 3. Response Parsing Issue
**Check**: Look at the response in Network tab

**Expected**: Should see JSON with `criticalStudents` array

**If empty array**: Backend might be returning data but frontend is not parsing it

### 4. React Query Cache Issue
**Check**: Component might be using stale cached data

**Solution**: Hard refresh (Ctrl+Shift+R) or clear browser cache

## Debugging Steps

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Look for logs starting with `[CriticalStudents]` or `[API]`

### Step 2: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Click on Critical Students tab
4. Look for request to `/api/po/critical-students`
5. Click on the request
6. Check:
   - Status code (should be 200)
   - Response tab (should show JSON with students)
   - Headers tab (should have Authorization header)

### Step 3: Check Server Logs
Look for these log messages in the terminal where the server is running:
```
[API] Critical students request from user: po1, role: PO, district: Jalgaon
[Critical Students] Fetching for district: Jalgaon, schoolType: All
[Critical Students] Found 4 schools in district Jalgaon
[Critical Students] Found 12 active students to evaluate
[Critical Students] Evaluated 12 students, found 12 critical
[API] Returning 12 critical students
```

### Step 4: Test API Directly
```bash
# Get your auth token from browser (Application tab → Local Storage → token)
TOKEN="your_token_here"

# Test the endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students" | jq .
```

## Quick Fixes

### Fix 1: Hard Refresh
Press `Ctrl + Shift + R` to clear cache and reload

### Fix 2: Clear React Query Cache
In browser console, run:
```javascript
localStorage.clear();
location.reload();
```

### Fix 3: Check Component Import
The component might not be imported correctly. Check if `CriticalStudentsList` is imported in `PODashboard.tsx`

### Fix 4: Restart Server
```bash
# Stop server (Ctrl+C)
# Rebuild
npm run build
# Start again
npm run dev
```

## Expected Behavior

When working correctly, you should see:
1. Network request to `/api/po/critical-students` with status 200
2. Response JSON with 12 students in `criticalStudents` array
3. UI showing "Critical Students [12]" with student cards
4. Server logs showing evaluation process

## Next Steps

1. Open browser DevTools
2. Go to Network tab
3. Click Critical Students tab
4. Share screenshot of:
   - Network tab showing the API request
   - Console tab showing any errors
   - Response tab showing the JSON response

This will help identify exactly where the issue is.
