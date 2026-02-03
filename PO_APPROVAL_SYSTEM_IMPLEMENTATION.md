# PO-Level Approval System Implementation

## Overview

Implemented a comprehensive PO-level approval system where newly created Headmaster accounts and new schools remain inactive until approved by the Program Officer (PO). Only approved accounts can log in and access the system.

## Key Features

### 1. Headmaster Account Approval Workflow

**Registration Process:**
- Headmaster accounts require district information during registration
- Accounts are created with `isActive: false` and `approvalStatus: "Pending"`
- Notifications are sent to POs in the same district for approval

**Approval Authority:**
- POs can approve/reject Headmaster accounts in their district
- Admins retain the ability to approve any pending account
- Headmasters cannot approve other Headmaster accounts

**Login Restrictions:**
- Unapproved Headmaster accounts cannot log in
- Login attempts return "Account is not active" error message

### 2. School Approval Workflow

**School Request Process:**
- New school requests are created with `approvalStatus: "Pending"` and `isActive: false`
- Notifications are sent to both POs (district-specific) and Admins

**Approval Authority:**
- POs can approve/reject schools in their district
- Admins can approve/reject any pending school
- Approved schools become active and available for user registration

### 3. Enhanced Approval Interface

**PO Dashboard Integration:**
- POs can access pending approvals via the existing Approvals page
- Separate sections for pending Headmaster accounts and school requests
- District-based filtering ensures POs only see relevant requests

**Approval Actions:**
- Approve/reject buttons with reason tracking
- Audit logging for all approval actions
- Notification system for approval status updates

## Technical Implementation

### Backend Changes

#### 1. Registration Logic Updates (`server/routes.ts`)

```typescript
// Headmaster registration now notifies POs instead of Admins
if (data.role === "Headmaster") {
  if (data.district) {
    await storage.createNotification({
      senderId: user.id,
      senderRole: user.role as any,
      receiverRole: "PO" as any,
      type: "system" as any,
      title: "Headmaster approval request",
      message: `${user.fullName} (Headmaster) has requested an account for ${data.district} district. PO approval required.`,
      metadata: { pendingUserId: user.id, district: data.district },
    } as any);
  }
}
```

#### 2. Approval Endpoints Enhancement

**Updated Authorization:**
- `/api/approvals/pending` - Now accessible by PO, Headmaster, and Admin
- `/api/approvals/:id/approve` - POs can approve Headmaster accounts in their district
- `/api/approvals/:id/reject` - POs can reject Headmaster accounts in their district

**PO-Specific Logic:**
```typescript
if (requester.role === "PO") {
  // PO can approve Headmaster accounts in their district
  if (userToApprove.role !== "Headmaster") {
    return res.status(403).json({ message: "PO can only approve Headmaster accounts" });
  }
  
  const poUser = await storage.getUser(requester.id);
  const poDistrict = poUser?.district;
  
  if (userToApprove.district !== poDistrict) {
    return res.status(403).json({ message: "Cannot approve Headmaster from a different district" });
  }
}
```

#### 3. School Approval System

**Enhanced School Endpoints:**
- `/api/schools/pending` - Now accessible by both PO and Admin
- `/api/schools/:id/approve` - POs can approve schools in their district
- `/api/schools/:id/reject` - POs can reject schools in their district

**District-Based Filtering:**
```typescript
if (requester.role === "PO") {
  const poUser = await storage.getUser(requester.id);
  const poDistrict = poUser?.district;
  
  pending = await db.select().from(schools).where(and(
    eq(schools.approvalStatus, "Pending"),
    eq(schools.district, poDistrict)
  )).orderBy(desc(schools.createdAt));
}
```

### Frontend Changes

#### 1. Registration Form Updates (`client/src/pages/RegisterPage.tsx`)

**District Requirement for Headmasters:**
```typescript
// Added district field requirement for Headmaster role
.refine((data) => {
  if (data.role === "Headmaster") {
    return !!data.district;
  }
  return true;
}, {
  message: "District is required for Headmaster",
  path: ["district"],
});
```

**UI Enhancements:**
- Added district input field for Headmaster registration
- Updated approval status messages to reflect PO approval requirement
- Added helpful text explaining approval workflows

