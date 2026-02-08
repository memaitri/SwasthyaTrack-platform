# PO Dashboard Drill-Down Testing Guide

## Current Status

The drill-down feature has been fully implemented with:
- ✅ Frontend components (MetricCard, DrillDownModal)
- ✅ Backend API endpoints (4 drill-down endpoints)
- ✅ Enhanced logging for debugging
- ✅ PO users have districts assigned

## Issue: "No Data" in Drill-Down Modals

The dashboard shows data correctly, but clicking metrics shows "0 items" in the modal.

## Root Cause Analysis

Based on verification:
1. ✅ PO users have districts assigned
2. ✅ Schools exist in those districts
3. ✅ API endpoints are registered correctly
4. ❓ Need to verify: API is being called and returning data

## Testing Steps

### Step 1: Start the Development Server

```bash
npm run dev
```

Wait for the server to start on `http://localhost:5000`

### Step 2: Login as a PO User

Use one of these test PO users:
- Username: `po1` (District: Jalgaon, 4 schools)
- Username: `po_test` (District: D-TEST, 2 schools)
- Username: `po-1769957095691` (District: D-TEST, 2 schools)
- Password: `password123` (or your configured password)

### Step 3: Open Browser Console

1. Open the PO Dashboard
2. Press F12 to open Developer Tools
3. Go to the "Console" tab
4. Keep it open while testing

### Step 4: Click a Metric

Click on "Total Schools" metric card

### Step 5: Check Console Logs

You should see these logs in the browser console:

```
Drill-down params: { type: "schools", month: "2", year: "2026", schoolType: "All", params: undefined }
Drill-down request: { type: "schools", endpoint: "/api/po/drilldown/schools?...", params: "..." }
Drill-down response: { schools: [...], total: X, metadata: {...} }
Drill-down response keys: schools,total,metadata
Drill-down response.schools: [...]
Drill-down items extracted: X items
Drill-down items sample: {...}
```

### Step 6: Check Server Console

In the terminal where the server is running, you should see:

```
=== PO Drill-Down Schools Request ===
User: <user-id> Role: PO
Params: { month: '2', year: '2026', schoolType: 'All', metric: undefined }
User district: <district-name>
Total schools in system: X
Schools in user district: Y
Enriched schools: Y
Sample school: {...}
Returning response with Y schools
```

## Diagnostic Scenarios

### Scenario A: No Console Logs at All

**Problem**: Click handler not working
**Solution**: Check if MetricCard has `clickable={true}` and `onClick` prop

### Scenario B: API Request Fails (401/403)

**Problem**: Authentication issue
**Solution**: 
1. Check if user is logged in
2. Verify token in localStorage: `localStorage.getItem('accessToken')`
3. Try logging out and back in

### Scenario C: API Returns Empty Array

**Problem**: No data in database for user's district
**Solution**:
1. Check server logs for "No schools found in district"
2. Verify user's district has schools: Run `node verify_po_user_district.mjs`
3. If district has no schools, either:
   - Add schools to that district
   - Change user's district to one with schools

### Scenario D: API Returns Data But Modal Shows 0 Items

**Problem**: Response parsing issue
**Solution**:
1. Check console log: "Drill-down response keys"
2. Verify response has `schools` array
3. Check if response structure matches: `{ schools: [...], total: X }`

### Scenario E: Server Logs Show Error

**Problem**: Backend error
**Solution**: Check the error message in server logs and fix accordingly

## Quick Test Script

Run this script to test the API directly (server must be running):

```bash
node test_po_drilldown_simple.mjs
```

This will:
1. Login as a PO user
2. Call each drill-down endpoint
3. Show the response data
4. Identify any issues

## Manual API Test

If you want to test the API manually:

1. Get your access token:
   - Login to the app
   - Open browser console
   - Run: `localStorage.getItem('accessToken')`
   - Copy the token

2. Test the endpoint with curl:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:5000/api/po/drilldown/schools?month=2&year=2026&schoolType=All"
```

Expected response:
```json
{
  "schools": [
    {
      "id": "...",
      "name": "...",
      "district": "...",
      "totalStudents": 100,
      "healthCardCompletion": 85,
      ...
    }
  ],
  "total": 4,
  "metadata": {
    "month": "2",
    "year": "2026",
    "schoolType": "All"
  }
}
```

## Common Issues & Solutions

### Issue: "No schools found in district"

**Cause**: User's district has no schools
**Fix**: 
```sql
-- Check user's district
SELECT id, username, role, district FROM users WHERE role = 'PO';

-- Check schools in that district
SELECT id, name, district FROM schools WHERE district = 'YourDistrict';

-- Option 1: Add schools to user's district
UPDATE schools SET district = 'YourDistrict' WHERE id = 'school-id';

-- Option 2: Change user's district to match existing schools
UPDATE users SET district = 'ExistingDistrict' WHERE id = 'user-id';
```

### Issue: "PO user has no district"

**Cause**: User's district field is NULL
**Fix**:
```bash
node verify_po_user_district.mjs
```
This script will automatically assign a district to PO users.

### Issue: Modal opens but shows "Loading..." forever

**Cause**: API request is hanging or failing silently
**Fix**:
1. Check browser Network tab for the API request
2. Look for errors in the request
3. Check server logs for errors

### Issue: TypeScript errors

**Cause**: Type mismatches
**Fix**: All TypeScript errors have been fixed. If you see new ones, run:
```bash
npm run build
```

## Next Steps After Testing

Once you confirm the API is returning data:

1. **If API works but modal shows 0 items**: 
   - Issue is in frontend response parsing
   - Check the `handleDrillDown` function in PODashboard.tsx
   - Verify response structure matches expected format

2. **If API returns empty data**:
   - Issue is in backend data fetching
   - Check user's district assignment
   - Verify schools exist in that district
   - Check database has student/checkup data

3. **If API fails with error**:
   - Check server logs for detailed error
   - Verify database connection
   - Check authentication/authorization

## Success Criteria

The drill-down feature is working correctly when:

1. ✅ Clicking a metric opens the modal
2. ✅ Modal shows loading state briefly
3. ✅ Modal displays list of items (schools, referrals, students)
4. ✅ Items show correct data (names, metrics, etc.)
5. ✅ Search and sort work correctly
6. ✅ All metrics have drill-down functionality

## Contact

If you're still experiencing issues after following this guide:

1. Share the browser console logs
2. Share the server console logs
3. Share the output of `node verify_po_user_district.mjs`
4. Share the output of `node test_po_drilldown_simple.mjs`

This will help identify the exact issue.
