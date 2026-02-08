# Class Teacher Referral Tracking - Verification Checklist

## Quick Verification Steps

### 1. Backend API Response
- [ ] `/api/teacher/referral-tracking` returns `summary.pending`
- [ ] `/api/teacher/referral-tracking` returns `summary.inProgress`
- [ ] `/api/teacher/referral-tracking` returns `summary.completed`
- [ ] `/api/teacher/referral-tracking` returns `summary.overdue`
- [ ] `/api/teacher/referral-tracking` returns `pendingCount`
- [ ] `/api/teacher/referral-tracking` returns `inProgressCount`
- [ ] `/api/teacher/referral-tracking` returns `completedCount`
- [ ] `/api/teacher/referral-tracking` returns `referrals` array

### 2. Frontend Display - Overview Tab
- [ ] "Pending Referrals" card shows correct count
- [ ] "In Progress" card shows correct count
- [ ] "Completed" card shows correct count
- [ ] Cards display "0" when no referrals exist (not blank/undefined)

### 3. Frontend Display - Referrals Tab
- [ ] "Pending Referrals" metric shows correct count
- [ ] "In Progress" metric shows correct count
- [ ] "Completed" metric shows correct count
- [ ] "Overdue" metric shows correct count
- [ ] Referral list displays student names
- [ ] Referral list shows referral type and facility
- [ ] Status dropdown is functional
- [ ] Status can be updated successfully

### 4. Functionality Tests
- [ ] Query only runs after user is authenticated
- [ ] Referrals are filtered by teacher's class section
- [ ] Month/year filters work correctly
- [ ] Status updates persist after page refresh
- [ ] No console errors when loading the page
- [ ] No console errors when switching tabs

### 5. Edge Cases
- [ ] Works when teacher has no students
- [ ] Works when students have no referrals
- [ ] Works when all referrals are completed
- [ ] Works when referrals are overdue
- [ ] Handles network errors gracefully

## Test Commands

### Run the automated test:
```bash
node test_referral_tracking_fix.mjs
```

### Manual API test with curl:
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"classteacher1","password":"password123"}' \
  | jq -r '.token')

# Fetch referral tracking
curl -X GET "http://localhost:5000/api/teacher/referral-tracking?month=2&year=2026" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

### Check for required fields:
```bash
curl -X GET "http://localhost:5000/api/teacher/referral-tracking?month=2&year=2026" \
  -H "Authorization: Bearer $TOKEN" \
  | jq 'keys'
# Should include: referrals, summary, pendingCount, inProgressCount, completedCount
```

## Expected API Response Structure

```json
{
  "referrals": [
    {
      "id": "ref-123",
      "studentId": "student-456",
      "studentName": "John Doe",
      "classSection": "5A",
      "type": "Medical",
      "facility": "District Hospital",
      "issue": "Vision problem",
      "status": "Pending",
      "date": "2026-02-01",
      "followUpRequired": false
    }
  ],
  "summary": {
    "total": 10,
    "pending": 3,
    "inProgress": 2,
    "completed": 4,
    "overdue": 1
  },
  "pendingCount": 3,
  "inProgressCount": 2,
  "completedCount": 4
}
```

## Common Issues and Solutions

### Issue: All counts show 0
**Solution**: Check if:
- Teacher has students assigned to their class
- Students have referrals in the database
- Month/year filters match existing referral dates

### Issue: Query not running
**Solution**: Check if:
- User is authenticated (check browser console)
- `enabled: !!user` flag is present in the query
- No network errors in browser dev tools

### Issue: Status dropdown not working
**Solution**: Check if:
- `updateReferralMutation` is defined
- `/api/referrals/:id` PATCH endpoint is accessible
- Teacher has permission to update referrals

### Issue: "In Progress" shows undefined
**Solution**: 
- Verify backend includes `inProgress` in summary
- Check API response in browser Network tab
- Ensure server code has been restarted after changes

## Browser Console Checks

Open browser console and run:
```javascript
// Check if referralData is loaded
console.log(window.__REACT_QUERY_DEVTOOLS_CACHE__);

// Or in React DevTools, find ClassTeacherDashboard component
// and inspect the referralData prop
```

## Success Criteria

✅ All 4 metrics display in Referrals tab
✅ Overview tab shows referral counts
✅ Referral list populates with data
✅ Status updates work correctly
✅ No console errors
✅ Automated test passes
