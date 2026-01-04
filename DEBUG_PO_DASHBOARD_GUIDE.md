# PO Dashboard Debug Guide

## Problem Summary
Disease and Adolescent Health data were not being fetched in the PO Dashboard, showing 0 values despite data existing in the database.

## Root Cause
PostgreSQL NULL values for boolean fields were not being treated as false in JavaScript filters. When database fields hadn't been explicitly set, they were NULL instead of false, causing `flatCards.filter(c => c.field)` to fail silently.

## Solution Implemented
All boolean field checks now use an `isTruthy()` helper function:
```typescript
const isTruthy = (val: any) => val === true || val === 1 || val === '1' || val === 'true';
```

This ensures NULL/undefined values are treated as false throughout all calculations.

## Testing Instructions

### Step 1: Start the Server
Run your development server with logging enabled:
```bash
npm run dev  # or your dev command
```

### Step 2: Access PO Dashboard
1. Log in as a PO (Program Officer) user
2. Navigate to the PO Dashboard
3. Open your browser's Developer Console (F12)
4. Check the server terminal/console for debug logs

### Step 3: Check Server Logs
Look for these log sections in your server console:

#### Initial Request
```
========== PO DASHBOARD REQUEST START ==========
Request params: { selectedMonth: X, selectedYear: YYYY, userId: ... }
PO user district: [district-name]
Fetching health cards for [X] schools
```

#### Data Fetching
```
PO Dashboard: selectedYear=YYYY, totalCardsForYear=[COUNT], schools=[X]
Sample card data: {
  c7_suspected: [true/false/null],
  c8_suspected: [true/false/null],
  ...
}
```

#### Disease Calculations
```
Calculating diseases insights from [COUNT] health cards
Disease case counts: {
  respiratory: [COUNT],
  skin: [COUNT],
  leprosy: [COUNT],
  tb: [COUNT],
  dental: [COUNT],
  heart: [COUNT],
  hearing: [COUNT],
  vision: [COUNT],
}
```

#### Final Summary (Most Important)
```
========== FINAL DATA SUMMARY BEFORE RESPONSE ==========
Total Cards Fetched: [COUNT]
Disease Insights Summary: {
  respiratory: { totalCases: [X], prevalence: Y% },
  skin: { totalCases: [X], prevalence: Y% },
  leprosy: { totalCases: [X], prevalence: Y% },
  tb: { totalCases: [X], prevalence: Y% },
  ...
}
Leprosy Analytics: {
  totalSuspectedCases: [X],
  referralCompleted: [Y],
  referralTotal: [Z],
}
TB Analytics: {
  totalSuspectedCases: [X],
  contactHistory: Y%,
  referralCompleted: [Z],
  referralTotal: [W],
}
Developmental Delays: {
  speechDelayPercent: X%,
  motorDelayPercent: X%,
  cognitiveDelayPercent: X%,
  socialDelayPercent: X%,
}
Adolescent Health: {
  totalAdolescents: [COUNT],
  screenedPercent: X%,
  mentalHealthConcerns: [COUNT],
  reproductiveHealthConcerns: [COUNT],
}
========== RESPONSE READY TO SEND ==========
```

## Troubleshooting

### If Disease Data Still Shows 0

**Check 1: Are health cards being fetched?**
- Look for "Total Cards Fetched: X"
- If 0, check if the school has any health cards for the selected month/year
- Log in as a teacher/health worker to create sample health cards

**Check 2: Are the disease fields in the database?**
- Look for "Sample card data" log section
- Check if `c7_suspected`, `c8_suspected`, etc. are showing as true, false, null, or 1
- If NULL, the fields haven't been filled yet - add sample data via the UI

**Check 3: Are case counts showing in logs but not in UI?**
- The backend calculations are correct
- Issue is likely frontend UI not displaying the data
- Check browser console (F12) for JavaScript errors
- Verify the response includes the disease data sections

**Check 4: Are only some diseases showing 0?**
- If respiratory shows data but TB doesn't, it means different fields have different data
- Check the "Disease case counts" log to see which specific disease filters are working
- Verify database has that specific flag set for test students

### If Adolescent Health Shows 0

**Check 1: Do you have students age 10+?**
- Look for "totalAdolescents: X" in final summary
- If 0, either no students are 10+, or age isn't being detected correctly
- The system checks: `dateOfBirth`, `classSection` (as fallback), and `ageYears`

**Check 2: Are adolescent health concerns being recorded?**
- In Adolescent Health section of the UI, check if any e1-e7 fields are being filled
- Log in as health worker and set some adolescent concerns for age 10+ students
- Re-run dashboard and check logs

