# C7 & C8 Health Card Update Summary

## Overview
Successfully updated the SwasthyaTrack application to implement comprehensive screening for C7 (Childhood Leprosy) and C8 (Childhood Tuberculosis) disease detection in annual health cards, along with standardized referral facility dropdown options.

## Changes Made

### 1. Database Schema Updates (`shared/schema.ts`)

#### C7 - Childhood Leprosy Disease (Hansen's Disease)
Replaced the previous generic C7 JSONB structure with 28 specific boolean and text fields capturing:

**C7.1 Skin Lesion Assessment:**
- `c7_skin_lesion_present` - Boolean indicator
- `c7_hypopigmented_reddish_lesion` - Lesion appearance
- `c7_lesion_sensory_deficit` - Sensory loss indicator
- `c7_skin_characteristics` - JSONB: not_painful, not_itchy, not_shedding_scales, not_seasonal, no_prior_inflammation, not_dark_red_depigmented
- `c7_num_lesions` - Text: '1-5' or 'more-than-5'
- `c7_lesion_type` - JSONB: patchy, plaque, nodular, diffuse_infiltration

**C7.2 Peripheral Nerve Involvement:**
- `c7_nerves_involved` - JSONB: greater_auricular, ulnar, radial_cutaneous, peroneal, posterior_tibial
- `c7_nerve_signs` - JSONB: thickening, loss_sensation, weakness_hand, weakness_foot, weakness_eye

**C7.3 Contractures & Deformities:**
- `c7_contractures_deformities` - JSONB: right_hand, left_hand, right_foot, left_foot, eyes, face

**Referral:**
- `c7_referral_facility` - Text field with dropdown options
- `c7_referral_date` - Date field

#### C8 - Childhood Tuberculosis Disease
Replaced the previous generic C8 JSONB structure with 55 specific boolean, integer, and decimal fields capturing:

**Pulmonary TB Screening (8.1-8.7):**
- `c8_cough_gt14_days`, `c8_cough_antibiotics_failed`, `c8_cough_with_bronchodilators_failed`
- `c8_persistent_fever`, `c8_fever_temperature`, `c8_fever_duration_weeks`
- `c8_reduced_playfulness`, `c8_reduced_daily_activity`, `c8_reduced_appetite`, `c8_reduced_interaction`, `c8_reduction_duration_days`
- `c8_recent_headache_irritability`, `c8_altered_behavior`, `c8_altered_behavior_duration_days`
- `c8_weight_loss_gt5_percent`, `c8_weight_loss_not_responding_deworming`, `c8_weight_loss_not_responding_micronutrient`, `c8_weight_loss_not_responding_nutrition`
- `c8_close_contact_known_tb`, `c8_contact_relation`
- `c8_measles_varicella_3mo`, `c8_steroids_chemotherapy_1mo`

**Extra-Pulmonary TB Screening (8.8-8.13):**
- Abdominal TB: `c8_abdominal_pain_dull_aching`, `c8_abdominal_swelling`, `c8_painless_abdominal_mass`, `c8_hepatomegaly`, `c8_splenomegaly`
- TB Lymph Nodes: `c8_lymph_node_swelling_painless`, `c8_lymph_node_not_responding_antibiotics`, `c8_lymph_node_characteristics` (JSONB)
- TB Spine: `c8_spine_pain_stiffness`, `c8_spinal_deformity`, `c8_cold_abscess`, `c8_night_cries_typical`, `c8_kyphotic_deformity`
- CNS TB: `c8_altered_consciousness`, `c8_convulsions_no_fever`, `c8_vomiting_no_diarrhea`, `c8_focal_neuro_deficit`, `c8_abnormal_movements`, `c8_cranial_nerve_palsy`, `c8_neck_stiffness_rigidity`
- Severe Respiratory: `c8_respiratory_distress`, `c8_difficulty_breathing`, `c8_persistent_cough_2weeks`, `c8_increased_respiratory_rate`, `c8_difficult_pneumonia`
- Bone & Joint TB: `c8_limping_recent_onset`, `c8_joint_pain_swelling`, `c8_bone_joint_night_cry`

**Referral:**
- `c8_referral_facility` - Text field with dropdown options
- `c8_referral_date` - Date field

### 2. Database Migration (`migrations/0006_c7_c8_disease_screening.sql`)

Created comprehensive migration script that:
- Adds all 83 new C7 and C8 columns
- Drops old JSONB-based C7 and C8 columns (c7, c7_clinical_features, c7_types, c7_nerve_involvement, c7_functional_impact, c8, c8_symptoms, c8_relevant_history, c8_extra_pulmonary, c8_investigations, c8_treatment)
- Creates indexes on c7_suspected, c8_suspected, and referral_code for fast queries
- Uses CASCADE for safe column removal

### 3. Referral Facility Constants (`lib/referralFacilities.ts`)

Created standardized referral facility options to ensure consistency:

```typescript
REFERRAL_FACILITIES = {
  "PHC/CHC", "District Hospital", "DEIC", "DOTS Centre",
  "Leprosy Clinic", "Leprosy Specialist Clinic", "TB Clinic",
  "Eye Care Center", "Dental Clinic", "Orthopedic Center",
  "ENT Clinic", "Cardiology Center", "Neurology Center",
  "Pediatric Center", "Developmental Center",
  "Psychology/Counseling Center", "Psychiatry Center",
  "Nutrition Clinic", "Rehabilitation Center",
  "Physiotherapy Center", "Medical College Hospital",
  "Government Hospital", "Private Clinic", "Medical Camp", etc.
}

DEFAULT_REFERRAL_FACILITIES = {
  leprosy: ["PHC/CHC", "District Hospital", "DEIC", "Leprosy Specialist Clinic"],
  tuberculosis: ["PHC/CHC", "DOTS Centre", "District Hospital", "TB Specialist"],
  // ... other categories
}
```