#### 2. Approvals Page Enhancement (`client/src/pages/ApprovalsPage.tsx`)

**PO-Specific Features:**
- District-based filtering for pending requests
- Separate sections for Headmaster and school approvals
- Role-specific messaging and descriptions

**Enhanced Query Logic:**
```typescript
// PO can view pending schools and Headmaster accounts
enabled: user?.role === "Admin" || user?.role === "PO"
```

### Database Schema Updates

#### 1. Validation Rules (`shared/schema.ts`)

**Enhanced Registration Schema:**
```typescript
// Headmaster MUST have district for PO approval workflow
if (data.role === "Headmaster" && !data.district) {
  return false;
}
```

**Updated Error Messages:**
- Clear indication that Headmaster requires district
- Specific messaging for PO approval requirements

## Security Considerations

### 1. Authorization Controls

**Role-Based Access:**
- POs can only approve accounts/schools in their district
- Strict validation of district matching
- Audit logging for all approval actions

**Permission Boundaries:**
- POs cannot approve PO or Admin accounts
- POs cannot approve accounts outside their district
- Fallback to Admin approval for edge cases

### 2. Data Validation

**Input Validation:**
- District information required and validated
- Cross-reference district information between users and schools
- Prevent approval of mismatched district assignments

## Testing

### Automated Test Coverage

Created comprehensive test script (`test_po_approval_system.mjs`) covering:

1. **PO Account Creation and Approval**
   - PO registration with Admin approval
   - PO login after approval

2. **School Request and Approval**
   - School creation with pending status
   - PO approval of schools in their district

3. **Headmaster Account Workflow**
   - Headmaster registration with district requirement
   - Login blocking before approval
   - PO approval process
   - Login success after approval

### Test Scenarios

**Positive Tests:**
- ✅ PO can approve Headmaster in same district
- ✅ PO can approve school in same district
- ✅ Approved accounts can log in successfully
- ✅ Notifications are sent correctly

**Negative Tests:**
- ✅ Unapproved accounts cannot log in
- ✅ PO cannot approve accounts from different districts
- ✅ PO cannot approve PO/Admin accounts

## Usage Instructions

### For Program Officers (POs)

1. **Access Approvals:**
   - Navigate to the Approvals page from the dashboard
   - View pending Headmaster accounts in your district
   - View pending school requests in your district

2. **Approve/Reject Accounts:**
   - Review account details and district information
   - Click "Approve" to activate the account
   - Click "Reject" with reason to deny the request

3. **Approve/Reject Schools:**
   - Review school information and location
   - Verify district matches your assignment
   - Approve or reject with appropriate reasoning

### For Headmasters

1. **Registration:**
   - Provide district information during registration
   - Account will be pending until PO approval
   - Receive notification when approved/rejected

2. **Login:**
   - Cannot log in until account is approved
   - Contact your district PO if approval is delayed

### For Administrators

1. **Oversight:**
   - Can approve any pending account or school
   - Monitor PO approval activities
   - Handle escalations and edge cases

## Benefits

### 1. Decentralized Approval Process
- Reduces Admin workload
- Faster approval for district-level requests
- Better local knowledge for approval decisions

### 2. Enhanced Security
- District-based access control
- Prevents unauthorized account activation
- Audit trail for all approval actions

### 3. Improved User Experience
- Clear approval status messaging
- Role-specific guidance
- Automated notifications

## Future Enhancements

### Potential Improvements

1. **Bulk Approval Actions**
   - Allow POs to approve multiple accounts at once
   - Batch processing for efficiency

2. **Approval Delegation**
   - Allow POs to delegate approval authority
   - Temporary approval permissions

3. **Enhanced Reporting**
   - Approval metrics and analytics
   - Performance tracking for approval workflows

4. **Mobile Optimization**
   - Mobile-friendly approval interface
   - Push notifications for pending approvals

## Conclusion

The PO-level approval system successfully implements a hierarchical approval workflow that:

- ✅ Ensures only approved accounts can access the system
- ✅ Distributes approval authority to appropriate roles
- ✅ Maintains security through district-based access control
- ✅ Provides clear user feedback and guidance
- ✅ Includes comprehensive testing and validation

The system is now ready for production use and provides a solid foundation for future enhancements to the approval workflow.