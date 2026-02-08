# PO Drill-Down "No Data Available" - Troubleshooting Guide

## Issue
When clicking on metrics in the PO Dashboard, the modal opens but shows "No data available" with "0 items".

---

## Quick Diagnosis

Run the debug script to identify the issue:

```bash
# Set your PO token
export TEST_TOKEN="your-po-token-here"

# Run diagnostics
node debug_po_drilldown.mjs
```

---

## Common Causes & Solutions

### 1. PO User Has No District Assigned ⚠️ MOST COMMON

**Symptoms:**
- Modal shows "0 items"
- Console shows: "No district assigned to your account"

**Check:**
```sql
SELECT id, username, role, district FROM users WHERE role = 'PO';
```

**Fix:**
```sql
-- Assign district to PO user
UPDATE users 
SET district = 'YourDistrictName' 
WHERE id = 'po-user-id';
```

**Example:**
```sql
UPDATE users 
SET district = 'Bangalore Urban' 
WHERE username = 'po_user';
```

---

### 2. No Schools in PO's District

**Symptoms:**
- Modal shows "0 items"
- Console shows: "No schools found in your district"

**Check:**
```sql
-- Check schools in district
SELECT id, name, district, school_type 
FROM schools 
WHERE district = 'YourDistrictName';
```

**Fix Option A - Add Schools:**
```sql
-- Add a school to the district
INSERT INTO schools (id, name, district, school_type, address)
VALUES (
  gen_random_uuid(),
  'Test School',
  'YourDistrictName',
  'Government',
  'Test Address'
);
```

**Fix Option B - Change PO's District:**
```sql
-- Find districts that have schools
SELECT DISTINCT district FROM schools;

-- Update PO's district to one that has schools
UPDATE users 
SET district = 'DistrictWithSchools' 
WHERE id = 'po-user-id';
```

---

### 3. No Students in Schools

**Symptoms:**
- Schools list shows but with 0 students
- Other drill-downs show "0 items"

**Check:**
```sql
-- Check students in schools
SELECT s.name as school_name, COUNT(st.id) as student_count
FROM schools s
LEFT JOIN students st ON st.school_id = s.id
WHERE s.district = 'YourDistrictName'
GROUP BY s.id, s.name;
```

**Fix:**
```sql
-- Add test students to a school
INSERT INTO students (
  id, school_id, unique_id, full_name, 
  date_of_birth, gender, class_section,
  school_admission_date
)
VALUES (
  gen_random_uuid(),
  'school-id-here',
  'TEST001',
  'Test Student',
  '2010-01-01',
  'M',
  '5-A',
  '2020-04-01'
);
```

---

### 4. No Health Cards for Selected Year

**Symptoms:**
- Students list shows but health-related drill-downs show "0 items"

**Check:**
```sql
-- Check health cards for current year
SELECT 
  COUNT(*) as total_cards,
  year,
  school_id
FROM annual_health_cards
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY year, school_id;
```

**Fix:**
```sql
-- Add test health card
INSERT INTO annual_health_cards (
  id, student_id, year, school_id,
  name_of_child, age_years, gender,
  weight_kg, height_cm, bmi
)
VALUES (
  gen_random_uuid(),
  'student-id-here',
  EXTRACT(YEAR FROM CURRENT_DATE),
  'school-id-here',
  'Test Student',
  12,
  'M',
  40.5,
  150.0,
  18.0
);
```

---

### 5. Authentication Issues

**Symptoms:**
- 401 Unauthorized error
- 403 Forbidden error

**Check:**
```bash
# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/user
```

**Fix:**
- Get a fresh token by logging in again
- Check token expiration
- Verify user role is 'PO' or 'Admin'

---

## Step-by-Step Fix Process

### Step 1: Verify User Setup
```sql
-- Check PO user
SELECT id, username, role, district, school_id 
FROM users 
WHERE username = 'your-po-username';

-- If district is NULL, assign one
UPDATE users 
SET district = 'YourDistrict' 
WHERE username = 'your-po-username';
```

### Step 2: Verify Schools Exist
```sql
-- Check schools in district
SELECT id, name, district, school_type 
FROM schools 
WHERE district = 'YourDistrict';

-- If no schools, add one
INSERT INTO schools (id, name, district, school_type, address)
VALUES (
  gen_random_uuid(),
  'Sample School',
  'YourDistrict',
  'Government',
  'Sample Address'
);
```

### Step 3: Verify Students Exist
```sql
-- Check students
SELECT s.name as school, COUNT(st.id) as students
FROM schools s
LEFT JOIN students st ON st.school_id = s.id
WHERE s.district = 'YourDistrict'
GROUP BY s.id, s.name;

-- If no students, add some
-- (Use the INSERT statement from section 3 above)
```

