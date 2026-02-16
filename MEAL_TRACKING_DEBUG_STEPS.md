# 🔍 Meal Tracking Debug Steps

## Current Status

**Database**: ✅ Has correct data (114 meals for TEST SCHOOL)  
**Expected Display**: 34% compliance, 4 students, 114 meals logged  
**Actual Display**: 0% compliance, 0 students, 0 meals logged  

## Root Cause

The API endpoints are correct and the database has data, but the frontend is showing 0 values. This indicates:
1. The API request is failing (401/403/500 error)
2. The server isn't running
3. The response is being cached with old data

## Fixes Applied

### 1. ✅ Added Console Logging
**File**: `client/src/pages/PODashboard.tsx`

Added logging to both components:
- `MealComplianceSection` - logs API calls and responses
- `MissingMealItemsSection` - logs API calls and responses

### 2. ✅ Added Error Handling
Added error display to show when API calls fail instead of silently showing 0 values.

## Testing Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these messages:
   ```
   [MealCompliance] Fetching data with params: month=2&year=2026&schoolType=All
   [MealCompliance] Received data: { overallCompliance: 34, totalStudents: 4, ... }
   ```

### Step 2: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for `/api/po/meal-compliance` request
5. Check:
   - Status code (should be 200)
   - Response data (should show 34% compliance)

### Step 3: Restart the Server
The server might need to be restarted to pick up the new meal data:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 4: Clear Browser Cache
Hard refresh the page:
- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

### Step 5: Check Authentication
Make sure you're logged in as PO0:
- Username: `po0`
- Check that the token is valid
- Try logging out and back in

## Expected Results

After following the steps above, you should see:

### Meal Compliance Analytics:
- **Overall Compliance**: 34% (yellow/warning)
- **Total Students**: 4
- **Meals Logged**: 114
- **Expected Meals**: 336

### 6-Month Trend:
- Line chart with data points
- Current month showing 34%

### Missing Meal Items:
- TEST SCHOOL listed
- Missing breakfast: 222
- Missing lunch: 222
- Missing dinner: 297

## Common Issues & Solutions

### Issue 1: API Returns 401 Unauthorized
**Cause**: Not logged in or token expired  
**Solution**: Log out and log back in as PO0

### Issue 2: API Returns 403 Forbidden
**Cause**: User doesn't have PO role  
**Solution**: Verify user role in database

### Issue 3: API Returns 500 Server Error
**Cause**: Server error or database connection issue  
**Solution**: Check server console for error messages

### Issue 4: API Returns Empty Data
**Cause**: Region/district filtering not matching  
**Solution**: Run `node debug_meal_api_call.mjs` to verify filtering

### Issue 5: Still Shows 0 After All Steps
**Cause**: Frontend caching or React Query cache  
**Solution**: 
1. Clear browser cache completely
2. Close and reopen browser
3. Try incognito/private mode

## Verification Commands

### Check Database Data:
```bash
node debug_meal_api_call.mjs
```

Expected output:
```
✅ EXPECTED API RESPONSE:
   overallCompliance: 34%
   totalStudents: 4
   totalExpectedMeals: 336
   totalLoggedMeals: 114
```

### Check Server is Running:
```bash
curl http://localhost:5000/api/po/meal-compliance?month=2&year=2026&schoolType=All \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Files Modified

1. ✅ `client/src/pages/PODashboard.tsx`
   - Added console logging to MealComplianceSection
   - Added console logging to MissingMealItemsSection
   - Added error handling and display

2. ✅ `debug_meal_api_call.mjs`
   - Script to verify database data and filtering logic

## Next Steps

1. **Open browser console** and check for log messages
2. **Check Network tab** for API requests and responses
3. **Restart the server** if needed
4. **Hard refresh** the browser (Ctrl+Shift+R)
5. **Share console output** if still not working

## What to Share if Still Not Working

1. Browser console output (all messages)
2. Network tab screenshot showing the API request
3. Server console output (any errors)
4. Screenshot of what you see in the UI

---

**Status**: Debug logging added, awaiting test results  
**Date**: February 16, 2026  
**Next**: Restart server, refresh browser, check console
