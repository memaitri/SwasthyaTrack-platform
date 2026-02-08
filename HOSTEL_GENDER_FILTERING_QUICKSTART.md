# Quick Start: Testing Hostel Gender Filtering

## Overview

This guide helps you quickly test the strict gender-based access control for Lady Superintendent (LS) and Meal Superintendent (MS) roles in the hostel attendance module.

## Prerequisites

1. Running application (development or production)
2. Database with test data (students with both genders)
3. Test user accounts for LS and MS roles

## Step 1: Create Test Users

### Option A: Using Database Script

```sql
-- Create Lady Superintendent test user
INSERT INTO users (id, username, password, full_name, role, school_id, is_active)
VALUES (
  gen_random_uuid(),
  'ls_test',
  '$2b$10$...',  -- Hash for 'password123'
  'Lady Superintendent Test',
  'Lady Superintendent',
  'your-school-id',
  true
);

-- Create Meal Superintendent test user
INSERT INTO users (id, username, password, full_name, role, school_id, is_active)
VALUES (
  gen_random_uuid(),
  'ms_test',
  '$2b$10$...',  -- Hash for 'password123'
  'Meal Superintendent Test',
  'MealSuperintendent',
  'your-school-id',
  true
);
```

### Option B: Using Registration API

```bash
# Register LS user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ls_test",
    "password": "password123",
    "fullName": "Lady Superintendent Test",
    "role": "Lady Superintendent",
    "schoolId": "your-school-id"
  }'

# Register MS user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ms_test",
    "password": "password123",
    "fullName": "Meal Superintendent Test",
    "role": "MealSuperintendent",
    "schoolId": "your-school-id"
  }'
```

## Step 2: Verify Test Data

Ensure your database has students with both genders:

```sql
-- Check student gender distribution
SELECT gender, COUNT(*) as count
FROM students
WHERE school_id = 'your-school-id'
GROUP BY gender;

-- Expected output:
-- gender | count
-- -------+-------
-- F      | 25
-- M      | 30
```

## Step 3: Run Automated Tests

```bash
# Update test credentials in the script
nano test_hostel_gender_filtering.mjs

# Update these lines:
# lsToken = await login('ls_test', 'password123');
# msToken = await login('ms_test', 'password123');

# Run the test suite
node test_hostel_gender_filtering.mjs
```

**Expected Output**:
```
================================================================================
HOSTEL ATTENDANCE GENDER FILTERING TEST SUITE
================================================================================

▶ Test 1: LS can only view female students
  ✓ Total students returned: 25
  ✓ Female students: 25
  ✓ LS can only see female students (no male students visible)

▶ Test 2: MS can only view male students
  ✓ Total students returned: 30
  ✓ Male students: 30
  ✓ MS can only see male students (no female students visible)

...

TEST SUMMARY
Total Tests: 6
Passed: 6
Failed: 0
Skipped: 0

✓ All tests passed! Gender filtering is working correctly.
```

## Step 4: Manual UI Testing

### Test LS Access

1. **Login**: Navigate to `/login` and login as `ls_test`
2. **Navigate**: Go to Hostel Attendance page
3. **Verify Title**: Should show "Female Students Hostel Attendance"
4. **Check Students**: All visible students should be female
5. **Check-in Test**: Try checking in a female student (should work)
6. **Monthly Report**: Switch to monthly view, verify only female students

### Test MS Access

1. **Login**: Navigate to `/login` and login as `ms_test`
2. **Navigate**: Go to Hostel Attendance page
3. **Verify Title**: Should show "Male Students Hostel Attendance"
4. **Check Students**: All visible students should be male
5. **Check-in Test**: Try checking in a male student (should work)
6. **Monthly Report**: Switch to monthly view, verify only male students

## Step 5: Test Security (API Level)

### Test LS Cannot Access Male Students

```bash
# Login as LS
LS_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ls_test","password":"password123"}' \
  | jq -r '.accessToken')

# Get a male student ID
MALE_STUDENT_ID=$(curl -X GET http://localhost:5000/api/students \
  -H "Authorization: Bearer $LS_TOKEN" \
  | jq -r '.students[] | select(.gender=="M") | .id' | head -1)

# Try to check-in male student (should fail with 403)
curl -X POST http://localhost:5000/api/hostel/checkin \
  -H "Authorization: Bearer $LS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$MALE_STUDENT_ID\",
    \"date\": \"$(date +%Y-%m-%d)\",
    \"checkInTime\": \"$(date -Iseconds)\"
  }"

# Expected response:
# {"message":"Lady Superintendent can only manage female students"}
# Status: 403 Forbidden
```

