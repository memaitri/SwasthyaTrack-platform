# PO Dashboard - All Sources Referrals Implementation

## Overview
Updated the PO Dashboard to display referrals from ALL THREE SOURCES across all schools in the district:
1. **Health Card Referrals** (referrals table)
2. **Monthly Checkup Referrals** (monthly_checkups table)
3. **Period Tracker Referrals** (period_tracker_entries table)

## Changes Made

### 1. Main PO Dashboard Endpoint (`/api/po/dashboard`)
**Location:** `server/routes.ts` (lines ~6409-6500)

**Before:**
- Only fetched referrals from the `referrals` table (health card referrals only)
- Missing monthly checkup and period tracker referrals

**After:**
```typescript
// Get all referrals from ALL THREE SOURCES for these schools
const allReferralsData = await Promise.all(
  schools.map(async (school) => {
    const schoolReferrals: any[] = [];
    
    // SOURCE 1: Health Card Referrals
    const { referrals } = await storage.getReferrals({ schoolId: school.id, limit: 1000 });
    
    // SOURCE 2: Monthly Checkup Referrals
    const checkups = await storage.getMonthlyCheckups({
      schoolId: school.id,
      year: selectedYear,
      limit: 1000
    });
    
    // SOURCE 3: Period Tracker Referrals
    const { entries: periodEntries } = await storage.getPeriodTrackerEntries({
      schoolId: school.id,
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
      limit: 1000
    });
    
    return schoolReferrals;
  })
);
```

**Benefits:**
- Complete visibility of all referrals across the district
- Accurate referral counts and metrics
- Better tracking of student health interventions

### 2. Pending Referrals Drilldown (`/api/po/drilldown/pending-referrals`)
**Location:** `server/routes.ts` (lines ~7004-7150)

**Updated to:**
- Fetch referrals from all three sources
- Include source information in response
- Add metadata showing breakdown by source

**Response includes:**
```json
{
  "referrals": [...],
  "total": 150,
  "metadata": {
    "sources": {
      "health_card": 80,
      "monthly_checkup": 50,
      "period_tracker": 20
    }
  }
}
```

### 3. All Referrals Drilldown (`/api/po/drilldown/all-referrals`)
**Location:** `server/routes.ts` (lines ~7600-7690)

**Updated to:**
- Fetch referrals from all three sources
- Include source badge in each referral
- Add source breakdown in metadata

## Data Structure

Each referral now includes a `source` field:

```typescript
{
  id: string,
  studentId: string,
  studentName: string,
  schoolName: string,
  issue: string,
  category: string,
  facility: string,
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue',
  referralDate: string,
  daysPending: number,
  priority: 'High' | 'Medium' | 'Normal',
  source: 'health_card' | 'monthly_checkup' | 'period_tracker' // NEW
}
```

## Referral Sources Explained

### 1. Health Card Referrals
- **Table:** `referrals`
- **Created when:** Health cards are submitted with referral recommendations
- **Fields:** C7 (Leprosy), C8 (TB), deficiencies, diseases, etc.
- **Status tracking:** Full status management (Pending → In Progress → Completed)

### 2. Monthly Checkup Referrals
- **Table:** `monthly_checkups`
- **Created when:** Medical team marks `referredTo` during monthly checkup
- **Fields:** `referredTo`, `symptoms`, `referralStatus`
- **Status tracking:** Basic status tracking

### 3. Period Tracker Referrals
- **Table:** `period_tracker_entries`
- **Created when:** Lady Superintendent marks menstrual health concerns
- **Fields:** `isReferred`, `referralFacility`, `referredDate`, `referralStatus`
- **Status tracking:** Basic status tracking

## School-wise Visibility

The PO Dashboard now shows:

### District Overview
- Total referrals from all schools in the district
- Breakdown by source (health card, monthly checkup, period tracker)
- Breakdown by school type (Government, Aided)
- Breakdown by status (Pending, In Progress, Completed, Overdue)

### School-level Drilldown
When clicking on any metric, PO can see:
- Which schools have the most referrals
- Which sources are generating referrals
- Student-level details for each referral

### Referral Heatmap
- Visual representation of referral load by school
- Color-coded by urgency (overdue referrals highlighted)
- Filterable by source type

## Testing the Changes

### 1. Check Dashboard Metrics
```bash
# Login as PO user
# Navigate to PO Dashboard
# Verify "Total Referrals" metric includes all three sources
```

### 2. Check Drilldown
```bash
# Click on "Total Referrals" metric
# Verify modal shows referrals from all three sources
# Check for source badges: [Health Card], [Monthly Checkup], [Period Tracker]
```

### 3. Verify Console Logs
```javascript
// Check browser console for:
console.log('Referral breakdown by source:', {
  health_card: X,
  monthly_checkup: Y,
  period_tracker: Z
});
```

## Expected Results

### Before Fix
- PO Dashboard showed only health card referrals
- Monthly checkup referrals were invisible
- Period tracker referrals were invisible
- Referral counts were incomplete

### After Fix
- PO Dashboard shows ALL referrals from all three sources
- Complete visibility across all schools in district
- Accurate referral counts and metrics
- Source information available for tracking

## API Response Examples

### Dashboard Response
```json
{
  "districtKPIs": {
    "totalReferrals": 150,
    "totalPendingReferrals": 80,
    ...
  },
  "referralManagement": {
    "totalReferralsGenerated": 150,
    "pendingReferrals": 80,
    "referralCompletionPercent": 46.7,
    ...
  }
}
```

### Drilldown Response
```json
{
  "referrals": [
    {
      "id": "ref-123",
      "studentName": "John Doe",
      "schoolName": "ABC School",
      "issue": "Severe Anemia",
      "source": "health_card",
      "status": "Pending"
    },
    {
      "id": "checkup-456",
      "studentName": "Jane Smith",
      "schoolName": "XYZ School",
      "issue": "Monthly checkup referral: fever, cough",
      "source": "monthly_checkup",
      "status": "Pending"
    },
    {
      "id": "period-789",
      "studentName": "Mary Johnson",
      "schoolName": "PQR School",
      "issue": "Menstrual health referral: irregular cycle",
      "source": "period_tracker",
      "status": "Pending"
    }
  ],
  "total": 150,
  "metadata": {
    "sources": {
      "health_card": 80,
      "monthly_checkup": 50,
      "period_tracker": 20
    }
  }
}
```

## Benefits for PO Users

1. **Complete Visibility:** See all health interventions across the district
2. **Better Planning:** Understand referral load by source and school
3. **Resource Allocation:** Identify which facilities are receiving most referrals
4. **Trend Analysis:** Track referral patterns over time
5. **Accountability:** Monitor which schools are actively referring students

## Next Steps

1. Test the changes with real data
2. Verify all three sources are showing up correctly
3. Check that school-wise filtering works properly
4. Ensure source badges display correctly in the UI
5. Validate referral counts match across all views

## Notes

- All changes are backward compatible
- Existing health card referrals continue to work as before
- Monthly checkup and period tracker referrals are now included
- Source information helps identify where referrals originated
- PO can now see complete picture of district health interventions
