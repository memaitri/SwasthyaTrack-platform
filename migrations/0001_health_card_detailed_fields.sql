-- Add detailed fields for comprehensive health card expansion

ALTER TABLE annual_health_cards
-- BMI Classification and BP Classification
ADD COLUMN IF NOT EXISTS bmi_category text,
ADD COLUMN IF NOT EXISTS bp_classification text,

-- B4 Vitamin A deficiency additional fields
ADD COLUMN IF NOT EXISTS b4_night_blindness boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS b4_bitots_spots boolean DEFAULT false,

-- B5 Vitamin D deficiency additional fields
ADD COLUMN IF NOT EXISTS b5_wrist_widening boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS b5_bowing_legs boolean DEFAULT false,

-- B8 Vitamin B deficiency additional fields
ADD COLUMN IF NOT EXISTS b8_angular_stomatitis boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS b8_raw_tongue boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS b8_corneal_vascularization boolean DEFAULT false,

-- C2 Otitis media additional fields
ADD COLUMN IF NOT EXISTS c2_assess_hearing boolean DEFAULT false,

-- C3 Dental additional fields
ADD COLUMN IF NOT EXISTS c3_white_discoloration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS c3_brown_discoloration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS c3_gum_swelling boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS c3_plaque boolean DEFAULT false,

-- C6 Rheumatic Heart Disease additional fields
ADD COLUMN IF NOT EXISTS c6_murmur boolean DEFAULT false,

-- Detailed C7 (Leprosy) structure
ADD COLUMN IF NOT EXISTS c7_clinical_features jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_types jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_nerve_involvement jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_functional_impact jsonb DEFAULT '{}'::jsonb,

-- Detailed C8 (Tuberculosis) structure
ADD COLUMN IF NOT EXISTS c8_symptoms jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_relevant_history jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_extra_pulmonary jsonb DEFAULT '{}'::jsonb,

-- Summary sections
ADD COLUMN IF NOT EXISTS defects_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS deficiencies_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS diseases_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS adolescent_health_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS referral_summary jsonb DEFAULT '{}'::jsonb,

-- Doctor signature and data entry fields
ADD COLUMN IF NOT EXISTS doctor_mht_name text,
ADD COLUMN IF NOT EXISTS doctor_signature_date date,
ADD COLUMN IF NOT EXISTS data_entry_register boolean DEFAULT false,

-- Referral summary by category
ADD COLUMN IF NOT EXISTS referral_defect_at_birth_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_defect_at_birth_facility_date text,
ADD COLUMN IF NOT EXISTS referral_deficiency_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_deficiency_facility_date text,
ADD COLUMN IF NOT EXISTS referral_disease_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_disease_facility_date text,
ADD COLUMN IF NOT EXISTS referral_leprosy_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_leprosy_facility_date text,
ADD COLUMN IF NOT EXISTS referral_tb_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_tb_facility_date text,
ADD COLUMN IF NOT EXISTS referral_developmental_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_developmental_facility_date text,
ADD COLUMN IF NOT EXISTS referral_adolescent_yes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_adolescent_facility_date text,

-- Date of visit
ADD COLUMN IF NOT EXISTS date_of_visit date;