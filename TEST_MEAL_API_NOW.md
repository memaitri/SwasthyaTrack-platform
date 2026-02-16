# 🚨 URGENT: Test Meal API Now

## The Issue

The frontend is showing 0 values for meal tracking. The database has the correct data (114 meals, 34% compliance), but it's not reaching the frontend.

## Quick Test

### Step 1: Is the server running?
Check if you see this in your terminal:
```
Server running on http://localhost:5000
```

If NOT, start the server:
```bash
npm run dev
```

### Step 2: Test the API directly

Open a new terminal and run:

```bash
curl http://localhost:5000/api/po/meal-compliance?month=2&year=2026&schoolType=All
```

**Expected Response**:
```json
{
  "overallCompliance": 34,
  "totalStudents": 4,
  "totalExpectedMeals": 336,
  "totalLoggedMeals": 114,
  ...
}
```

**If you get an error**, the endpoint doesn't exist or the server isn't running.

### Step 3: Check browser console

1. Open the PO Dashboard
2. Click on "Meal Tracking" tab
3. Press F12 to open DevTools
4. Go to Console tab
5. Look for these messages:

```
[MealCompliance] Fetching data with params: month=2&year=2026&schoolType=All
[MealCompliance] Received data: { ... }
[MealCompliance] Rendering with data: { ... }
```

### Step 4: Check Network tab

1. In DevTools, go to Network tab
2. Refresh the page
3. Click on "Meal Tracking" tab
4. Look for `/api/po/meal-compliance` request
5. Click on it and check:
   - Status: Should be 200
   - Response: Should show the data

## Common Problems

### Problem 1: Server not running
**Symptom**: curl command fails with "connection refused"  
**Solution**: Start the server with `npm run dev`

### Problem 2: Endpoint doesn't exist
**Symptom**: curl returns 404 Not Found  
**Solution**: The meal endpoints might not be in the routes file. Check `server/routes.ts` for `/api/po/meal-compliance`

### Problem 3: Authentication error
**Symptom**: API returns 401 or 403  
**Solution**: You need to be logged in as PO. The curl test won't work without a token.

### Problem 4: CORS error
**Symptom**: Browser console shows CORS error  
**Solution**: Server configuration issue

## What to Share

If still not working, share:

1. **Server status**: Is it running? Any errors in server console?
2. **curl output**: What does the curl command return?
3. **Browser console**: Screenshot or copy all messages
4. **Network tab**: Screenshot of the API request

## Files to Check

1. **server/routes.ts** - Line ~8150
   - Should have `app.get("/api/po/meal-compliance", ...)`
   
2. **client/src/pages/PODashboard.tsx** - Line ~75
   - Should have `MealComplianceSection` component

## Quick Fix Attempt

If the endpoint doesn't exist, you might need to restart the server:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

The server needs to be restarted to pick up the new endpoints!

---

**MOST LIKELY ISSUE**: The server wasn't restarted after adding the meal endpoints!

**SOLUTION**: Restart the server with `npm run dev`
