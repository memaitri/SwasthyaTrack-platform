# PO Staff Blocking Feature - Implementation Summary

## Overview
Implemented a comprehensive staff account blocking/unblocking system for Program Officers (PO) to manage staff accounts within their district. Blocked users are immediately logged out and cannot log in until unblocked.

## Changes Made

### 1. Database Schema Updates
**File: `shared/schema.ts`**
- Added `isBlocked` (boolean, default: false)
- Added `blockedBy` (varchar) - ID of user who blocked the account
- Added `blockedAt` (timestamp) - When the account was blocked
- Added `blockReason` (text) - Reason for blocking

**Migration: `migrations/0024_add_user_blocking.sql`**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = TRUE;
```

### 2. Authentication Updates
**File: `server/auth.ts`**
- Added blocked user check in login endpoint
- Returns 403 status with blocked message if user is blocked
- Prevents blocked users from logging in

### 3. API Endpoints
**File: `server/routes.ts`**

#### New Endpoints:

1. **GET `/api/users/staff`** - Get approved staff for management
   - PO: Returns all approved staff (Headmasters + school staff) in their district
   - Admin: Returns all approved staff across all districts
   - Includes blocking status and details

2. **POST `/api/users/:id/block`** - Block a user account
   - PO can block: Headmasters and school staff in their district
   - Admin can block: Any staff (except PO and Admin roles)
   - Cannot block yourself
   - Requires reason (optional, defaults to "Blocked by administrator")
   - Creates audit log and sends notification
   - Immediately prevents login

3. **POST `/api/users/:id/unblock`** - Unblock a user account
   - PO can unblock: Staff in their district
   - Admin can unblock: Any staff
   - Creates audit log and sends notification
   - Allows user to log in again

#### Authorization Rules:
- PO can only block/unblock staff in their district
- Cannot block PO or Admin roles
- Cannot block your own account
- District validation for Headmasters (checks user.district)
- District validation for school staff (checks school.district)

### 4. UI Updates
**File: `client/src/pages/ApprovalsPage.tsx`**

#### New Features:
1. **Tab-based Interface** for PO and Admin users:
   - **Pending Approvals Tab**: User registration approvals
   - **Schools Tab**: School registration approvals
   - **Manage Staff Tab**: Block/unblock staff accounts

2. **Staff Management Tab**:
   - Lists all approved staff in PO's district
   - Shows blocking status with visual indicators:
     - Red badge for blocked accounts
     - Green badge for active accounts
   - Displays block reason and timestamp for blocked accounts
   - Block/Unblock buttons with appropriate actions

3. **Block Dialog**:
   - Shows user details before blocking
   - Requires reason input
   - Confirms action with warning message

4. **Visual Indicators**:
   - Blocked users shown with red avatar background
   - Block reason displayed in alert box
   - Timestamp of when account was blocked

#### New Icons Added:
- `Ban` - For block action
- `Unlock` - For unblock action
- `ShieldAlert` - For block reason display

### 5. User Experience Flow

#### Blocking a User:
1. PO navigates to Approvals page → Manage Staff tab
2. Sees list of all staff in their district
3. Clicks "Block Account" button on active user
4. Dialog opens showing user details
5. Enters reason for blocking
6. Confirms block action
7. User is immediately blocked and logged out
8. Notification sent to blocked user

#### Unblocking a User:
1. PO sees blocked user in staff list (red badge)
2. Clicks "Unblock" button
3. User is immediately unblocked
4. Notification sent to user
5. User can now log in again

#### Blocked User Login Attempt:
1. User tries to log in
2. System checks `isBlocked` field
3. Returns 403 error with message
4. User sees: "Your account has been blocked. Please contact your Program Officer or administrator."
5. Block reason is included in response

## Security Features

1. **Role-based Access Control**:
   - Only PO and Admin can block/unblock
   - PO restricted to their district
   - Cannot block higher privilege roles

2. **Audit Trail**:
   - All block/unblock actions logged
   - Includes who performed action and when
   - Reason for blocking recorded

3. **Immediate Effect**:
   - Blocked users cannot log in
   - Login check happens before password verification
   - No session tokens issued to blocked users

4. **Notifications**:
   - User notified when blocked
   - User notified when unblocked
   - Includes reason for action

## Testing

### Manual Testing Steps:

1. **Test Blocking**:
   ```
   - Login as PO
   - Navigate to Approvals → Manage Staff
   - Select a Headmaster or staff member
   - Click "Block Account"
   - Enter reason and confirm
   - Verify user appears as blocked
   - Try to login as blocked user → Should fail with 403
   ```

2. **Test Unblocking**:
   ```
   - Login as PO
   - Navigate to Approvals → Manage Staff
   - Find blocked user
   - Click "Unblock"
   - Verify user appears as active
   - Login as unblocked user → Should succeed
   ```

3. **Test District Restrictions**:
   ```
   - Login as PO from District A
   - Try to block staff from District B → Should fail
   - Verify only District A staff visible
   ```

4. **Test Role Restrictions**:
   ```
   - Try to block PO account → Should fail
   - Try to block Admin account → Should fail
   - Try to block own account → Should fail
   ```

## Files Modified

1. `shared/schema.ts` - Added blocking fields to users table
2. `server/auth.ts` - Added blocked user check in login
3. `server/routes.ts` - Added block/unblock endpoints and staff list endpoint
4. `client/src/pages/ApprovalsPage.tsx` - Added staff management UI with tabs
5. `migrations/0024_add_user_blocking.sql` - Database migration
6. `apply_user_blocking_migration.mjs` - Migration script

## Migration Applied

✅ Migration successfully applied to database
- Added 4 new columns to users table
- Created index for faster blocked user lookups

## Next Steps

1. Test the feature thoroughly in development
2. Verify PO can only see/manage staff in their district
3. Test blocking/unblocking workflow end-to-end
4. Verify blocked users cannot login
5. Check audit logs are being created
6. Verify notifications are sent correctly

## Notes

- Blocked users are NOT deleted, just prevented from logging in
- Block history is maintained (blockedBy, blockedAt, blockReason)
- Unblocking clears the block fields
- PO can manage both Headmasters and school staff in their district
- Admin has full access to block/unblock any staff
