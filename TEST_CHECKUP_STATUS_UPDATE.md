# Testing Guide: Monthly Checkup Status Update

## Quick Test Steps

### 1. Test Default Status (New Checkups)
1. Login as Class Teacher
2. Navigate to Monthly Checkups
3. Select a Medical Event
4. Click "Start Checkup" on any student
5. **Verify**: Status field should be at the bottom of the form
6. **Verify**: Status should default to "In progress"

### 2. Test Status Field Position
1. Open any checkup form
2. **Verify**: Form fields appear in this order:
   - Month and Year
   - Student Present checkbox
   - Height and Weight
   - Temperature and Blood Pressure
   - Symptoms, Diagnosis, Medications
   - Referral Information
   - Follow-up
   - Additional Notes
   - **Status (at the bottom with border-top)**
   - Submit buttons

### 3. Test Completed Checkup Lock (Class Teacher)
1. Login as Class Teacher
2. Open a checkup that is "In progress"
3. Fill in some data
4. Change status to "Completed"
5. Click "Save Checkup"
6. **Verify**: Checkup saves successfully
7. Try to open the same checkup again
8. **Verify**: 
   - Blue "View Only" badge appears
   - All fields are disabled/grayed out
   - Status field is disabled
   - Submit button is hidden
   - Only "Close" button is visible
   - Button text shows "View Details" instead of "Edit Checkup"

### 4. Test API Protection
1. Login as Class Teacher
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try to edit a completed checkup
5. Attempt to submit the form (if you can bypass frontend)
6. **Verify**: API returns 403 error with message:
   ```json
   {
     "message": "This checkup has been completed and is now read-only. Only Medical Teams can modify completed checkups.",
     "isCompleted": true
   }
   ```

### 5. Test Medical Team Access (If Available)
1. Login as Medical Team member
2. Open a completed checkup
3. **Verify**: Form should be editable (not read-only)
4. **Verify**: Can modify and save completed checkups

### 6. Test Visual Indicators
1. Login as Class Teacher
2. View list of checkups
3. **Verify**: Completed checkups show:
   - "View Only" badge with eye icon
   - Month and year in badge
   - "View Details" button text

### 7. Test Status Description
1. Open any checkup form
2. Scroll to the Status field at the bottom
3. **Verify**: Help text appears below status dropdown:
   - "Once marked as 'Completed', this checkup will become read-only and cannot be edited."

## Expected Behavior Summary

| User Role | Checkup Status | Can Edit? | Button Text | Visual Indicator |
|-----------|---------------|-----------|-------------|------------------|
| Class Teacher | In progress | ✅ Yes | "Edit Checkup" | None |
| Class Teacher | Completed | ❌ No | "View Details" | "View Only" badge |
| Medical Team | In progress | ✅ Yes | "Edit Checkup" | None |
| Medical Team | Completed | ✅ Yes | "Edit Checkup" | None |

## Database Verification

Run this SQL to check default status:
```sql
-- Check the default value
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'student_checkups' 
AND column_name = 'status';

-- Should return: 'In progress'

-- Check existing records
SELECT status, COUNT(*) 
FROM student_checkups 
GROUP BY status;
```

## Rollback (If Needed)

If you need to revert the changes:

1. **Database**: 
```sql
ALTER TABLE student_checkups 
ALTER COLUMN status SET DEFAULT 'Not started';
```

2. **Code**: Revert the commits for:
   - client/src/pages/MonthlyCheckupsPage.tsx
   - server/routes.ts
   - server/storage.ts
   - shared/schema.ts

## Common Issues

### Issue: Status still shows "Not started"
**Solution**: Clear browser cache and reload, or restart the development server

### Issue: Can still edit completed checkups
**Solution**: Check that you're logged in as Class Teacher, not Medical Team

### Issue: API returns 500 error
**Solution**: Check server logs, ensure database migration was applied

## Success Criteria

✅ All new checkups default to "In progress"  
✅ Status field appears at bottom of form  
✅ Completed checkups are read-only for Class Teachers  
✅ API blocks unauthorized edits  
✅ Visual indicators show read-only state  
✅ No console errors  
✅ No TypeScript errors  
✅ Database migration applied successfully  
