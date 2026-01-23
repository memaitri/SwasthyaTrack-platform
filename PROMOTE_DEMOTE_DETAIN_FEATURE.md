# Promote / Demote / Detain Student Feature

## Overview

The Promote/Demote/Detain Student feature allows authorized users to manage student academic status with proper access control, validation, and audit logging.

## Features Implemented

### ✅ Access Control
- **Class Teacher (CT)**: Can directly Promote/Demote/Detain students of their own class only
- **Headmaster/Admin**: Can perform actions for any class in their school
- **Other roles**: Can only view student status (read-only access)

### ✅ Student Status Management
- **Academic Status Field**: `Active`, `Promoted`, `Demoted`, `Detained`
- **Database Storage**: New columns added to `students` table
- **Status Tracking**: Academic year and previous class section tracking

### ✅ Action Flow
1. Authorized user selects a student
2. Chooses Promote/Demote/Detain action
3. Provides mandatory reason (minimum 10 characters)
4. Confirms action
5. Action applied immediately (no approval workflow)

### ✅ Class & Teacher Mapping
- **On Promotion**: Increment class/standard (e.g., 1st → 2nd), auto-assign to new class teacher
- **On Demotion**: Decrement class/standard, update teacher mapping accordingly  
- **On Detention**: Student remains in same class under same teacher

### ✅ Validation
- CT cannot act on students outside their assigned class
- Prevents duplicate actions in same academic year
- Enforces valid class boundaries (1-12)
- Validates user permissions and student status

### ✅ Audit Logging
Complete audit trail with:
- Student ID
- Old status → new status  
- Old class → new class
- Reason for action
- Action performed by (user ID + role)
- Timestamp
- Academic year

### ✅ Data Synchronization
Updated status reflects across:
- Student profiles
- Class teacher dashboards
- Headmaster/Admin dashboards
- Reports (PDF/Excel)
- Analytics

### ✅ Security
- Role-based checks on both frontend and backend
- No auto-promotion or deletion of historical records
- Input validation and sanitization
- Audit trail is read-only

## Database Schema

### New Columns in `students` Table
```sql
academic_status text NOT NULL DEFAULT 'Active' 
  CHECK (academic_status IN ('Active', 'Promoted', 'Demoted', 'Detained'))
academic_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
previous_class_section text
```

### New `student_academic_actions` Table
```sql
CREATE TABLE student_academic_actions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('Promote', 'Demote', 'Detain')),
  old_status text NOT NULL,
  new_status text NOT NULL,
  old_class_section text NOT NULL,
  new_class_section text NOT NULL,
  old_teacher_id varchar,
  new_teacher_id varchar,
  reason text NOT NULL,
  academic_year integer NOT NULL,
  performed_by varchar NOT NULL REFERENCES users(id),
  performed_by_role text NOT NULL,
  performed_at timestamp DEFAULT NOW(),
  created_at timestamp DEFAULT NOW()
);
```

## API Endpoints

### 1. Perform Academic Action
```
POST /api/students/:id/academic-action
```
**Authorization**: ClassTeacher, Headmaster  
**Body**:
```json
{
  "actionType": "Promote|Demote|Detain",
  "reason": "Detailed reason (min 10 chars)"
}
```

### 2. Validate Academic Action
```
POST /api/students/:id/validate-academic-action
```
**Authorization**: ClassTeacher, Headmaster  
**Body**:
```json
{
  "actionType": "Promote|Demote|Detain"
}
```

### 3. Get Academic Action History
```
GET /api/students/:id/academic-actions?page=1&limit=20&academicYear=2025
```
**Authorization**: ClassTeacher (own class), Headmaster (own school), Admin (all)

## Frontend Components

### 1. StudentAcademicActions Component
- Main action interface with validation
- Real-time validation feedback
- Role-based access control
- Action confirmation dialog

### 2. AcademicActionHistory Component  
- Complete audit trail display
- Filterable by academic year
- Formatted action details
- Timeline view

### 3. AcademicStatusBadge Component
- Consistent status display
- Icon indicators
- Color coding
- Size variants

