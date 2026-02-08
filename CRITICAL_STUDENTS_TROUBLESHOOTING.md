# Critical Students Feature - Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: No Critical Students Showing (Empty List)

**Symptom**: The Critical Students tab shows "No critical students identified" even though you expect to see some.

**Possible Causes & Solutions**:

#### A. District Mismatch (Most Common)
**Problem**: PO's district doesn't match any school districts in the database.

**Diagnosis**:
```bash
node test_critical_students.mjs
```

Look for output like:
```
⚠️  PO districts with no schools: test district, d-test
⚠️  School districts with no PO: jalgaon, mumbai
```

**Solution 1 - Quick Fix for Test Data**:
```bash
node fix_district_mismatch.mjs --apply-test-fix
```

This aligns all test PO users and test schools to "Jalgaon" district.

**Solution 2 - Manual Fix**:
```bash
# View detailed mismatch analysis
node fix_district_mismatch.mjs

# Then run the suggested SQL commands
```

**Solution 3 - Update PO District**:
```sql
-- Update PO user's district to match schools
UPDATE users 
SET district = 'Jalgaon'  -- Use actual school district
WHERE username = 'your_po_username' AND role = 'PO';
```

**Solution 4 - Update School Districts**:
```sql
-- Update schools to match PO district
UPDATE schools 
SET district = 'Test District'  -- Use actual PO district
WHERE name LIKE '%Test%';
```

#### B. No Health Data
**Problem**: Students don't have annual health cards or the data doesn't meet critical thresholds.

**Diagnosis**:
```bash
node debug_critical_students.mjs
```

Look for:
```
Students with health cards: 0
```

**Solution - Create Test Health Data**:
```sql
-- Create a student with low BMI
UPDATE annual_health_cards 
SET 
  bmi = 12.5,
  weight_kg = 25,
  height_cm = 145,
  b3_severe_anemia = true
WHERE student_id = (
  SELECT id FROM students 
  WHERE is_active = true 
  LIMIT 1
);
```

#### C. All Students Are Healthy
**Problem**: No students actually meet the critical thresholds.

**Diagnosis**: Check the test output:
```
✓ No critical students found (all students are healthy!)
```

**Solution**: This is actually correct behavior! To test the feature:
1. See `CRITICAL_STUDENTS_QUICKSTART.md` for creating test data
2. Or wait for real health screening data to be entered

### Issue 2: Wrong Students Appearing as Critical

**Symptom**: Students who seem healthy are marked as critical.

**Possible Causes & Solutions**:

#### A. Threshold Too Lenient
**Problem**: The thresholds in `CRITICAL_THRESHOLDS` are too broad.

**Solution**: Adjust thresholds in `server/criticalStudentsService.ts`:
```typescript
export const CRITICAL_THRESHOLDS = {
  BMI_SEVERELY_UNDERWEIGHT: 13.5,  // Adjust this
  BMI_UNDERWEIGHT: 16.0,            // Adjust this
  // ... etc
};
```

#### B. Old/Stale Data
**Problem**: Health cards from previous years are being used.

**Solution**: The system uses the latest health card by year. Verify:
```sql
SELECT student_id, year, bmi, created_at
FROM annual_health_cards
WHERE student_id = 'problem_student_id'
ORDER BY year DESC;
```

#### C. Data Entry Errors
**Problem**: Incorrect BMI or health flags in the database.

**Solution**: Review and correct the data:
```sql
-- Check student's health card
SELECT * FROM annual_health_cards
WHERE student_id = 'problem_student_id'
ORDER BY year DESC
LIMIT 1;

-- Fix if needed
UPDATE annual_health_cards
SET bmi = 18.5, b3_severe_anemia = false
WHERE id = 'health_card_id';
```

### Issue 3: Slow Performance

**Symptom**: Takes more than 10 seconds to load critical students.

**Possible Causes & Solutions**:

#### A. Too Many Students
**Problem**: Evaluating thousands of students takes time.

**Solution 1 - Reduce Limit**:
```typescript
// In frontend component
<CriticalStudentsList 
  limit={50}  // Reduce from 100
/>
```

**Solution 2 - Add Pagination** (Future Enhancement):
Implement pagination in the API and UI.

#### B. Missing Database Indexes
**Problem**: Queries are slow due to missing indexes.

**Solution**: Ensure these indexes exist:
```sql
-- Check existing indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('students', 'annual_health_cards', 'meal_logs', 'hostel_attendance');

-- Add missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_health_cards_student_year ON annual_health_cards(student_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_student_date ON meal_logs(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON hostel_attendance(student_id, date DESC);
```

#### C. Network Latency
**Problem**: Slow database connection.

**Solution**: Check your database connection and consider:
- Using a closer database region
- Implementing Redis caching
- Reducing the evaluation frequency

### Issue 4: API Errors

#### A. 403 Forbidden
**Symptom**: `No district assigned to PO`