### Step 4: Verify Health Cards Exist
```sql
-- Check health cards
SELECT 
  s.name as school,
  COUNT(ahc.id) as health_cards,
  ahc.year
FROM schools s
LEFT JOIN annual_health_cards ahc ON ahc.school_id = s.id
WHERE s.district = 'YourDistrict'
  AND ahc.year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY s.id, s.name, ahc.year;

-- If no health cards, add some
-- (Use the INSERT statement from section 4 above)
```

### Step 5: Test the Fix
```bash
# Run the debug script
export TEST_TOKEN="your-token"
node debug_po_drilldown.mjs

# Or test manually in browser
# 1. Login as PO
# 2. Go to PO Dashboard
# 3. Click on "Total Schools" metric
# 4. Should see list of schools
```

---

## Quick Test Data Setup

Run this SQL to create a complete test setup:

```sql
-- 1. Create/Update PO user with district
UPDATE users 
SET district = 'Test District' 
WHERE role = 'PO' 
LIMIT 1;

-- 2. Create a test school
INSERT INTO schools (id, name, district, school_type, address)
VALUES (
  'test-school-001',
  'Test Government School',
  'Test District',
  'Government',
  'Test Address, Test City'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create test students
INSERT INTO students (
  id, school_id, unique_id, full_name,
  date_of_birth, gender, class_section,
  school_admission_date
)
SELECT 
  gen_random_uuid(),
  'test-school-001',
  'TEST' || LPAD(generate_series::text, 3, '0'),
  'Test Student ' || generate_series,
  DATE '2010-01-01' + (generate_series || ' days')::interval,
  CASE WHEN generate_series % 2 = 0 THEN 'M' ELSE 'F' END,
  (5 + (generate_series % 5))::text || '-A',
  '2020-04-01'
FROM generate_series(1, 50)
ON CONFLICT (unique_id) DO NOTHING;

-- 4. Create test health cards
INSERT INTO annual_health_cards (
  id, student_id, year, school_id,
  name_of_child, age_years, gender,
  weight_kg, height_cm, bmi
)
SELECT 
  gen_random_uuid(),
  s.id,
  EXTRACT(YEAR FROM CURRENT_DATE),
  s.school_id,
  s.full_name,
  EXTRACT(YEAR FROM AGE(s.date_of_birth)),
  s.gender,
  30 + (random() * 20),
  140 + (random() * 30),
  18 + (random() * 5)
FROM students s
WHERE s.school_id = 'test-school-001'
ON CONFLICT DO NOTHING;

-- 5. Verify setup
SELECT 
  'Schools' as type, COUNT(*) as count 
FROM schools WHERE district = 'Test District'
UNION ALL
SELECT 
  'Students', COUNT(*) 
FROM students WHERE school_id = 'test-school-001'
UNION ALL
SELECT 
  'Health Cards', COUNT(*) 
FROM annual_health_cards 
WHERE school_id = 'test-school-001' 
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);
```

---

## Debugging Checklist

- [ ] PO user has district assigned
- [ ] District has schools
- [ ] Schools have students
- [ ] Students have health cards for current year
- [ ] Token is valid and not expired
- [ ] User role is 'PO' or 'Admin'
- [ ] Backend server is running
- [ ] No console errors in browser
- [ ] API endpoints return 200 status
- [ ] Response contains data arrays

---

## Console Debugging

### Browser Console
```javascript
// Check current user
fetch('/api/user', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log);

// Test schools endpoint
fetch('/api/po/drilldown/schools?month=2&year=2026&schoolType=All', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log);
```

### Server Logs
Look for these log messages:
```
=== PO Drill-Down Schools Request ===
User: <user-id> Role: PO
User district: <district-name>
Total schools in system: <count>
Schools in user district: <count>
```

---

## Still Not Working?

### Check Backend Logs
```bash
# Watch server logs
npm run dev

# Look for errors when clicking metrics
```

### Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click on a metric
4. Look for the API request
5. Check:
   - Request URL
   - Request headers (Authorization)
   - Response status
   - Response body

### Check Database Connection
```sql
-- Test database connection
SELECT NOW();

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('users', 'schools', 'students', 'annual_health_cards');
```

---

## Contact Support

If none of the above solutions work, provide:
1. Output of `debug_po_drilldown.mjs`
2. Browser console errors
3. Server logs
4. Database query results
5. User role and district

---

**Most Common Fix:** Assign a district to the PO user!

```sql
UPDATE users SET district = 'YourDistrict' WHERE role = 'PO';
```
