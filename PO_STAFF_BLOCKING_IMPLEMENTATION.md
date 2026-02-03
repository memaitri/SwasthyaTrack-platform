# PO Staff Blocking/Unblocking Feature Implementation

## Overview

This feature allows Program Officers (POs) to block and unblock staff accounts within their district. Blocked users are immediately logged out and cannot log in until unblocked.

## Features Implemented

### 1. Backend API Endpoints

#### GET /api/po/staff
- **Purpose**: Retrieve all staff members in PO's district
- **Access**: PO role only
- **Returns**: List of staff with details including active status
- **Filters**: Excludes other POs and Admins

#### POST /api/po/staff/:id/block
- **Purpose**: Block a staff member account
- **Access**: PO role only
- **Body**: `{ reason: string }` (required)
- **Actions**:
  - Sets `isActive = false` in database
  - Invalidates all refresh tokens (forces logout)
  - Creates audit log entry
  - Sends notification to blocked user

#### POST /api/po/staff/:id/unblock
- **Purpose**: Unblock a staff member account
- **Access**: PO role only
- **Body**: `{ reason: string }` (required)
- **Actions**:
  - Sets `isActive = true` in database
  - Creates audit log entry
  - Sends notification to unblocked user

### 2. Frontend Interface

#### PO Staff Management Page
- **Location**: `/po/dashboard` → Staff Management tab
- **Features**:
  - View all staff in district
  - Search and filter by role/status
  - Block/unblock with reason requirement
  - Real-time status updates
  - Confirmation dialogs for actions

### 3. Security & Permissions

#### Access Control
- Only POs can access staff management endpoints
- POs can only manage staff in their own district
- Cannot block/unblock other POs or Admins
- Reason is required for all block/unblock actions

#### Immediate Effect
- Blocked users are logged out immediately (refresh tokens invalidated)
- Login attempts by blocked users are rejected with "Account not active" message
- Status changes are reflected immediately in the UI

### 4. Audit & Notifications

#### Audit Logging
- All block/unblock actions are logged with:
  - PO who performed the action
  - Staff member affected
  - Reason provided
  - Timestamp
  - District context

#### Notifications
- Blocked users receive system notification
- Unblocked users receive system notification
- Notifications include reason and PO name

## Database Schema

### Existing Tables Used
- `users` table: `isActive` field controls login access
- `refresh_tokens` table: Tokens deleted on block to force logout
- `audit_logs` table: Track all block/unblock actions
- `notifications` table: Notify affected users

### New Indexes Added
```sql
-- Performance indexes for staff filtering
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_district_active_role ON users(district, is_active, role);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

## API Examples

### Get Staff List
```bash
GET /api/po/staff
Authorization: Bearer <po_token>

Response:
[
  {
    "id": "user123",
    "fullName": "John Teacher",
    "role": "ClassTeacher",
    "email": "john@school.edu",
    "schoolName": "ABC School",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### Block Staff Member
```bash
POST /api/po/staff/user123/block
Authorization: Bearer <po_token>
Content-Type: application/json

{
  "reason": "Violation of school policies"
}

Response:
{
  "message": "Staff member blocked successfully",
  "blockedUser": "John Teacher"
}
```

### Unblock Staff Member
```bash
POST /api/po/staff/user123/unblock
Authorization: Bearer <po_token>
Content-Type: application/json

{
  "reason": "Issue resolved after investigation"
}

Response:
{
  "message": "Staff member unblocked successfully",
  "unblockedUser": "John Teacher"
}
```

## Frontend Usage

### Accessing Staff Management
1. Login as PO
2. Navigate to PO Dashboard
3. Click "Staff Management" tab
4. View all staff in your district

### Blocking a Staff Member
1. Find the staff member in the list
2. Click "Block" button (red)
3. Enter reason in the dialog
4. Confirm the action
5. Staff member is immediately blocked and logged out

### Unblocking a Staff Member
1. Find the blocked staff member (marked with red background)
2. Click "Unblock" button (green)
3. Enter reason in the dialog
4. Confirm the action
5. Staff member can now log in again

## Testing

### Test Script
Run the test script to verify functionality:
```bash
node test_po_staff_management.mjs [po_username] [po_password]
```

### Manual Testing Checklist
- [ ] PO can view staff list
- [ ] PO can search/filter staff
- [ ] PO can block active staff members
- [ ] Blocked staff cannot log in
- [ ] PO can unblock blocked staff members
- [ ] Unblocked staff can log in again
- [ ] Audit logs are created for all actions
- [ ] Notifications are sent to affected users
- [ ] PO cannot block other POs or Admins
- [ ] PO cannot manage staff outside their district

## Error Handling

### Common Error Scenarios
1. **PO district not configured**: Returns 400 with message
2. **Staff member not found**: Returns 404 with message
3. **Staff outside PO district**: Returns 403 with message
4. **Attempting to block PO/Admin**: Returns 403 with message
5. **Missing reason**: Frontend validation prevents submission

### Error Messages
- "PO district not configured"
- "Staff member not found"
- "Cannot manage staff outside your district"
- "Cannot block PO or Admin accounts"
- "Please provide a reason for this action"

## Performance Considerations

### Database Indexes
- Added indexes on frequently queried fields
- Composite index for district + active status filtering
- Index on refresh_tokens for efficient cleanup

### Query Optimization
- Staff list query filters by district and excludes PO/Admin roles
- Uses select with specific fields to reduce data transfer
- Includes school name lookup in single query

## Security Considerations

### Authorization
- All endpoints require valid JWT token
- Role-based access control (PO only)
- District-based data isolation

### Data Validation
- Reason field is required and validated
- User ID validation prevents unauthorized access
- District matching prevents cross-district access

### Audit Trail
- All actions are logged with full context
- Immutable audit log for compliance
- Notifications provide transparency

## Future Enhancements

### Potential Improvements
1. **Bulk Actions**: Block/unblock multiple staff at once
2. **Temporary Blocks**: Set expiration dates for blocks
3. **Block Categories**: Different types of blocks (disciplinary, administrative, etc.)
4. **Email Notifications**: Send email alerts in addition to system notifications
5. **Block History**: View history of all blocks/unblocks for a staff member
6. **Advanced Filtering**: Filter by school, block date, reason, etc.

### Integration Opportunities
1. **HR System Integration**: Sync with external HR systems
2. **Reporting Dashboard**: Analytics on blocking patterns
3. **Mobile App**: Staff management from mobile devices
4. **API Webhooks**: Notify external systems of status changes

## Deployment Notes

### Migration Required
Run the migration script before deploying:
```bash
# Apply the migration
psql -d your_database -f migrations/0022_add_staff_blocking_support.sql
```

### Environment Variables
No new environment variables required. Uses existing database connection and JWT configuration.

### Rollback Plan
If rollback is needed:
1. Remove the Staff Management tab from PO Dashboard
2. Remove the API endpoints from routes.ts
3. The database changes are non-destructive and can remain

## Support & Troubleshooting

### Common Issues
1. **"PO district not configured"**: Ensure PO user has district field set
2. **Empty staff list**: Verify staff members exist in same district as PO
3. **Block action fails**: Check server logs for detailed error messages
4. **UI not updating**: Refresh the page or check network connectivity

### Logging
All actions are logged to:
- Server console (development)
- Application logs (production)
- Database audit_logs table
- Browser console (frontend errors)

### Contact
For technical support or feature requests, contact the development team.