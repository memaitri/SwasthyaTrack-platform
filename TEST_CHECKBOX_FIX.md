# Testing Guide: Checkbox Auto-Selection Fix

## Quick Test Steps

### 1. Create a Test Student with Health Data
1. Navigate to "Students" page
2. Click "Add New Student"
3. Fill in student details (Student Details tab)
4. Switch to "Complete Health Card" tab
5. Fill in some health data:
   - Enter weight and height
   - Check "Defect at Birth" (Section A)
   - Select a referral facility (e.g., "DH/DFIC")
   - Check some summary checkboxes (e.g., "Down syndrome", "Cleft lip/palate")
   - In Section B, check "Severe anemia" and select a referral facility
   - In Section C, check "Dental" and select a referral facility
6. Click "Create Student"

### 2. Verify Data Saved
1. Navigate to "Health Cards" page
2. Find the student you just created
3. Verify the health card shows the data you entered

### 3. Test Checkbox Auto-Selection (THE FIX)
1. Go back to "Students" page
2. Click "Edit" on the student you created
3. Switch to "Complete Health Card" tab
4. **VERIFY**: All checkboxes you checked should be selected ✅
5. **VERIFY**: Referral facility dropdowns should show your selections ✅
6. **VERIFY**: Summary checkboxes should be checked ✅

### 4. Test Different Sections
Repeat the test for:
- **Section A**: Defects at Birth
- **Section B**: Deficiencies (B1-B8)
- **Section C**: Diseases (C1-C9)
- **Section D**: Developmental Delays (D1-D9)
- **Section E**: Adolescent Health (E1-E7) - for students aged 10+

### 5. Test Edge Cases
- Edit a student with NO health card data (should show empty form)
- Edit a student with partial health card data (should show only saved fields)
- Create new student (should show empty form)

## Expected Results

### ✅ PASS Criteria
- All previously checked checkboxes are selected when editing
- All referral facility dropdowns show the correct selection
- All date fields show the correct dates
- All text fields show the correct values
- Form is responsive and doesn't lag

### ❌ FAIL Criteria
- Checkboxes remain unchecked despite saved data
- Referral facilities show "Select referral facility" despite having a value
- Form shows loading spinner indefinitely
- Console errors appear

## Visual Verification

### Before Fix
```
Category: Defect at Birth
☐ Yes  ☑ No  [Select referral facility ▼]
```
Even though data exists, checkbox is unchecked and dropdown is empty.

### After Fix
```
Category: Defect at Birth
☑ Yes  ☐ No  [DH/DFIC ▼]
```
Checkbox is checked and dropdown shows the saved facility.

## Browser Console Check
Open browser console (F12) and verify:
- No errors related to form loading
- No warnings about uncontrolled components
- API calls to `/api/health-cards?studentId=...` succeed

## API Response Verification
In Network tab, check the response from:
```
GET /api/health-cards?studentId={id}&limit=1
```

Should return:
```json
{
  "cards": [{
    "id": "...",
    "studentId": "...",
    "a1_visible_defect": true,
    "a1_referral_facility": "dh_dfic",
    "summary_defects_down_syndrome": true,
    "b3_severe_anemia": true,
    "b3_referral_facility": "phc_chc_dh",
    ...
  }],
  "total": 1
}
```

## Troubleshooting

### Issue: Checkboxes still not selecting
**Check**: Is the API returning data?
- Open Network tab
- Look for `/api/health-cards` request
- Verify response contains the health card data

### Issue: Form shows loading forever
**Check**: Is there a query error?
- Open Console tab
- Look for React Query errors
- Verify student ID is valid

### Issue: Some checkboxes work, others don't
**Check**: Field name mapping
- Verify the field names in the form match the database column names
- Check the `healthCardForm.reset()` call includes all fields

## Success Indicators
✅ Checkboxes auto-select based on saved data
✅ Referral facilities populate correctly
✅ All sections (A-E) work properly
✅ No console errors
✅ Form loads quickly (< 2 seconds)
