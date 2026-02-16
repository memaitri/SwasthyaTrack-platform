# Testing PO Dashboard - All Sources Referrals

## Quick Test Guide

### Prerequisites
1. Have a PO user account with district assigned
2. Have schools in that district with:
   - Health card referrals (in `referrals` table)
   - Monthly checkup referrals (in `monthly_checkups` table with `referredTo` field)
   - Period tracker referrals (in `period_tracker_entries` table with `isReferred = true`)

### Test 1: Check Dashboard Metrics

1. Login as PO user
2. Navigate to PO Dashboard
3. Look at the "Total Referrals" metric
4. **Expected:** Should show count from ALL THREE SOURCES combined

### Test 2: Check Console Logs

1. Open browser console (F12)
2. Refresh the PO Dashboard
3. Look for console logs:
   ```
   Total referrals found for PO district (ALL SOURCES): X
   Referral breakdown by source: {
     health_card: Y,
     monthly_checkup: Z,
     period_tracker: W
   }
   ```
4. **Expected:** All three sources should have counts > 0 if data exists

### Test 3: Check Drilldown Modal

1. Click on "Total Referrals" metric card
2. Drilldown modal should open
3. **Expected:** 
   - See referrals from all three sources
   - Each referral should have a source badge or indicator
   - Metadata should show breakdown by source

### Test 4: Check Pending Referrals

1. Click on "Pending Referrals" metric
2. **Expected:**
   - See pending referrals from all three sources
   - Source information visible for each referral
   - Metadata shows source breakdown

### Test 5: Verify School-wise Visibility

1. Navigate to Schools drilldown
2. Click on a specific school
3. **Expected:**
   - See all referrals for that school
   - Referrals from health cards, monthly checkups, and period tracker
   - Accurate counts per school

## API Testing

### Test Dashboard API Directly

```bash
# Get PO dashboard data
curl -X GET "http://localhost:5000/api/po/dashboard?month=2&year=2026&schoolType=All" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "districtKPIs": {
    "totalReferrals": 150,
    ...
  },
  "referralManagement": {
    "totalReferralsGenerated": 150,
    ...
  }
}
```

### Test Pending Referrals Drilldown

```bash
curl -X GET "http://localhost:5000/api/po/drilldown/pending-referrals?month=2&year=2026&schoolType=All" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "referrals": [...],
  "total": 80,
  "metadata": {
    "sources": {
      "health_card": 40,
      "monthly_checkup": 30,
      "period_tracker": 10
    }
  }
}
```

### Test All Referrals Drilldown

```bash
curl -X GET "http://localhost:5000/api/po/drilldown/all-referrals?month=2&year=2026&schoolType=All" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
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
      "issue": "Menstrual health referral",
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

## Verification Checklist

- [ ] Dashboard shows total referrals from all three sources
- [ ] Console logs show breakdown by source
- [ ] Drilldown modals display referrals from all sources
- [ ] Source information is visible for each referral
- [ ] Metadata includes source breakdown
- [ ] School-wise filtering works correctly
- [ ] Referral counts are accurate
- [ ] No TypeScript errors in console
- [ ] API responses include source information

## Common Issues

### Issue: Only seeing health card referrals
**Solution:** Check that monthly checkups and period tracker entries have referral fields populated:
- Monthly checkups: `referredTo` field should not be empty
- Period tracker: `isReferred` should be true and `referralFacility` should not be empty

### Issue: Period tracker referrals not showing
**Solution:** 
- Verify period tracker entries exist for students in the district
- Check that `isReferred = true` and `referralFacility` is set
- Ensure students are female and age 10+

### Issue: Referral counts don't match
**Solution:**
- Check console logs for errors
- Verify all three sources are being queried
- Check that year filter is correct
- Ensure PO user has district assigned

## Database Queries for Verification

### Check Health Card Referrals
```sql
SELECT COUNT(*) FROM referrals 
WHERE school_id IN (
  SELECT id FROM schools WHERE district = 'YOUR_DISTRICT'
);
```

### Check Monthly Checkup Referrals
```sql
SELECT COUNT(*) FROM monthly_checkups 
WHERE referred_to IS NOT NULL 
AND referred_to != ''
AND school_id IN (
  SELECT id FROM schools WHERE district = 'YOUR_DISTRICT'
);
```

### Check Period Tracker Referrals
```sql
SELECT COUNT(*) FROM period_tracker_entries 
WHERE is_referred = true 
AND referral_facility IS NOT NULL
AND student_id IN (
  SELECT id FROM students WHERE school_id IN (
    SELECT id FROM schools WHERE district = 'YOUR_DISTRICT'
  )
);
```

## Success Criteria

✅ PO Dashboard shows referrals from all three sources
✅ Referral counts are accurate and complete
✅ School-wise visibility works correctly
✅ Drilldown modals show source information
✅ API responses include source breakdown
✅ No errors in console or logs
✅ Performance is acceptable (< 3 seconds load time)

## Next Steps

After successful testing:
1. Monitor production logs for any errors
2. Gather feedback from PO users
3. Consider adding source filters in UI
4. Add source-specific analytics
5. Create reports showing referral trends by source
