# Health Card Approval Required on Every Edit

## Overview
Implemented a critical feature to ensure that **every single edit** made by a Class Teacher to a health card requires Headmaster approval, not just the initial creation.

## Problem Statement
Previously, when a Class Teacher edited an existing health card that was already approved, the changes would be saved directly without requiring HM approval again. This meant:
- Approved health cards could be modified without oversight
- Changes to critical health data bypassed the approval workflow
- No audit trail for post-approval modifications

## Solution Implemented

### Backend Changes (server/routes.ts)

Modified the `PUT /api/annual-cards/:id` endpoint to automatically reset approval status when a Class Teacher makes any edit:

```typescript
app.put("/api/annual-cards/:id", authenticateToken, authorizeRoles("Admin", "ClassTeacher"), async (req: AuthRequest, res) => {
  // ... existing code ...
  
  // CRITICAL: If a Class Teacher is updating, reset status to Pending for HM approval
  // This ensures EVERY edit requires approval, not just initial creation
  if (req.user?.role === "ClassTeacher") {
    allowedUpdates.status = "Pending";
    allowedUpdates.approvalBy = null;
    allowedUpdates.approvalDate = null;
    allowedUpdates.rejectionReason = null;
    allowedUpdates.updatedAt = new Date();
    console.info(`[Health Card Update] Class Teacher ${req.user.id} updating card ${id} - resetting status to Pending for HM approval`);
  }
  
  // ... rest of the code ...
});
```

**Key Changes:**
1. **Status Reset**: Automatically sets `status` to "Pending" for Class Teacher edits
2. **Approval Data Cleared**: Removes previous `approvalBy`, `approvalDate`, and `rejectionReason`
3. **Timestamp Updated**: Sets `updatedAt` to current time
4. **Audit Logging**: Logs the action for tracking purposes

**Admin Behavior**: Admin users can still edit health cards without triggering re-approval (maintains admin override capability)

### Frontend Changes (client/src/pages/HealthCardsPage.tsx)

Updated the success message to inform Class Teachers that their edits require approval:

```typescript
const updateMutation = useMutation({
  // ... mutation function ...
  onSuccess: () => {
    const isClassTeacher = user?.role === "ClassTeacher";
    toast({
      title: isClassTeacher ? "Health card updated - Pending approval" : "Health card updated",
      description: isClassTeacher 
        ? "Your changes have been submitted and are pending Headmaster approval."
        : "The health card has been updated successfully.",
    });
    // ... rest of the code ...
  },
});
```

**User Experience:**
- Class Teachers see: "Health card updated - Pending approval" with message "Your changes have been submitted and are pending Headmaster approval."
- Admins see: "Health card updated" with message "The health card has been updated successfully."

## Workflow

### For Class Teachers:
1. **Edit Health Card**: Class Teacher makes changes to any field in an existing health card
2. **Automatic Status Reset**: Backend automatically sets status to "Pending"
3. **Notification**: Class Teacher sees message that changes are pending approval
4. **Approval Required**: Health card appears in HM's approval queue
5. **HM Reviews**: Headmaster reviews and approves/rejects the changes
6. **Status Updated**: Card status changes to "Approved" or "Rejected"

### For Headmasters:
1. **Notification**: Updated health cards appear in the approvals queue
2. **Review Changes**: HM can review the updated health card
3. **Approve/Reject**: HM approves or rejects the changes
4. **Audit Trail**: System maintains record of who approved and when

### For Admins:
- Admins can edit health cards without triggering re-approval
- This maintains administrative override capability for system management

## Benefits

1. **Complete Oversight**: Every change to health data is reviewed by HM
2. **Data Integrity**: Prevents unauthorized modifications to approved records
3. **Audit Trail**: Clear record of all changes and approvals
4. **Accountability**: Class Teachers know their edits will be reviewed
5. **Quality Control**: Ensures all health data meets quality standards

## Technical Details

### Affected Endpoints:
- `PUT /api/annual-cards/:id` - Health card update endpoint

### Affected Fields Reset on Edit:
- `status` → "Pending"
- `approvalBy` → null
- `approvalDate` → null
- `rejectionReason` → null
- `updatedAt` → current timestamp

### Existing Approval Endpoints (Unchanged):
- `PUT /api/annual-cards/:id/approve` - HM/Admin approves card
- `PUT /api/annual-cards/:id/reject` - HM/Admin rejects card

## Testing Checklist

- [x] Class Teacher edits approved health card → Status resets to Pending
- [x] Class Teacher sees appropriate success message
- [x] Updated card appears in HM approval queue
- [x] HM can approve/reject the updated card
- [x] Admin edits don't trigger re-approval
- [x] Approval data is cleared on Class Teacher edit
- [x] Timestamp is updated correctly

## Database Schema

No database changes required. Uses existing fields:
- `status` (text) - "Pending", "Approved", "Rejected"
- `approvalBy` (varchar) - User ID of approver
- `approvalDate` (timestamp) - When approved/rejected
- `rejectionReason` (text) - Reason if rejected
- `updatedAt` (timestamp) - Last update time

## Files Modified

1. **server/routes.ts** - Added approval reset logic to PUT endpoint
2. **client/src/pages/HealthCardsPage.tsx** - Updated success message for Class Teachers

## Deployment Notes

- No database migrations required
- No breaking changes to API
- Backward compatible with existing data
- Can be deployed immediately

## Future Enhancements

Consider implementing:
1. **Change History**: Track what fields were changed in each edit
2. **Notification System**: Notify HM when cards are updated
3. **Bulk Approval**: Allow HM to approve multiple updated cards at once
4. **Version Control**: Maintain history of all versions of a health card
5. **Comparison View**: Show HM what changed between versions

## Summary

This implementation ensures complete oversight of all health card data by requiring Headmaster approval for every edit made by Class Teachers. The system maintains data integrity while providing clear feedback to users about the approval workflow.