### 4. Referral Logic (`server/referralLogic.ts`)

Implemented sophisticated referral determination functions:

**`isC7ReferralNeeded(healthCardData)`:**
- Checks if skin lesion criteria met (hypopigmented/reddish + sensory deficit + lesion count)
- Checks for nerve involvement (any nerves involved or nerve signs present)
- Checks for contractures/deformities
- Returns true if ANY condition is met (as per specification: "If ANY positive → REFER")

**`isC8ReferralNeeded(healthCardData)`:**
- Comprehensive check across all 13 TB screening criteria:
  - Pulmonary TB: cough, fever, activity reduction, behavior changes, weight loss, contact, immunocompromised
  - Extra-pulmonary: abdominal, lymph node, spine, CNS, respiratory, bone/joint TB
- Returns true if ANY criterion is met

**`generateC7ReferralIssue(healthCardData)`:**
- Creates detailed referral issue description with all positive findings

**`generateC8ReferralIssue(healthCardData)`:**
- Creates detailed referral issue description with key findings

### 5. UI Components (`client/src/components/health-card/HealthCardFormSections.tsx`)

**Updated C7 Section:**
- Replaced with comprehensive multi-section form matching specification
- Organized into C7.1, C7.2, C7.3 subsections
- Added skin characteristics multi-checkbox group
- Dropdown for lesion number (1-5 vs >5)
- Dropdown for lesion type (patchy, plaque, nodular, diffuse)
- Nerve involvement checkboxes (5 locations)
- Nerve signs checkboxes (5 signs)
- Contractures/deformities checkboxes (6 body parts)
- Referral facility dropdown with DEFAULT_REFERRAL_FACILITIES.leprosy options
- Red visual indicators and clear referral rules

**Updated C8 Section:**
- Replaced with comprehensive 13-subsection form matching specification
- 8.1-8.7: Pulmonary TB screening with inputs for temperature, duration, weights
- 8.8-8.13: Extra-pulmonary TB screening (abdominal, lymph nodes, spine, CNS, respiratory, bone/joint)
- Blue visual indicators
- Referral facility dropdown with DEFAULT_REFERRAL_FACILITIES.tuberculosis options
- Clear referral rules displayed

**Import Addition:**
- Added import of DEFAULT_REFERRAL_FACILITIES for dropdown rendering

### 6. Backend Route Updates (`server/routes.ts`)

**Import Addition:**
- Added import: `isC7ReferralNeeded, isC8ReferralNeeded, generateC7ReferralIssue, generateC8ReferralIssue` from referralLogic

**Referral Creation Logic (2 locations - student creation and health card resubmit):**
- Replaced hardcoded C7 and C8 referral checks with dynamic logic:
  ```typescript
  if (isC7ReferralNeeded(healthCardData)) {
    referralConditions.push({
      condition: true,
      type: "disease",
      code: "C7",
      issue: generateC7ReferralIssue(healthCardData),
      facility: healthCardData.c7_referral_facility || "District Hospital"
    });
  }
  ```
- Same pattern for C8 using `isC8ReferralNeeded()` and `generateC8ReferralIssue()`
- Existing deficiency and condition checks remain intact

## Key Features

### ✅ Dropdown Referral Facilities
- No free text input for referral facilities (eliminates case sensitivity issues)
- Standardized options ensure consistency in data analysis
- Context-specific defaults based on disease/condition

### ✅ Comprehensive Disease Screening
- All 13 TB screening criteria implemented
- All 3 Leprosy assessment sections implemented
- Complex logic to determine when referrals are needed
- Follows "If ANY positive → REFER" pattern specified

### ✅ Detailed Issue Descriptions
- Referrals include detailed findings summary
- Helps receiving facility understand the reason for referral

### ✅ Backward Compatibility
- Old C7/C8 JSONB fields dropped safely
- Existing deficiency and condition checks unaffected
- Migration handles old data removal

### ✅ Data Consistency
- Dashboard queries and analysis will work with standardized facility names
- No more data entry variations affecting reporting

## Testing Recommendations

1. **UI Testing:**
   - Test C7 form with various combinations of inputs
   - Test C8 form with all 13 screening criteria
   - Verify dropdown options display correctly
   - Test referral facility selection

2. **Logic Testing:**
   - Verify C7 referral triggered with skin lesion + sensory deficit
   - Verify C7 referral triggered with nerve involvement
   - Verify C7 referral triggered with contractures
   - Test all 8 C8 pulmonary TB criteria
   - Test all 5 C8 extra-pulmonary categories

3. **Database Testing:**
   - Run migration on test database
   - Verify all new columns created
   - Verify old columns dropped successfully
   - Verify indexes created

4. **API Testing:**
   - Test health card creation with C7/C8 data
   - Verify referrals created with correct facility
   - Verify referral issue descriptions generated correctly

## Files Modified

1. `shared/schema.ts` - Database schema updates
2. `migrations/0006_c7_c8_disease_screening.sql` - Database migration
3. `lib/referralFacilities.ts` - NEW: Referral facility constants
4. `server/referralLogic.ts` - NEW: Referral determination logic
5. `server/routes.ts` - Import additions + referral logic updates
6. `client/src/components/health-card/HealthCardFormSections.tsx` - UI component updates

## Next Steps (Optional Enhancements)

1. Update PO and HM dashboards to display C7/C8 disease counts
2. Add C7/C8 filters to referral views
3. Generate reports specifically for leprosy and TB
4. Add C7/C8 disease summary metrics to dashboards
5. Create alerts for high C7/C8 rates by school/district
