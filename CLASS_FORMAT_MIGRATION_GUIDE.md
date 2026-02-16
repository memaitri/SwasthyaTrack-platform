# Class Format Migration Guide

## Overview
This guide explains how to migrate existing class section data from the old format to the new format.

## Format Changes

### Old Format → New Format

**Classes 1-10:**
- `1-A` → `1A`
- `2-B` → `2B`
- `Class 3-A` → `3A`
- `10-B` → `10B`

**Classes 11-12:**
- `11-Science` → `11A-Science` (assumes section A)
- `11-Arts` → `11A-Commerce` (Arts converted to Commerce)
- `12-Science` → `12A-Science`
- `12-Arts` → `12A-Commerce`

## Why This Migration is Needed

The new system:
1. Supports both A and B sections for all classes
2. Explicitly includes section in class 11-12 (e.g., 11A-Science, 11B-Science)
3. Uses a consistent format without hyphens for classes 1-10
4. Ensures section preservation during promotions

## Migration Script

### Prerequisites
- Node.js installed
- Database access credentials in `.env` file
- `pg` package installed (`npm install pg`)

### Running the Migration

1. **Backup your database first!**
   ```bash
   # Create a backup before running migration
   pg_dump your_database > backup_before_migration.sql
   ```

2. **Run the migration script:**
   ```bash
   node migrate_class_format.mjs
   ```

3. **Verify the results:**
   The script will show:
   - Number of students updated
   - Number of class teachers updated
   - Number of health cards updated
   - Number of academic actions updated
   - Number of notifications updated

### What the Script Does

The migration script updates the following tables:

1. **students**
   - `class_section` field
   - `previous_class_section` field

2. **users** (ClassTeacher role)
   - `class_section` field (assigned class)

3. **annual_health_cards**
   - `class_section` field

4. **student_academic_actions**
   - `old_class_section` field
   - `new_class_section` field

5. **notifications**
   - `receiver_class_section` field

### Migration Logic

The script uses the following conversion rules:

```javascript
// Remove "Class " prefix
"Class 1-A" → "1-A"

// Convert hyphenated format to compact format
"1-A" → "1A"
"2-B" → "2B"

// Add section to class 11-12 if missing
"11-Science" → "11A-Science"
"12-Commerce" → "12A-Commerce"

// Convert Arts to Commerce
"11-Arts" → "11A-Commerce"
```

## Backward Compatibility

The promotion logic has been updated to handle both formats:

```javascript
// These will all work correctly:
calculateNextClass("1-A")  // Old format
calculateNextClass("1A")   // New format
calculateNextClass("Class 2-B")  // Old format with prefix
```

The system will:
1. Normalize the input format
2. Convert to new format internally
3. Return results in new format

## Testing After Migration

### 1. Verify Student Data
```sql
-- Check student class sections
SELECT id, full_name, class_section, previous_class_section 
FROM students 
LIMIT 10;
```

Expected format: `1A`, `2B`, `11A-Science`, etc.

### 2. Verify Class Teacher Assignments
```sql
-- Check class teacher assignments
SELECT id, username, class_section 
FROM users 
WHERE role = 'ClassTeacher';
```

Expected format: `1A`, `2B`, `11A-Science`, etc.

### 3. Test Promotion
1. Go to a student's academic actions page
2. Try promoting a student
3. Verify the new class is calculated correctly

### 4. Test Registration
1. Go to registration page
2. Select "Class Teacher" role
3. Verify dropdown shows: 1A, 1B, 2A, 2B, ..., 11A-Science, etc.

### 5. Test Student Form
1. Go to add new student
2. Verify class dropdown shows all options with A and B sections

## Rollback Plan

If you need to rollback:

1. **Restore from backup:**
   ```bash
   psql your_database < backup_before_migration.sql
   ```

2. **Or manually revert the code changes:**
   - Revert `server/storage.ts` changes
   - Revert `client/src/pages/RegisterPage.tsx` changes
   - Revert `client/src/pages/StudentFormPage.tsx` changes
   - Revert `client/src/lib/schoolUtils.ts` changes

## Common Issues and Solutions

### Issue 1: "Cannot find module 'pg'"
**Solution:** Install the pg package
```bash
npm install pg
```

### Issue 2: "Connection refused"
**Solution:** Check your DATABASE_URL in .env file
```bash
# Make sure DATABASE_URL is set correctly
echo $DATABASE_URL
```

### Issue 3: Some records not updated
**Solution:** Check the migration script output for any errors. The script shows which records were updated.

### Issue 4: Class teachers can't see their students
**Solution:** 
1. Verify the class teacher's `class_section` was updated
2. Verify students' `class_section` matches the teacher's assignment
3. Check the format is consistent (e.g., both are "1A", not one "1A" and one "1-A")

## Post-Migration Checklist

- [ ] Database backup created
- [ ] Migration script executed successfully
- [ ] All tables updated (check counts in script output)
- [ ] Student data verified
- [ ] Class teacher assignments verified
- [ ] Promotion functionality tested
- [ ] Registration page tested
- [ ] Student form tested
- [ ] No errors in application logs

## Support

If you encounter issues:
1. Check the migration script output for errors
2. Verify database connection
3. Check application logs
4. Restore from backup if needed
5. Review the conversion logic in the script

## Summary

The migration ensures:
- ✓ Consistent class format across the system
- ✓ Support for both A and B sections
- ✓ Proper section preservation during promotions
- ✓ Backward compatibility with old format
- ✓ All existing data updated to new format
