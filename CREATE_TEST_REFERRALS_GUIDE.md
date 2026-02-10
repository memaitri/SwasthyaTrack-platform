# How to Create Test Referrals

## Quick Guide for Testing Referral Tracking

If the Referrals tab shows all zeros, it means no referrals exist for your students. Here's how to create test referrals:

## Method 1: Through Health Cards (Automatic)

Referrals are automatically created when you save a health card with certain health conditions:

### Step-by-Step:

1. **Go to a Student's Health Card**
   - Navigate to: Dashboard → My Students → Click on a student → View/Edit Health Card

2. **Enter Health Data that Triggers Referrals**

   Any of these conditions will automatically create a referral:

   | Condition | Trigger Value | Referral Type |
   |-----------|---------------|---------------|
   | **Underweight** | BMI < 18.5 | Deficiency |
   | **Overweight** | BMI > 25 | Deficiency |
   | **High Blood Pressure** | Systolic ≥ 140 OR Diastolic ≥ 90 | Deficiency |
   | **Low Hemoglobin** | Hemoglobin < 12 g/dL | Deficiency |
   | **Vision Problem** | Vision < 6/6 | Disease |
   | **Dental Issues** | Dental problems noted | Disease |

3. **Example: Create an Underweight Referral**
   - Height: 150 cm
   - Weight: 35 kg
   - This gives BMI = 15.6 (< 18.5)
   - Referral will be automatically created when you save

4. **Save the Health Card**
   - Click "Save" or "Submit for Approval"
   - The system will automatically create referrals based on the health data

5. **Check the Referrals Tab**
   - Go back to Dashboard → Referrals tab
   - You should now see the newly created referral

## Method 2: Through API (Advanced)

If you need to create referrals programmatically:

```bash
curl -X POST http://localhost:5000/api/referrals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-id-here",
    "schoolId": "school-id-here",
    "referralType": "deficiency",
    "referralCode": "BMI",
    "issue": "Underweight - BMI below normal range",
    "facility": "PHC Center",
    "referralDate": "2026-02-10",
    "status": "Pending"
  }'
```

## Verification

After creating referrals, verify they appear:

1. **Dashboard Overview Tab**
   - Should show counts in the referral widgets

2. **Referrals Tab**
   - Should display the referral list
   - Summary cards should show non-zero counts

3. **Run Debug Script**
   ```bash
   $env:CT_TOKEN="your_token"
   node debug_class_teacher_referrals.mjs
   ```

## Common Issues

### Issue: Still showing zeros after creating health card
**Solution**: 
- Check if the health data actually triggers a referral (see table above)
- Verify the health card was saved successfully
- Check browser console for errors

### Issue: Referral created but not showing in Referrals tab
**Solution**:
- Check the year filter - make sure it matches the current year
- Refresh the page
- Check if you're logged in as the correct class teacher

### Issue: Can't save health card
**Solution**:
- Make sure all required fields are filled
- Check if you have permission to edit the health card
- Look for validation errors on the form

## Quick Test Data

Use these values to quickly create test referrals:

### Underweight Student
- Height: 150 cm
- Weight: 35 kg
- BMI: 15.6 → Creates underweight referral

### Overweight Student
- Height: 150 cm
- Weight: 60 kg
- BMI: 26.7 → Creates overweight referral

### High Blood Pressure
- Systolic: 145 mmHg
- Diastolic: 95 mmHg
- → Creates high BP referral

### Low Hemoglobin
- Hemoglobin: 10.5 g/dL
- → Creates anemia referral

## Next Steps

Once you have test referrals:
1. Test status updates (Pending → In Progress → Completed)
2. Test filtering by year
3. Verify summary counts update correctly
4. Test the follow-up workflow