### 4. StudentAcademicActionsPage
- Dedicated page for student academic management
- Student overview
- Action interface
- History display

## Usage Examples

### Class Teacher Workflow
1. Navigate to Students page
2. Click graduation cap icon for student in their class
3. Select action type (Promote/Demote/Detain)
4. Enter detailed reason
5. Confirm action
6. View updated status and history

### Headmaster Workflow
1. Access any student in their school
2. Same action flow as Class Teacher
3. Can override Class Teacher restrictions
4. Full audit visibility

### Validation Examples
```javascript
// Valid promotion
{
  "actionType": "Promote",
  "reason": "Excellent academic performance throughout the year"
}

// Invalid - duplicate action
{
  "error": "Student has already been promoted this academic year"
}

// Invalid - insufficient permissions
{
  "error": "You can only perform academic actions on students from your assigned class"
}
```

## Class Calculation Logic

### Promotion Logic
- Extract number from class name (e.g., "Class 5-A" → 5)
- Increment by 1 (5 → 6)
- Replace in original format ("Class 5-A" → "Class 6-A")
- Maximum class: 12

### Demotion Logic  
- Extract number from class name
- Decrement by 1 (5 → 4)
- Replace in original format
- Minimum class: 1

### Teacher Assignment
- Find teacher assigned to new class section
- Update student's class assignment
- Log old and new teacher IDs in audit

## Security Considerations

### Access Control
- JWT token validation
- Role-based route protection
- Class-level filtering for ClassTeacher
- School-level filtering for Headmaster

### Input Validation
- Action type enum validation
- Reason length validation (min 10 chars)
- Student existence validation
- Duplicate action prevention

### Audit Security
- Immutable audit logs
- Complete action tracking
- User identification
- Timestamp integrity

## Testing

### Manual Testing
1. Login as ClassTeacher
2. Verify can only see own class students
3. Test each action type (Promote/Demote/Detain)
4. Verify validation messages
5. Check audit history
6. Test as Headmaster with broader access

### API Testing
```bash
# Run the test script
node test_academic_actions.js
```

## Migration

### Apply Database Changes
```bash
node script/apply_academic_migration_direct.mjs
```

### Verify Migration
```sql
-- Check new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('academic_status', 'academic_year', 'previous_class_section');

-- Check new table
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'student_academic_actions';
```

## Future Enhancements

### Potential Improvements
1. **Bulk Actions**: Promote/demote multiple students at once
2. **Academic Calendar**: Integration with school calendar for automatic year transitions
3. **Notification System**: Notify parents/guardians of status changes
4. **Reporting**: Dedicated reports for academic actions
5. **Approval Workflow**: Optional approval process for sensitive actions
6. **Class Capacity**: Validate class capacity before promotions
7. **Performance Integration**: Link with academic performance data

### Configuration Options
1. **Custom Class Formats**: Support different class naming conventions
2. **Action Restrictions**: Configurable action availability by role
3. **Validation Rules**: Customizable validation logic
4. **Audit Retention**: Configurable audit log retention policies

## Troubleshooting

### Common Issues

**Issue**: "Student not found" error  
**Solution**: Verify student ID and user permissions

**Issue**: "Invalid action type" error  
**Solution**: Ensure actionType is exactly "Promote", "Demote", or "Detain"

**Issue**: "Insufficient permissions" error  
**Solution**: Check user role and class assignment

**Issue**: "Already performed this academic year" error  
**Solution**: Check existing actions for current academic year

### Debug Queries
```sql
-- Check student academic status
SELECT id, full_name, class_section, academic_status, academic_year 
FROM students WHERE id = 'student-id';

-- Check recent academic actions
SELECT * FROM student_academic_actions 
WHERE student_id = 'student-id' 
ORDER BY performed_at DESC LIMIT 5;

-- Check user permissions
SELECT id, role, class_section, school_id 
FROM users WHERE id = 'user-id';
```

## Conclusion

The Promote/Demote/Detain Student feature provides a comprehensive solution for managing student academic status with proper security, validation, and audit capabilities. The implementation follows best practices for data integrity, user experience, and system maintainability.