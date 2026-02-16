# Checkbox Auto-Selection Fix - Annual Health Card

## Problem
When editing an existing student's health card, checkboxes (especially for "Referred Facilities" and other health conditions) were not auto-selecting even when data existed in the database. Previously saved values were not being reflected in the form.

## Root Causes

### 1. Missing Health Card Data Query
The `StudentFormPage.tsx` component was only fetching student demographic data when editing, but was NOT fetching the associated annual health card data.

### 2. Incorrect Field Names in Referral Summary
The "Referral Summary" section at the bottom of the health card was using INCORRECT field names that don't exist in the database:
- Form used: `deficiency_any`, `disease_any`, `developmental_any`, `adolescent_any`
- Database has: `referral_deficiency_yes`, `referral_disease_yes`, `referral_developmental_yes`, `referral_adolescent_yes`

- Form used: `deficiency_facility`, `disease_facility`, `developmental_facility`, `adolescent_facility`
- Database has: `referral_deficiency_facility_date`, `referral_disease_facility_date`, `referral_developmental_facility_date`, `referral_adolescent_facility_date`

## Solutions Implemented

### 1. Added Health Card Data Query
Added a new `useQuery` hook to fetch health card data when editing a student:

```typescript
const { data: healthCardData, isLoading: isLoadingHealthCard } = useQuery({
  queryKey: ["/api/health-cards", id],
  queryFn: async () => {
    if (!id || id === "new") return null;
    const res = await apiRequest("GET", `/api/health-cards?studentId=${id}&limit=1`);
    const data = await res.json();
    return data.cards && data.cards.length > 0 ? data.cards[0] : null;
  },
  enabled: !isNew && !!id,
});
```

### 2. Fixed Field Names in Referral Summary
Updated the `HealthCardFormSections.tsx` to use correct database field names:

**Before:**
```typescript
{ category: "Deficiency", yesField: "deficiency_any", facilityField: "deficiency_facility" }
```

**After:**
```typescript
{ category: "Deficiency", yesField: "referral_deficiency_yes", facilityField: "referral_deficiency_facility_date" }
```

### 3. Added Missing Fields to Form Schema
Added the referral summary fields to the Zod schema in `StudentFormPage.tsx`:

```typescript
referral_deficiency_yes: z.boolean().default(false),
referral_deficiency_facility_date: z.string().optional(),
referral_disease_yes: z.boolean().default(false),
referral_disease_facility_date: z.string().optional(),
referral_developmental_yes: z.boolean().default(false),
referral_developmental_facility_date: z.string().optional(),
referral_adolescent_yes: z.boolean().default(false),
referral_adolescent_facility_date: z.string().optional(),
```

### 4. Added Health Card Data Loading Effect
Created a comprehensive `useEffect` hook that loads all health card fields including the new referral summary fields:

```typescript
useEffect(() => {
  if (healthCardData && !isNew) {
    healthCardForm.reset({
      // ... all health card fields including:
      referral_deficiency_yes: healthCardData.referral_deficiency_yes || false,
      referral_deficiency_facility_date: healthCardData.referral_deficiency_facility_date || "",
      // ... etc
    });
  }
}, [healthCardData, isNew, healthCardForm]);
```

### 5. Updated Loading State
Modified the loading check to include health card data:

```typescript
if (isLoadingStudent || isLoadingHealthCard) {
  return <LoadingSpinner />;
}
```

## What This Fixes

✅ **Checkboxes now auto-select** when editing existing health cards
✅ **Referral facilities** are properly populated in dropdowns
✅ **All health conditions** (defects, deficiencies, diseases, delays) show correct values
✅ **Summary checkboxes** in the "Referral Summary" section now work correctly
✅ **Referral facility dropdowns** in the summary section now show saved values
✅ **Dates** are properly formatted and displayed
✅ **Menstrual health data** loads correctly for eligible students

## Database Schema Reference

The `annualHealthCards` table has these referral summary fields:
- `referral_defect_at_birth_yes` (boolean)
- `referral_defect_at_birth_facility_date` (text)
- `referral_deficiency_yes` (boolean)
- `referral_deficiency_facility_date` (text)
- `referral_disease_yes` (boolean)
- `referral_disease_facility_date` (text)
- `referral_leprosy_yes` (boolean)
- `referral_leprosy_facility_date` (text)
- `referral_tb_yes` (boolean)
- `referral_tb_facility_date` (text)
- `referral_developmental_yes` (boolean)
- `referral_developmental_facility_date` (text)
- `referral_adolescent_yes` (boolean)
- `referral_adolescent_facility_date` (text)

Note: The `_facility_date` fields store BOTH facility and date as a single text field.

## Files Modified
- `client/src/pages/StudentFormPage.tsx` - Added health card query, fixed field names, added loading logic
- `client/src/components/health-card/HealthCardFormSections.tsx` - Fixed referral summary field names

## Testing Recommendations
1. Create a new student with health card data
2. Fill in the "Referral Summary" section at the bottom
3. Check "Yes" for Deficiency, Disease, or Developmental Delay
4. Select a facility from the dropdown
5. Save and navigate away
6. Edit the same student
7. Verify all checkboxes in the Referral Summary show correct values
8. Verify facility dropdowns show the selected facilities
9. Test with different sections (A, B, C, D, E)

## API Endpoint Used
- `GET /api/health-cards?studentId={id}&limit=1`

This endpoint returns the most recent health card for the specified student.
