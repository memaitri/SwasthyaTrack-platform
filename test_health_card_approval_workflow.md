# Testing Health Card Approval on Every Edit

## Test Scenario 1: Class Teacher Edits Approved Health Card

### Setup:
1. Login as Class Teacher
2. Navigate to Health Cards page
3. Find an approved health card

### Steps:
1. Click "Edit" on an approved health card
2. Make any change (e.g., update weight, height, or any field)
3. Click "Save"

### Expected Results:
- ✅ Success message: "Health card updated - Pending approval"
- ✅ Description: "Your changes have been submitted and are pending Headmaster approval."
- ✅ Health card status changes to "Pending"
- ✅ Card appears in Headmaster's approval queue

### Backend Verification:
Check server logs for:
```
[Health Card Update] Class Teacher {id} updating card {cardId} - resetting status to Pending for HM approval
```

## Test Scenario 2: Headmaster Approves Updated Card

### Setup:
1. Complete Test Scenario 1
2. Login as Headmaster

### Steps:
1. Navigate to Approvals page
2. Find the updated health card in pending list
3. Click "Approve"

### Expected Results:
- ✅ Success message: "Health card approved"
- ✅ Card status changes to "Approved"
- ✅ `approvalBy` field set to HM's user ID
- ✅ `approvalDate` set to current timestamp
- ✅ Card removed from pending list

## Test Scenario 3: Class Teacher Edits Again

### Setup:
1. Complete Test Scenario 2
2. Login as Class Teacher

### Steps:
1. Edit the same health card again
2. Make another change
3. Save

### Expected Results:
- ✅ Status resets to "Pending" again
- ✅ Previous approval data cleared
- ✅ Card appears in HM approval queue again
- ✅ Success message shows pending approval

## Test Scenario 4: Admin Edits Health Card

### Setup:
1. Login as Admin
2. Navigate to Health Cards page

### Steps:
1. Edit any health card
2. Make changes
3. Save

### Expected Results:
- ✅ Success message: "Health card updated" (no pending approval message)
- ✅ Status does NOT reset to Pending
- ✅ Changes saved immediately without requiring approval
- ✅ Admin override capability maintained

## Test Scenario 5: Headmaster Rejects Updated Card

### Setup:
1. Class Teacher edits a health card
2. Login as Headmaster

### Steps:
1. Navigate to Approvals page
2. Find the updated card
3. Click "Reject"
4. Enter rejection reason
5. Confirm rejection

### Expected Results:
- ✅ Success message: "Health card rejected"
- ✅ Card status changes to "Rejected"
- ✅ `rejectionReason` field populated
- ✅ Class Teacher can see rejection reason
- ✅ Class Teacher can edit and resubmit

## Test Scenario 6: Multiple Edits Before Approval

### Setup:
1. Login as Class Teacher

### Steps:
1. Edit health card (Edit #1)
2. Save
3. Edit same card again (Edit #2)
4. Save
5. Login as HM and approve

### Expected Results:
- ✅ Each edit resets status to Pending
- ✅ Latest changes are what HM sees
- ✅ Only one approval needed (for latest version)
- ✅ Previous pending states overwritten

## Database Verification Queries

### Check Status Reset:
```sql
SELECT id, status, approval_by, approval_date, updated_at 
FROM annual_health_cards 
WHERE id = '{card_id}';
```

### Check Approval History:
```sql
SELECT id, student_id, status, approval_by, approval_date, rejection_reason, updated_at
FROM annual_health_cards 
WHERE student_id = '{student_id}'
ORDER BY updated_at DESC;
```

## API Testing

### Test Update Endpoint:
```bash
# As Class Teacher
curl -X PUT http://localhost:5000/api/annual-cards/{card_id} \
  -H "Authorization: Bearer {class_teacher_token}" \
  -H "Content-Type: application/json" \
  -d '{"weightKg": 45.5}'

# Expected Response:
# - status: "Pending"
# - approvalBy: null
# - approvalDate: null
```

### Test Approval Endpoint:
```bash
# As Headmaster
curl -X PUT http://localhost:5000/api/annual-cards/{card_id}/approve \
  -H "Authorization: Bearer {headmaster_token}" \
  -H "Content-Type: application/json"

# Expected Response:
# - status: "Approved"
# - approvalBy: {headmaster_id}
# - approvalDate: {current_timestamp}
```

## Edge Cases to Test

1. **Concurrent Edits**: Two Class Teachers edit same card simultaneously
2. **Network Failure**: Edit saved but UI doesn't update
3. **Permission Changes**: User role changes mid-session
4. **Deleted Student**: Edit card for student that was deleted
5. **Invalid Data**: Submit invalid health data

## Performance Testing

1. **Bulk Updates**: Edit 100 health cards in sequence
2. **Query Performance**: Check approval queue load time with 1000+ pending cards
3. **Cache Invalidation**: Verify all dashboards update after approval

## Rollback Plan

If issues are found:
1. Revert `server/routes.ts` changes
2. Revert `client/src/pages/HealthCardsPage.tsx` changes
3. Restart server
4. Clear browser cache

## Success Criteria

All test scenarios pass with:
- ✅ No errors in browser console
- ✅ No errors in server logs
- ✅ Correct status transitions
- ✅ Proper user notifications
- ✅ Data integrity maintained
- ✅ Approval workflow functions correctly
