# Critical Students Identification Feature

## Overview

The Critical Students Identification feature automatically evaluates students against predefined health, nutrition, and attendance thresholds to identify those requiring immediate attention. This proactive monitoring system helps Program Officers (POs) and school administrators prioritize interventions for at-risk students.

## Feature Components

### 1. Backend Service (`server/criticalStudentsService.ts`)

**Purpose**: Core evaluation logic for identifying critical students

**Key Functions**:
- `evaluateStudent(studentId)` - Evaluates a single student against all thresholds
- `getCriticalStudentsForDistrict(district, options)` - Gets all critical students in a PO's district
- `getCriticalStudentsForSchool(schoolId, options)` - Gets critical students for a specific school

**Evaluation Criteria**:

#### Health Metrics (from Annual Health Cards)
- **Severely Underweight**: BMI < 13.5 (Priority: +30)
- **Underweight**: BMI < 16.0 (Priority: +20)
- **Obese**: BMI ≥ 30.0 (Priority: +25)
- **Overweight**: BMI ≥ 25.0 (Priority: +15)
- **Severe Anemia**: Detected (Priority: +35)
- **Leprosy Suspected**: C7 flag (Priority: +40)
- **Tuberculosis Suspected**: C8 flag (Priority: +40)
- **Sickle Cell Anemia**: C9 flag (Priority: +35)
- **Vitamin A Deficiency**: B4 flag (Priority: +15)
- **Vitamin D Deficiency**: B5 flag (Priority: +15)

#### Nutrition Metrics (from Meal Logs - Last 7 Days)
- **Low Calorie Intake**: < 1500 kcal/day average (Priority: +25)
- **Low Protein Intake**: < 40g/day average (Priority: +20)
- **Irregular Meal Intake**: < 5 days of meals in last 7 days (Priority: +15)
- **No Meal Data**: No recent meal logs (Priority: +10)

#### Attendance Metrics (Last 30 Days)
- **Poor Attendance**: < 75% attendance (Priority: +25)

#### Medical Flags
- **Overdue Referral**: Referral pending > 14 days (Priority: +30)
- **Recent Referral Required**: From monthly checkup (Priority: +20)

**Priority Score**: 0-100 (capped at 100)
- **High Priority (70-100)**: Immediate action required
- **Medium Priority (40-69)**: Attention needed soon
- **Low Priority (0-39)**: Monitor closely

### 2. API Endpoints (`server/routes.ts`)

#### GET `/api/po/critical-students`
**Authorization**: PO, Admin
**Query Parameters**:
- `schoolType` (optional): 'Government' | 'Aided' | 'All' (default: 'All')
- `minPriorityScore` (optional): Minimum priority score filter (default: 0)
- `limit` (optional): Maximum number of results (default: 100)

**Response**:
```json
{
  "criticalStudents": [
    {
      "studentId": "uuid",
      "studentName": "Student Name",
      "schoolId": "uuid",
      "schoolName": "School Name",
      "classSection": "5-A",
      "gender": "F",
      "age": 12,
      "isCritical": true,
      "reasons": [
        {
          "category": "health",
          "severity": "high",
          "description": "Severely Underweight",
          "value": 12.8,
          "threshold": 13.5
        }
      ],
      "lastUpdated": "2026-02-07T10:30:00Z",
      "priorityScore": 85
    }
  ],
  "total": 15,
  "metadata": {
    "district": "District Name",
    "schoolType": "All",
    "minPriorityScore": 0,
    "generatedAt": "2026-02-07T10:30:00Z"
  }
}
```

#### GET `/api/school/:schoolId/critical-students`
**Authorization**: Headmaster, Admin, PO
**Query Parameters**:
- `minPriorityScore` (optional): Minimum priority score filter (default: 0)

**Response**: Same structure as above, filtered for specific school

#### GET `/api/student/:studentId/critical-evaluation`
**Authorization**: All authenticated users
**Response**: Single student evaluation object

### 3. UI Component (`client/src/components/dashboard/CriticalStudentsList.tsx`)

**Features**:
- Real-time critical students list with auto-refresh
- Expandable/collapsible student cards
- Color-coded priority badges
- Detailed reason breakdown with icons
- Category-based filtering (health, nutrition, attendance, medical)
- Severity indicators (high, medium, low)
- Threshold comparison display
- Last updated timestamp

**Visual Design**:
- Red theme for critical alerts
- Priority score badges with color coding
- Category icons (Activity, Utensils, Calendar, Stethoscope)
- Expandable details with full reason breakdown
- Responsive grid layout

### 4. PO Dashboard Integration (`client/src/pages/PODashboard.tsx`)

**New Tab**: "Critical Students"
- Positioned between "Overview" and "Referrals" tabs
- Includes informational banner explaining the feature
- Displays CriticalStudentsList component
- Shows evaluation criteria reference card
- Respects existing filter controls (schoolType, year, month)

## Data Flow

```
1. User opens PO Dashboard → Critical Students tab
2. Frontend calls GET /api/po/critical-students
3. Backend:
   a. Identifies PO's district
   b. Gets all schools in district (filtered by schoolType if specified)
   c. Gets all active students in those schools
   d. For each student:
      - Fetches latest annual health card
      - Fetches recent meal logs (last 7 days)
      - Fetches attendance records (last 30 days)
      - Fetches recent monthly checkups
      - Evaluates against all thresholds
      - Calculates priority score
   e. Filters students with isCritical = true
   f. Sorts by priority score (descending)
   g. Returns top N results
4. Frontend displays results in CriticalStudentsList component
```

## Security & Access Control

