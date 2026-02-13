# Test Data Cleanup Guide

## Overview

This guide helps you safely delete all test data from your Supabase database while preserving real production data.

## What Will Be Deleted

Based on the scan, the following test data was identified:

### Test Users (38 total)
- Test PO users: `po1`, `po_test`, `po_filter_test`, `test_po_approval`, etc.
- Test Class Teachers: `ct1`, `classteacher`, `test_teacher_*`, `staff_test`
- Test Headmasters: `hm1`, `hmtrial`
- Test Hostel Wardens: `hw1`
- Test Lady Superintendents: `ls1`, `ls-*` (multiple test accounts)
- Test Meal Superintendents: `ms1`, `ms-*` (multiple test accounts)
- Test Admins: `admin_filter_test`, `adm-*`

### Test Schools (13 total)
- "Gender Test School" (8 duplicates)
- "MS LS UI Test School"
- "PO Test School" (2 instances)
- "Test School" (2 instances)

### Test Students (45 total)
All students enrolled in the test schools listed above

### Related Test Data
- **Health Cards**: 30 records
- **Referrals**: 6 records
- **Meal Logs**: 0 records
- **Hostel Attendance**: 6 records
- **Monthly Checkups**: 1 record
- **Period Tracker**: 0 records
- **Academic Actions**: 1 record

## How Test Data is Identified

The script identifies test data using these criteria:

1. **Users**: Username or email contains "test" or uses "example.com" domain
2. **Schools**: School name contains "test"
3. **Students**: Enrolled in any test school
4. **Related Records**: Linked to test students

## Safety Features

✅ **Excludes System Users**: Admin, system, and root users are never deleted
✅ **Cascading Deletion**: Deletes child records before parent records
✅ **Confirmation Required**: You must type "yes" to proceed
✅ **Detailed Preview**: Shows exactly what will be deleted before proceeding
✅ **Error Handling**: Gracefully handles missing tables

## How to Use

### Step 1: Review What Will Be Deleted (Dry Run)

```bash
node delete_test_data.mjs
```

This will show you all test data without deleting anything. Review the output carefully.

### Step 2: Confirm and Delete

When prompted, type `yes` to proceed with deletion:

```
Do you want to proceed with deletion? (yes/no): yes
```

Or type `no` to cancel without making any changes.

### Step 3: Verify Deletion

After deletion completes, you'll see a summary:

```
✅ Test Data Deletion Complete!

Summary:
   - Users: 38
   - Schools: 13
   - Students: 45
   - Health Cards: 30
   - Referrals: 6
   - Meal Logs: 0
   - Hostel Attendance: 6
   - Monthly Checkups: 1
   - Period Tracker: 0
   - Academic Actions: 1
```

## What Will NOT Be Deleted

The script preserves:
- ✅ Real production users (without "test" in username/email)
- ✅ Real schools (without "test" in name)
- ✅ Real students and their data
- ✅ System configuration tables
- ✅ Meal options and other reference data

## Deletion Order

The script deletes data in this order to respect foreign key constraints:

1. Health Cards (child of students)
2. Referrals (child of students)
3. Meal Logs (child of students)
4. Hostel Attendance (child of students)
5. Monthly Checkups (child of students)
6. Period Tracker (child of students)
7. Academic Actions (child of students)
8. Students (child of schools)
9. Schools (standalone)
10. Users (standalone)

## Troubleshooting

### Issue: "relation does not exist" error
**Solution**: The script now handles missing tables gracefully. This is normal if certain features haven't been fully deployed.

### Issue: Foreign key constraint violation
**Solution**: The script deletes in the correct order. If you see this error, there may be additional relationships not accounted for. Contact support.

### Issue: Want to keep some test users
**Solution**: Before running the script, rename those users to not include "test" in their username or email.

## Important Notes

⚠️ **This action is PERMANENT** - Deleted data cannot be recovered
⚠️ **Always review the dry run first** - Make sure you're comfortable with what will be deleted
⚠️ **Backup recommended** - Consider taking a database backup before proceeding
⚠️ **Test in staging first** - If you have a staging environment, test there first

## Example Session

```bash
$ node delete_test_data.mjs

🧹 Test Data Cleanup Script

This script will identify and delete ONLY test data from Supabase.
Real production data will be preserved.

🔍 Identifying Test Data...

══════════════════════════════════════════════════════════════════════

1️⃣ Test Users:
   Found 38 test users:
   - po1 (po1) - PO - Created: 24/1/2026
   - ct1 (ct1) - ClassTeacher - Created: 24/1/2026
   ...

2️⃣ Test Schools:
   Found 13 test schools:
   - Test School (Jalgaon)
   - Gender Test School (D-GENDER-TEST)
   ...

3️⃣ Students in Test Schools:
   Found 45 students in test schools
   ...

4️⃣ Related Test Data:
   - Health Cards: 30
   - Referrals: 6
   ...

══════════════════════════════════════════════════════════════════════

⚠️  WARNING: This will permanently delete the test data shown above.
Real production data will NOT be affected.

Do you want to proceed with deletion? (yes/no): yes

🗑️  Deleting Test Data...

1️⃣ Deleting health cards...
   ✓ Deleted 30 health cards

2️⃣ Deleting referrals...
   ✓ Deleted 6 referrals

...

✅ Test Data Deletion Complete!
```

## Need Help?

If you're unsure about anything:
1. Review the dry run output carefully
2. Check if any "test" users are actually production users
3. Consider renaming production users that contain "test"
4. Take a database backup before proceeding
5. Run in a staging environment first if available

## Quick Commands

```bash
# Review what will be deleted (safe, no changes)
node delete_test_data.mjs

# Actually delete (requires confirmation)
node delete_test_data.mjs
# Then type 'yes' when prompted
```