### Test MS Cannot Access Female Students

```bash
# Login as MS
MS_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ms_test","password":"password123"}' \
  | jq -r '.accessToken')

# Get a female student ID
FEMALE_STUDENT_ID=$(curl -X GET http://localhost:5000/api/students \
  -H "Authorization: Bearer $MS_TOKEN" \
  | jq -r '.students[] | select(.gender=="F") | .id' | head -1)

# Try to check-in female student (should fail with 403)
curl -X POST http://localhost:5000/api/hostel/checkin \
  -H "Authorization: Bearer $MS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$FEMALE_STUDENT_ID\",
    \"date\": \"$(date +%Y-%m-%d)\",
    \"checkInTime\": \"$(date -Iseconds)\"
  }"

# Expected response:
# {"message":"Meal Superintendent can only manage male students"}
# Status: 403 Forbidden
```

## Step 6: Verify Logs

Check server logs for gender filtering confirmation:

```bash
# Look for these log messages:
tail -f server.log | grep "Gender filter"

# Expected output:
# Gender filter applied: F, filtered to 25 students
# Gender filter applied to attendance records: F, filtered to 15 records
# Gender filter applied to monthly report: F, filtered to 25 students
```

## Troubleshooting

### Issue: LS/MS can see all students

**Cause**: Gender filter not being applied

**Solution**:
1. Check user role is exactly "Lady Superintendent" or "MealSuperintendent"
2. Verify user has `schoolId` assigned
3. Check server logs for filter application
4. Restart server to ensure latest code is running

### Issue: 403 errors for valid access

**Cause**: Student gender field not set correctly

**Solution**:
```sql
-- Check student gender values
SELECT id, full_name, gender FROM students WHERE gender IS NULL OR gender NOT IN ('M', 'F');

-- Fix invalid gender values
UPDATE students SET gender = 'F' WHERE gender IS NULL AND full_name LIKE '%female_indicator%';
UPDATE students SET gender = 'M' WHERE gender IS NULL AND full_name LIKE '%male_indicator%';
```

### Issue: Test script fails to login

**Cause**: User credentials incorrect or users don't exist

**Solution**:
1. Verify users exist in database
2. Check username and password in test script
3. Ensure users have `is_active = true`
4. Check users have correct role names

## Success Criteria

✅ LS can view only female students in daily view
✅ LS can view only female students in monthly report
✅ LS can check-in/out female students
✅ LS gets 403 when attempting to access male students
✅ MS can view only male students in daily view
✅ MS can view only male students in monthly report
✅ MS can check-in/out male students
✅ MS gets 403 when attempting to access female students
✅ Server logs show gender filtering is applied
✅ All automated tests pass

## Next Steps

After successful testing:

1. **Deploy to Production**: Ensure production database has correct user roles
2. **User Training**: Train LS and MS staff on their specific access
3. **Monitor Logs**: Set up alerts for 403 errors (potential security issues)
4. **Regular Audits**: Periodically review access logs for compliance

## Support

If you encounter issues:

1. Check `HOSTEL_GENDER_FILTERING_IMPLEMENTATION.md` for detailed documentation
2. Review server logs for error messages
3. Verify database schema and test data
4. Run automated test suite for specific failure points

## Quick Reference

| Role | Gender Access | API Endpoints | Error Code |
|------|---------------|---------------|------------|
| Lady Superintendent | Female only | All hostel attendance APIs | 403 for male access |
| Meal Superintendent | Male only | All hostel attendance APIs | 403 for female access |

**Key Files**:
- Implementation: `server/routes.ts`
- Test Script: `test_hostel_gender_filtering.mjs`
- Documentation: `HOSTEL_GENDER_FILTERING_IMPLEMENTATION.md`
- Quick Start: `HOSTEL_GENDER_FILTERING_QUICKSTART.md` (this file)