### If Data Exists But Still Shows 0

**Verify the fix was applied:**
1. Open `server/routes.ts`
2. Search for `const isTruthy = (val: any) => val === true || val === 1 || val === '1' || val === 'true';`
3. Should find it around line 2405
4. Verify all disease filters use it:
   ```typescript
   const respiratoryCases = flatCards.filter(c => isTruthy(c.c5_asthma));
   const tbCasesForDiseases = flatCards.filter(c => isTruthy(c.c8_suspected));
   // ... etc
   ```

**Restart server after making changes:**
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Fields Being Tracked

### Disease Section (Section C)
- **C1** (Vision): c1_convulsive
- **C2** (Hearing): c2_assess_hearing, c2_otitis_media
- **C3** (Dental): c3_white_discoloration, c3_brown_discoloration, c3_gum_swelling, c3_plaque
- **C4** (Skin): c4_skin_conditions
- **C5** (Respiratory): c5_asthma, c5_breathlessness, c5_wheezing
- **C6** (Heart): c6_rheumatic_heart, c6_murmur
- **C7** (Leprosy): c7_suspected (primary), c7_lesion_type, c7_referral_facility, c7_referral_date
- **C8** (TB): c8_suspected (primary), c8_cough_gt14_days, c8_persistent_fever, c8_weight_loss_gt5_percent, c8_reduced_daily_activity, c8_close_contact_known_tb, c8_referral_facility, c8_referral_date

### Developmental Delays (Section D)
- **D1** (Vision Delay): d1_seeing_difficulty
- **D2** (Motor Delay): d2_walking_delay
- **D5** (Hearing Delay): d5_hearing_difficulty
- **D6** (Speech Delay): d6_speech_difficulty
- **D7** (Learning Delay): d7_learning_difficulty
- **D9** (Behavioral): d9_behavioral_concerns

### Adolescent Health (Section E, Age 10+)
- **E1** (Mental Health): e1_emotional_distress
- **E2** (Peer Pressure): e2_peer_pressure_concerns
- **E3** (Depression): e3_depression_concerns
- **E4** (Menstruation): e4_menstruation_status
- **E5** (UTI): e5_uti_symptoms
- **E6** (UTI Follow-up): e6_uti_follow_up
- **E7** (Menstrual Pain): e7_menstrual_pain

## Quick Verification

### Create Sample Data Quickly
1. Log in as Teacher/Health Worker
2. Add a student (or use existing one)
3. Create annual health card with:
   - Mark "C7 Leprosy Suspected" as Yes
   - Mark "C8 TB Suspected" as Yes
   - Mark some adolescent concerns for age 10+ students
4. Save the card

### Check if it appears
1. Log in as PO
2. Open PO Dashboard for same month/year
3. Check server logs for case counts > 0
4. Refresh dashboard in UI - should show non-zero values

## Files Modified

- `server/routes.ts` - Lines 2045-3100+
  - Added `isTruthy` helper function
  - Updated all disease filtering to use `isTruthy`
  - Updated all adolescent calculations to use `isTruthy`
  - Added comprehensive logging throughout

## Expected Output Format

When everything is working, the API response should include:

```json
{
  "diseasesInsights": {
    "respiratory": {
      "totalCases": 5,
      "prevalence": 2.5,
      "samples": [...]
    },
    "leprosy": {
      "totalCases": 2,
      "prevalence": 1.0,
      "samples": [...]
    },
    "tb": {
      "totalCases": 3,
      "prevalence": 1.5,
      "samples": [...]
    },
    ...
  },
  "leprosyAnalytics": {
    "totalSuspectedCases": 2,
    "referralStatus": { "completed": 1, "total": 2 },
    ...
  },
  "tbAnalytics": {
    "totalSuspectedCases": 3,
    "contactHistoryPercent": 33,
    "referralStatus": { "completed": 2, "total": 3 },
    ...
  },
  "adolescentHealth": {
    "totalAdolescents": 45,
    "screenedPercent": 89,
    "mentalHealthConcerns": 3,
    "reproductiveHealthConcerns": 5,
    ...
  },
  ...
}
```

## Key Insight

The isTruthy function treats:
- `true` → true
- `false` → false
- `null` → false ✓ (This was the bug!)
- `undefined` → false ✓ (This was the bug!)
- `1` → true
- `0` → false
- `'true'` → true
- `'false'` → false (string 'false' is still truthy as a string!)
- `''` → false

This ensures that when the database has NULL (which becomes undefined in JavaScript), the filter still works correctly.
