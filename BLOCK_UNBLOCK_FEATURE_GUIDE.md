# Staff Account Blocking Feature - User Guide

## Overview
Program Officers (PO) can now block and unblock staff accounts within their district directly from the Approvals page. Blocked users are immediately logged out and cannot log in until unblocked.

## Accessing the Feature

### For Program Officers (PO):
1. Log in to your PO account
2. Navigate to **Approvals** from the main menu
3. You'll see a tab-based interface with three tabs:
   - **Pending Approvals**: User registration requests
   - **Schools**: School registration requests  
   - **Manage Staff**: Block/unblock staff accounts ⭐ NEW

## Using the Manage Staff Tab

### Viewing Staff
- The tab displays all approved staff in your district:
  - Headmasters
  - Class Teachers
  - Medical Team members
  - Hostel Wardens
  - Meal Superintendents
  - Lady Superintendents

### Staff Card Information
Each staff card shows:
- **Name and Role**: Full name and position
- **Email**: Contact email
- **District**: Assigned district
- **Status Badge**:
  - 🟢 **Active** (green badge) - User can log in
  - 🔴 **Blocked** (red badge) - User cannot log in
- **Block Details** (if blocked):
  - Reason for blocking
  - Date and time when blocked

## Blocking a Staff Account

### Steps:
1. Navigate to **Approvals → Manage Staff** tab
2. Find the staff member you want to block
3. Click the **"Block Account"** button (red button)
4. A dialog will appear showing:
   - Staff member's name, role, and email
   - Warning message about immediate logout
5. Enter a reason for blocking (required)
   - Example: "Unauthorized access attempt"
   - Example: "Policy violation"
   - Example: "Temporary suspension pending investigation"
6. Click **"Block Account"** to confirm

### What Happens:
- ✅ User account is immediately blocked
- ✅ User is logged out from all sessions
- ✅ User cannot log in until unblocked
- ✅ Notification sent to the user
- ✅ Action logged in audit trail
- ✅ Staff card updates to show "Blocked" status

### When User Tries to Login:
- Login attempt fails with error message:
  > "Your account has been blocked. Please contact your Program Officer or administrator."
- Block reason is included in the response
- User cannot access the system

## Unblocking a Staff Account

### Steps:
1. Navigate to **Approvals → Manage Staff** tab
2. Find the blocked staff member (red "Blocked" badge)
3. Review the block reason displayed on the card
4. Click the **"Unblock"** button
5. Account is immediately unblocked

### What Happens:
- ✅ User account is unblocked
- ✅ User can log in again
- ✅ Notification sent to the user
- ✅ Action logged in audit trail
- ✅ Staff card updates to show "Active" status

## Important Rules & Restrictions

### Who Can Block/Unblock:
- ✅ Program Officers (PO) - Staff in their district only
- ✅ Administrators - Any staff account
- ❌ Headmasters - Cannot block/unblock
- ❌ Other staff - Cannot block/unblock

### Who Can Be Blocked:
- ✅ Headmasters
- ✅ Class Teachers
- ✅ Medical Team members
- ✅ Hostel Wardens
- ✅ Meal Superintendents
- ✅ Lady Superintendents
- ❌ Program Officers (PO) - Cannot be blocked
- ❌ Administrators - Cannot be blocked
- ❌ Your own account - Cannot block yourself

### District Restrictions (for PO):
- You can ONLY block/unblock staff in YOUR district
- Headmasters: Checked by their district field
- School staff: Checked by their school's district
- Staff from other districts are not visible to you

## Use Cases

### 1. Security Incident
**Scenario**: A staff member's account shows suspicious activity
**Action**: 
1. Block the account immediately
2. Reason: "Security incident - unauthorized access detected"
3. Investigate the issue
4. Unblock once resolved or take further action

### 2. Policy Violation
**Scenario**: Staff member violates data privacy policy
**Action**:
1. Block the account
2. Reason: "Policy violation - pending investigation"
3. Conduct investigation
4. Unblock if cleared or keep blocked

### 3. Temporary Suspension
**Scenario**: Staff member on leave or temporary suspension
**Action**:
1. Block the account
2. Reason: "Temporary suspension - on leave"
3. Unblock when they return to duty

### 4. Account Compromise
**Scenario**: Staff reports their account may be compromised
**Action**:
1. Block the account immediately
2. Reason: "Account security - password reset required"
3. Help user reset password
4. Unblock once secured

## Best Practices

### ✅ DO:
- Always provide a clear, specific reason for blocking
- Document the reason in your records
- Inform the staff member about the block (system sends notification)
- Review blocked accounts regularly
- Unblock promptly when issue is resolved

### ❌ DON'T:
- Block accounts without valid reason
- Use blocking as punishment without due process
- Leave accounts blocked indefinitely without review
- Block accounts during active work hours without warning (except emergencies)
- Forget to unblock when issue is resolved

## Notifications

### When Account is Blocked:
User receives notification:
> **Account Blocked**
> Your account has been blocked. Reason: [Your reason here]

### When Account is Unblocked:
User receives notification:
> **Account Unblocked**
> Your account has been unblocked by [PO name]. You can now log in.

## Audit Trail

All blocking/unblocking actions are logged with:
- Who performed the action (PO/Admin ID)
- When it was performed (timestamp)
- Which user was affected
- Reason provided
- User's role

This ensures accountability and traceability.

## Troubleshooting

### Problem: Cannot see staff member in list
**Solution**: 
- Verify the staff member is in your district
- Check if they have "Approved" status
- Refresh the page

### Problem: Block button not working
**Solution**:
- Check your internet connection
- Verify you have PO role
- Ensure you're not trying to block a PO or Admin
- Try refreshing the page

### Problem: User still can log in after blocking
**Solution**:
- Verify the block action completed (check for success message)
- Ask user to log out and try again
- Check if user is using cached session
- Contact system administrator if issue persists

## Technical Details

### Database Fields:
- `is_blocked`: Boolean flag (true/false)
- `blocked_by`: ID of PO/Admin who blocked
- `blocked_at`: Timestamp of blocking
- `block_reason`: Text reason for blocking

### API Endpoints:
- `GET /api/users/staff`: Get staff list
- `POST /api/users/:id/block`: Block a user
- `POST /api/users/:id/unblock`: Unblock a user

### Security:
- Role-based access control enforced
- District validation for PO users
- Cannot block higher privilege roles
- Audit logging for all actions

## Support

If you encounter issues or have questions:
1. Check this guide first
2. Contact your system administrator
3. Report bugs through the support channel

## Version History

- **v1.0** (Current): Initial release
  - Block/unblock functionality
  - Tab-based interface
  - District-based access control
  - Audit logging
  - Notifications
