# Critical Students Feature - Quick Start Guide

## 🚀 Quick Test (5 Minutes)

### Step 1: Start the Application
```bash
npm run dev
```

### Step 2: Login as PO
1. Navigate to `http://localhost:5000`
2. Login with PO credentials
3. You'll be redirected to the PO Dashboard

### Step 3: Access Critical Students
1. Click on the **"Critical Students"** tab (second tab)
2. The system will automatically evaluate all students in your district
3. Wait 3-5 seconds for results to load

### Step 4: Explore the Interface
- **View critical students list** with priority scores
- **Click on a student card** to expand and see detailed reasons
- **Filter by school type** using the filter controls at the top
- **Check the criteria card** at the bottom to understand evaluation logic

## 📊 What You'll See

### If Critical Students Exist:
```
🔥 Critical Students [Badge: 15]

┌─────────────────────────────────────────────┐
│ Student Name                    Priority: 85 │
│ School: ABC School              Gender: F, 12y│
│ Class: 5-A                                   │
│                                              │
│ [Health] Severely Underweight                │
│ [Medical] Severe Anemia Detected             │
│ [Nutrition] Low Calorie Intake               │
│                                              │
│ [Click to expand for details]                │
└─────────────────────────────────────────────┘
```

### If No Critical Students:
```
✓ All students are within healthy parameters

No students currently require immediate attention based on 
health, nutrition, or attendance metrics.
```

## 🧪 Create Test Data (Optional)

To test the feature with sample critical students:

### Create a Student with Low BMI
```sql
-- Connect to your database
-- Update an existing student's health card

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

### Create Poor Attendance Records
```sql
-- Insert absent records for last 30 days
INSERT INTO hostel_attendance (student_id, school_id, date, status)
SELECT 
  id,
  school_id,
  CURRENT_DATE - (n || ' days')::interval,
  'Absent'
FROM students, generate_series(1, 20) as n
WHERE is_active = true
LIMIT 1;
```

### Create Low Nutrition Meals
```sql
-- Insert low-calorie meals
INSERT INTO meal_logs (student_id, school_id, date, meal_type, total_calories, total_protein)
SELECT 
  id,
  school_id,
  CURRENT_DATE - (n || ' days')::interval,
  'lunch',
  800,  -- Low calories
  15    -- Low protein
FROM students, generate_series(1, 7) as n
WHERE is_active = true
LIMIT 1;
```

## 🔍 API Testing

### Test PO Endpoint
```bash
# Get your auth token first (login via UI and check browser DevTools)
TOKEN="your-jwt-token-here"

# Fetch critical students
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/po/critical-students?schoolType=All&limit=50" \
  | jq .
```

### Test School Endpoint
```bash
# Replace with actual school ID
SCHOOL_ID="your-school-id"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/school/$SCHOOL_ID/critical-students" \
  | jq .
```

### Test Individual Evaluation
```bash
# Replace with actual student ID
STUDENT_ID="your-student-id"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/student/$STUDENT_ID/critical-evaluation" \
  | jq .
```

## 🎯 Expected Behavior

### Priority Score Calculation
- **70-100 (High)**: Red badge, immediate action required
  - Example: Leprosy suspected + Severe anemia + Low BMI = 40 + 35 + 30 = 105 → capped at 100
  
- **40-69 (Medium)**: Orange badge, attention needed soon
  - Example: Underweight + Low protein + Poor attendance = 20 + 20 + 25 = 65
  
- **0-39 (Low)**: Yellow badge, monitor closely
  - Example: Vitamin A deficiency + Irregular meals = 15 + 15 = 30

### Reason Categories
- **Health** (Activity icon): BMI issues, vitamin deficiencies
- **Nutrition** (Utensils icon): Calorie/protein deficiency, irregular meals
- **Attendance** (Calendar icon): Poor attendance percentage
- **Medical** (Stethoscope icon): Disease flags, overdue referrals

## 🐛 Troubleshooting

### No Students Showing
**Problem**: Critical Students tab shows "No critical students identified"

**Solutions**:
1. Check if annual health cards exist for current year
2. Verify students have recent meal logs and attendance data
3. Review threshold values in `server/criticalStudentsService.ts`
4. Check browser console for API errors

### Slow Loading
**Problem**: Takes more than 10 seconds to load

**Solutions**:
1. Reduce the `limit` parameter (default: 100)
2. Filter by specific school type
3. Check database indexes on foreign keys
4. Monitor server logs for slow queries

### Wrong Students Appearing
**Problem**: Students appearing as critical when they shouldn't be

**Solutions**:
1. Review threshold values in `CRITICAL_THRESHOLDS`
2. Check data quality in source tables (health cards, meals, attendance)
3. Verify BMI calculations are correct
4. Check if old/stale data exists

### API Errors
**Problem**: 403 Forbidden or 500 Internal Server Error

**Solutions**:
1. Verify user has PO or Admin role
2. Check if PO has district assigned
3. Review server logs for detailed error messages
4. Ensure database connection is active

## 📱 Mobile Testing

The interface is responsive and works on mobile devices:
1. Open on mobile browser
2. Login as PO
3. Navigate to Critical Students tab
4. Cards stack vertically for easy scrolling
5. Tap to expand/collapse student details

## ✅ Verification Checklist

After implementation, verify:
- [ ] PO can access Critical Students tab
- [ ] Students with low BMI appear in list
- [ ] Students with poor attendance appear
- [ ] Students with low nutrition appear
- [ ] Priority scores are calculated correctly
- [ ] Reason details expand/collapse properly
- [ ] School type filter works
- [ ] No TypeScript errors in console
- [ ] API endpoints return valid JSON
- [ ] Role-based access control works
- [ ] Mobile view is responsive

## 📚 Next Steps

1. **Review Full Documentation**: See `CRITICAL_STUDENTS_FEATURE.md`
2. **Test with Real Data**: Use actual student data from your database
3. **Train Users**: Brief PO staff on the new feature
4. **Monitor Performance**: Track API response times
5. **Gather Feedback**: Collect user feedback for improvements

## 🎓 Understanding the Evaluation

### Example: High Priority Student (Score: 85)

**Student**: Priya, Female, 12 years, Class 5-A

**Reasons**:
1. **Severely Underweight** (Health, High)
   - Current BMI: 12.8
   - Threshold: 13.5
   - Priority: +30

2. **Severe Anemia Detected** (Medical, High)
   - Flagged in health card (B3)
   - Priority: +35

3. **Low Calorie Intake** (Nutrition, High)
   - Average: 1200 kcal/day
   - Threshold: 1500 kcal/day
   - Priority: +25

**Total Priority Score**: 30 + 35 + 25 = 90 → **High Priority**

**Action Required**: Immediate medical attention, nutritional intervention, and follow-up monitoring.

---

**Need Help?** Check the full documentation or contact the development team.

**Version**: 1.0.0  
**Last Updated**: February 7, 2026
