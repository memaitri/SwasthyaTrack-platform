# Quick Test: PO Dashboard Drill-Down

## 🚀 Quick Start (2 minutes)

### Step 1: Start Server
```bash
npm run dev
```
Wait for: `Server running on http://localhost:5000`

### Step 2: Login
- Go to: http://localhost:5000
- Username: `po1`
- Password: `password123`

### Step 3: Test Drill-Down
1. Open Browser Console (Press F12)
2. Click the "Total Schools" card
3. Watch the console logs

## ✅ What Should Happen

### Browser Console Should Show:
```
Drill-down params: {type: "schools", month: "2", year: "2026", ...}
Drill-down request: {type: "schools", endpoint: "/api/po/drilldown/schools?...", ...}
Drill-down response: {schools: Array(4), total: 4, metadata: {...}}
Drill-down response keys: schools,total,metadata
Drill-down response.schools: [{id: "...", name: "...", ...}, ...]
Drill-down items extracted: 4 items
Drill-down items sample: {id: "...", name: "...", totalStudents: 100, ...}
```

### Server Console Should Show:
```
=== PO Drill-Down Schools Request ===
User: <user-id> Role: PO
Params: {month: '2', year: '2026', schoolType: 'All', metric: undefined}
User district: Jalgaon
Total schools in system: 10
Schools in user district: 4
Enriched schools: 4
Sample school: {...}
Returning response with 4 schools
```

### Modal Should Show:
- Title: "Schools Overview"
- List of 4 schools
- Each school shows: name, district, students, completion %
- Search box at top
- Sort buttons work

## ❌ If It Doesn't Work

### Problem: No console logs at all
**Fix**: MetricCard might not be clickable
- Check if card has pointer cursor on hover
- Check if card has blue border on hover

### Problem: Console shows "401 Unauthorized"
**Fix**: Not logged in
- Logout and login again
- Check: `localStorage.getItem('accessToken')` in console

### Problem: Console shows "0 items"
**Fix**: User has no schools in district
```bash
node verify_po_user_district.mjs
```
This will show which users have schools.

### Problem: Server not responding
**Fix**: Server not running
- Check terminal for "Server running" message
- Restart: `npm run dev`

## 🔧 Quick Diagnostics

### Check User District
```bash
node verify_po_user_district.mjs
```
Shows: All PO users, their districts, and school counts

### Test API Directly
```bash
node test_po_drilldown_simple.mjs
```
Tests: All drill-down endpoints and shows responses

## 📋 All Clickable Metrics

Test each of these by clicking:

1. **Total Schools** → Shows list of schools
2. **Pending Referrals** → Shows list of pending referrals
3. **Underweight** (in BMI section) → Shows underweight students
4. **Obese** (in BMI section) → Shows obese students
5. **Leprosy Cases** → Shows students with leprosy
6. **TB Cases** → Shows students with TB
7. **Anemia Cases** → Shows students with anemia
8. **Adolescent Issues** → Shows adolescent health cases
9. **Vitamin A** (in deficiencies) → Shows Vitamin A deficiency cases
10. **Vitamin D** (in deficiencies) → Shows Vitamin D deficiency cases
11. **Iron** (in deficiencies) → Shows Iron deficiency cases
12. **Calcium** (in deficiencies) → Shows Calcium deficiency cases
13. **Protein** (in deficiencies) → Shows Protein deficiency cases
14. **Other** (in deficiencies) → Shows other deficiency cases

## 🎯 Success = All 14 Metrics Show Data

If all 14 metrics open modals with data, the feature is working perfectly!

## 📞 Need Help?

Share these 3 things:
1. Browser console logs (copy all "Drill-down" messages)
2. Server console logs (copy all "=== PO Drill-Down" messages)
3. Which metric you clicked

That's all we need to fix any issue!
