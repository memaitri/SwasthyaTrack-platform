# Critical Students - Quick Reference Card

## 🚀 Quick Commands

```bash
# Test the feature
node test_critical_students.mjs

# Fix district mismatches
node fix_district_mismatch.mjs --apply-test-fix

# Debug data
node debug_critical_students.mjs

# Build and run
npm run build
npm run dev
```

## 📍 Access Points

### UI
- **PO Dashboard** → Critical Students tab (2nd tab)
- **URL**: `http://localhost:5000` (after login as PO)

### API Endpoints
```
GET /api/po/critical-students
GET /api/school/:schoolId/critical-students
GET /api/student/:studentId/critical-evaluation
```

## 🎯 Evaluation Thresholds

| Category | Threshold | Priority |
|----------|-----------|----------|
| Severely Underweight | BMI < 13.5 | +30 |
| Underweight | BMI < 16.0 | +20 |
| Obese | BMI ≥ 30.0 | +25 |
| Overweight | BMI ≥ 25.0 | +15 |
| Severe Anemia | B3 flag | +35 |
| Leprosy Suspected | C7 flag | +40 |
| TB Suspected | C8 flag | +40 |
| Sickle Cell | C9 flag | +35 |
| Vitamin A Deficiency | B4 flag | +15 |
| Vitamin D Deficiency | B5 flag | +15 |
| Low Calories | < 1500 kcal/day | +25 |
| Low Protein | < 40g/day | +20 |
| Irregular Meals | < 5 days/week | +15 |
| Poor Attendance | < 75% (30 days) | +25 |
| Overdue Referral | > 14 days | +30 |

## 🎨 Priority Levels

| Score | Badge | Meaning |
|-------|-------|---------|
| 70-100 | 🔴 Red | Immediate action required |
| 40-69 | 🟠 Orange | Attention needed soon |
| 0-39 | 🟡 Yellow | Monitor closely |

## 🔧 Common Fixes

### Empty List
```bash
# Check alignment
node test_critical_students.mjs

# Fix test data
node fix_district_mismatch.mjs --apply-test-fix
```

### District Mismatch
```sql
-- Update PO district
UPDATE users SET district = 'Jalgaon' 
WHERE username = 'po_username' AND role = 'PO';

-- Or update school district
UPDATE schools SET district = 'Test District' 
WHERE name LIKE '%Test%';
```

### Create Test Data
```sql
-- Low BMI student
UPDATE annual_health_cards 
SET bmi = 12.5, b3_severe_anemia = true
WHERE student_id = (SELECT id FROM students LIMIT 1);

-- Poor attendance
INSERT INTO hostel_attendance (student_id, school_id, date, status)
SELECT id, school_id, CURRENT_DATE - (n || ' days')::interval, 'Absent'
FROM students, generate_series(1, 20) as n
LIMIT 1;

-- Low nutrition
INSERT INTO meal_logs (student_id, school_id, date, meal_type, total_calories, total_protein)
SELECT id, school_id, CURRENT_DATE - (n || ' days')::interval, 'lunch', 800, 15
FROM students, generate_series(1, 7) as n
LIMIT 1;
```

## 📊 SQL Queries

```sql
-- Check PO districts
SELECT username, district FROM users WHERE role = 'PO';

-- Check school districts
SELECT DISTINCT district FROM schools WHERE is_active = true;

-- Find critical students manually
SELECT s.full_name, sch.name, ahc.bmi
FROM students s
JOIN schools sch ON sch.id = s.school_id
JOIN annual_health_cards ahc ON ahc.student_id = s.id
WHERE ahc.bmi < 16.0 OR ahc.b3_severe_anemia = true;
```

## 🧪 API Testing

```bash
# Get token (from browser DevTools after login)
TOKEN="your_jwt_token"

# Test endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students?limit=10" | jq .

# Check count
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students" \
  | jq '.criticalStudents | length'
```

## 📁 Key Files

```
server/criticalStudentsService.ts    ← Core logic
server/routes.ts                     ← API endpoints
client/src/components/dashboard/
  CriticalStudentsList.tsx           ← UI component
client/src/pages/PODashboard.tsx     ← Dashboard integration
```

## 📚 Documentation

| File | Purpose |
|------|---------|
| `CRITICAL_STUDENTS_FEATURE.md` | Full technical docs |
| `CRITICAL_STUDENTS_QUICKSTART.md` | 5-min quick start |
| `CRITICAL_STUDENTS_TROUBLESHOOTING.md` | Problem solving |
| `CRITICAL_STUDENTS_COMPLETE.md` | Implementation summary |

## 🎯 Testing Checklist

- [ ] PO user has district assigned
- [ ] Schools exist in that district
- [ ] Students have health cards
- [ ] API returns data
- [ ] UI displays students
- [ ] Cards expand/collapse
- [ ] Filters work
- [ ] No console errors

## 🆘 Quick Help

**Empty list?** → Run `node test_critical_students.mjs`  
**District mismatch?** → Run `node fix_district_mismatch.mjs --apply-test-fix`  
**Need test data?** → See SQL queries above  
**API error?** → Check server logs for `[API]` or `[Critical Students]`  
**UI broken?** → Check browser console for errors  

## 📞 Support

1. Check documentation files
2. Run diagnostic scripts
3. Review server/browser logs
4. Contact development team

---

**Version**: 1.0.0 | **Date**: Feb 7, 2026 | **Status**: ✅ Production Ready