### Role-Based Access:
- **PO**: Can view critical students in their assigned district
- **Admin**: Can view critical students across all districts
- **Headmaster**: Can view critical students in their school (via school-specific endpoint)
- **Other roles**: Can view individual student evaluations only

### Data Privacy:
- No permanent storage of `isCritical` flag (calculated dynamically)
- Respects existing RLS policies on underlying tables
- Audit logging for critical student queries (recommended)

## Performance Considerations

### Optimization Strategies:
1. **Caching**: 5-minute stale time on frontend queries
2. **Pagination**: Default limit of 100 students
3. **Lazy Evaluation**: Only evaluates students in relevant schools
4. **Index Requirements**:
   - `students.schoolId` (existing)
   - `annualHealthCards.studentId, year DESC` (existing)
   - `mealLogs.studentId, date DESC` (existing)
   - `hostelAttendance.studentId, date DESC` (existing)

### Expected Performance:
- District with 50 schools, 5000 students: ~3-5 seconds
- Single school with 200 students: ~500ms-1s

## Configuration

### Threshold Constants (in `criticalStudentsService.ts`):
```typescript
export const CRITICAL_THRESHOLDS = {
  BMI_SEVERELY_UNDERWEIGHT: 13.5,
  BMI_UNDERWEIGHT: 16.0,
  BMI_OVERWEIGHT: 25.0,
  BMI_OBESE: 30.0,
  MIN_DAILY_CALORIES: 1500,
  MIN_DAILY_PROTEIN: 40,
  MIN_ATTENDANCE_PERCENT: 75,
  ATTENDANCE_EVALUATION_DAYS: 30,
  REFERRAL_PENDING_DAYS: 14,
};
```

**Customization**: Adjust these values based on regional health standards or organizational policies.

## Testing

### Manual Testing Steps:

1. **Create Test Data**:
   ```sql
   -- Create a student with low BMI
   UPDATE annual_health_cards 
   SET bmi = 12.5, weight_kg = 25, height_cm = 145
   WHERE student_id = 'test-student-id';
   
   -- Create a student with poor attendance
   -- (Insert multiple absent records in hostel_attendance)
   
   -- Create a student with low nutrition
   -- (Insert meal logs with low calories/protein)
   ```

2. **Test PO View**:
   - Login as PO
   - Navigate to Dashboard → Critical Students tab
   - Verify students appear with correct reasons
   - Test filters (schoolType, priority score)

3. **Test School View**:
   - Login as Headmaster
   - Call `/api/school/{schoolId}/critical-students`
   - Verify only school's students appear

4. **Test Individual Evaluation**:
   - Call `/api/student/{studentId}/critical-evaluation`
   - Verify all reasons are correctly identified
   - Verify priority score calculation

### Automated Testing (Recommended):
```typescript
// Example test cases
describe('Critical Students Service', () => {
  it('should identify severely underweight student', async () => {
    const evaluation = await evaluateStudent(testStudentId);
    expect(evaluation.isCritical).toBe(true);
    expect(evaluation.reasons).toContainEqual(
      expect.objectContaining({
        category: 'health',
        description: 'Severely Underweight'
      })
    );
  });
  
  it('should calculate correct priority score', async () => {
    // Test with multiple conditions
    const evaluation = await evaluateStudent(multiConditionStudentId);
    expect(evaluation.priorityScore).toBeGreaterThan(50);
  });
});
```

## Future Enhancements

### Phase 2 Features:
1. **Automated Alerts**: Email/SMS notifications for new critical students
2. **Trend Analysis**: Track if student's critical status is improving/worsening
3. **Intervention Tracking**: Log actions taken for critical students
4. **Bulk Actions**: Assign multiple critical students to medical teams
5. **Export Functionality**: Download critical students list as PDF/Excel
6. **Historical View**: See past critical status changes
7. **Predictive Analytics**: ML model to predict students at risk of becoming critical

### Integration Opportunities:
- Link to referral creation workflow
- Integration with medical team assignment
- Automatic notification to class teachers
- Dashboard widgets showing critical student count

## Troubleshooting

### Common Issues:

**Issue**: No critical students showing despite known cases
- **Solution**: Check if annual health cards exist for current year
- **Solution**: Verify meal logs and attendance data are being recorded
- **Solution**: Check threshold values in CRITICAL_THRESHOLDS

**Issue**: Performance is slow
- **Solution**: Reduce limit parameter
- **Solution**: Add database indexes on foreign keys
- **Solution**: Implement caching layer (Redis)

**Issue**: Wrong students appearing as critical
- **Solution**: Review threshold values
- **Solution**: Check data quality in source tables
- **Solution**: Verify BMI calculations are correct

## Deployment Checklist

- [ ] Deploy `server/criticalStudentsService.ts`
- [ ] Deploy updated `server/routes.ts` with new endpoints
- [ ] Deploy `client/src/components/dashboard/CriticalStudentsList.tsx`
- [ ] Deploy updated `client/src/pages/PODashboard.tsx`
- [ ] Test all three API endpoints
- [ ] Verify role-based access control
- [ ] Test with production-like data volumes
- [ ] Monitor initial performance metrics
- [ ] Train PO users on new feature
- [ ] Document in user manual

## Support & Maintenance

**Monitoring**:
- Track API response times for critical students endpoints
- Monitor query frequency and data volumes
- Alert on evaluation errors or timeouts

**Regular Reviews**:
- Quarterly review of threshold values
- Monthly analysis of critical student trends
- Feedback collection from PO users

**Contact**: For issues or questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: February 7, 2026  
**Author**: SwasthyaTrack Development Team