**Solution**:
```sql
-- Check PO's district
SELECT username, full_name, district, role
FROM users
WHERE username = 'your_po_username';

-- Assign district if NULL
UPDATE users
SET district = 'Jalgaon'
WHERE username = 'your_po_username';
```

#### B. 500 Internal Server Error
**Symptom**: Server error in console

**Diagnosis**: Check server logs for detailed error:
```bash
# Look for lines starting with [API] or [Critical Students]
tail -f logs/server.log
```

**Common Causes**:
1. Database connection issues
2. Invalid data types in database
3. Missing required fields

**Solution**: Review the error message and fix the underlying issue.

### Issue 5: Frontend Display Issues

#### A. Cards Not Expanding
**Problem**: Clicking on student cards doesn't show details.

**Solution**: Check browser console for JavaScript errors. Ensure:
- React Query is working
- No TypeScript errors
- Component is properly imported

#### B. Filters Not Working
**Problem**: School type filter doesn't change results.

**Solution**: 
1. Check if filter is being passed to API
2. Verify API logs show correct filter value
3. Check if schools have correct `school_type` values

#### C. Priority Scores Seem Wrong
**Problem**: Priority scores don't match expectations.

**Solution**: Review the scoring logic in `evaluateStudent()`:
- Each condition adds a specific score
- Total is capped at 100
- Check if all conditions are being evaluated

## Debugging Tools

### 1. Test Script
```bash
node test_critical_students.mjs
```
Comprehensive test that checks:
- PO users and districts
- Schools and districts
- District alignment
- Students with health data
- Potential critical students
- API simulation

### 2. District Fix Script
```bash
# Analysis only
node fix_district_mismatch.mjs

# Apply automatic fix for test data
node fix_district_mismatch.mjs --apply-test-fix
```

### 3. Debug Script
```bash
node debug_critical_students.mjs
```
Shows detailed data about students, health cards, and evaluation criteria.

### 4. Server Logs
Enable detailed logging by checking server console output:
```
[API] Critical students request from user: ...
[Critical Students] Fetching for district: ...
[Critical Students] Found X schools in district ...
[Critical Students] Found X students to evaluate
[Critical Students] ✓ Student Name: Priority 85, Reasons: 3
```

### 5. Browser DevTools
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "critical-students"
4. Check request/response
5. Look for errors in Console tab

## Verification Checklist

After fixing issues, verify:

- [ ] PO user has district assigned
- [ ] Schools exist in that district (case-insensitive match)
- [ ] Students exist in those schools
- [ ] Students have annual health cards
- [ ] Health cards have BMI or health flags
- [ ] API returns data (check Network tab)
- [ ] Frontend displays students correctly
- [ ] Expanding cards shows details
- [ ] Filters work correctly
- [ ] Priority scores are reasonable

## Getting Help

If issues persist:

1. **Collect Information**:
   ```bash
   # Run all diagnostic scripts
   node test_critical_students.mjs > test_output.txt
   node fix_district_mismatch.mjs > district_analysis.txt
   node debug_critical_students.mjs > debug_output.txt
   ```

2. **Check Documentation**:
   - `CRITICAL_STUDENTS_FEATURE.md` - Full feature documentation
   - `CRITICAL_STUDENTS_QUICKSTART.md` - Quick testing guide
   - `CRITICAL_STUDENTS_IMPLEMENTATION_SUMMARY.md` - Implementation details

3. **Review Logs**:
   - Server console output
   - Browser console errors
   - Network tab in DevTools

4. **Contact Support**:
   - Include diagnostic script outputs
   - Include relevant log excerpts
   - Describe expected vs actual behavior

## Quick Reference

### Common SQL Queries

```sql
-- Check PO districts
SELECT username, full_name, district 
FROM users 
WHERE role = 'PO' AND is_active = true;

-- Check school districts
SELECT DISTINCT district, COUNT(*) as schools
FROM schools 
WHERE is_active = true 
GROUP BY district;

-- Find students with low BMI
SELECT s.full_name, sch.name, ahc.bmi
FROM students s
JOIN schools sch ON sch.id = s.school_id
JOIN annual_health_cards ahc ON ahc.student_id = s.id
WHERE ahc.bmi < 16.0
ORDER BY ahc.bmi;

-- Check critical health flags
SELECT s.full_name, sch.name,
  ahc.b3_severe_anemia,
  ahc.c7_suspected,
  ahc.c8_suspected
FROM students s
JOIN schools sch ON sch.id = s.school_id
JOIN annual_health_cards ahc ON ahc.student_id = s.id
WHERE ahc.b3_severe_anemia = true
   OR ahc.c7_suspected = true
   OR ahc.c8_suspected = true;
```

### API Testing

```bash
# Get auth token (from browser DevTools after login)
TOKEN="your_jwt_token"

# Test critical students endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students?schoolType=All&limit=50" \
  | jq .

# Check response structure
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students" \
  | jq '.criticalStudents | length'
```

---

**Last Updated**: February 7, 2026  
**Version**: 1.0.0
