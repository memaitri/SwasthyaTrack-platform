-- Add additional fields for health card expansion

ALTER TABLE annual_health_cards
-- D section referral dates
ADD COLUMN IF NOT EXISTS d1_referral_date date,
ADD COLUMN IF NOT EXISTS d2_referral_date date,
ADD COLUMN IF NOT EXISTS d3_referral_date date,
ADD COLUMN IF NOT EXISTS d4_referral_date date,
ADD COLUMN IF NOT EXISTS d5_referral_date date,
ADD COLUMN IF NOT EXISTS d6_referral_date date,
ADD COLUMN IF NOT EXISTS d7_referral_date date,
ADD COLUMN IF NOT EXISTS d8_referral_date date,
ADD COLUMN IF NOT EXISTS d9_referral_date date,

-- Update C7 clinical features structure
DROP COLUMN IF EXISTS c7_clinical_features,
ADD COLUMN c7_clinical_features jsonb DEFAULT '{}'::jsonb,

-- Update C7 types structure
DROP COLUMN IF EXISTS c7_types,
ADD COLUMN c7_types jsonb DEFAULT '{}'::jsonb,

-- Update C7 nerve involvement structure
DROP COLUMN IF EXISTS c7_nerve_involvement,
ADD COLUMN c7_nerve_involvement jsonb DEFAULT '{}'::jsonb,

-- Update C7 functional impact structure
DROP COLUMN IF EXISTS c7_functional_impact,
ADD COLUMN c7_functional_impact jsonb DEFAULT '{}'::jsonb,

-- Update C8 symptoms structure
DROP COLUMN IF EXISTS c8_symptoms,
ADD COLUMN c8_symptoms jsonb DEFAULT '{}'::jsonb,

-- Update C8 relevant history structure
DROP COLUMN IF EXISTS c8_relevant_history,
ADD COLUMN c8_relevant_history jsonb DEFAULT '{}'::jsonb,

-- Update C8 extra pulmonary structure
DROP COLUMN IF EXISTS c8_extra_pulmonary,
ADD COLUMN c8_extra_pulmonary jsonb DEFAULT '{}'::jsonb;