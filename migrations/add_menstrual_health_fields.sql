-- Migration: Add menstrual health fields to annual_health_cards table
-- Date: 2025-01-17
-- Description: Adds comprehensive menstrual health tracking fields for female students aged 10+

ALTER TABLE annual_health_cards 
ADD COLUMN IF NOT EXISTS e4_menstruation_started boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e4_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e4_referral_facility text,
ADD COLUMN IF NOT EXISTS e4_referral_date date,
ADD COLUMN IF NOT EXISTS e7_severe_menstrual_pain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e7_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e7_referral_facility text,
ADD COLUMN IF NOT EXISTS e7_referral_date date,
ADD COLUMN IF NOT EXISTS menstrual_cycle_regular boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS menstrual_cycle_length_days integer,
ADD COLUMN IF NOT EXISTS menstrual_period_duration_days integer,
ADD COLUMN IF NOT EXISTS menstrual_last_period_date date,
ADD COLUMN IF NOT EXISTS menstrual_irregularities jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS menstrual_symptoms jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS menstrual_hygiene_practices jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS menstrual_educational_resources_accessed boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN annual_health_cards.e4_menstruation_started IS 'E4: Has menstruation started (female students aged 10+)';
COMMENT ON COLUMN annual_health_cards.e4_referral_suggested IS 'E4: Referral suggested for menstruation issues';
COMMENT ON COLUMN annual_health_cards.e4_referral_facility IS 'E4: Referral facility for menstruation issues';
COMMENT ON COLUMN annual_health_cards.e4_referral_date IS 'E4: Referral date for menstruation issues';
COMMENT ON COLUMN annual_health_cards.e7_severe_menstrual_pain IS 'E7: Severe menstrual pain (female students aged 10+)';
COMMENT ON COLUMN annual_health_cards.e7_referral_suggested IS 'E7: Referral suggested for severe menstrual pain';
COMMENT ON COLUMN annual_health_cards.e7_referral_facility IS 'E7: Referral facility for severe menstrual pain';
COMMENT ON COLUMN annual_health_cards.e7_referral_date IS 'E7: Referral date for severe menstrual pain';
COMMENT ON COLUMN annual_health_cards.menstrual_cycle_regular IS 'Regular menstrual cycle tracking';
COMMENT ON COLUMN annual_health_cards.menstrual_cycle_length_days IS 'Menstrual cycle length in days (20-40)';
COMMENT ON COLUMN annual_health_cards.menstrual_period_duration_days IS 'Menstrual period duration in days (1-10)';
COMMENT ON COLUMN annual_health_cards.menstrual_last_period_date IS 'Date of last menstrual period';
COMMENT ON COLUMN annual_health_cards.menstrual_irregularities IS 'JSON object tracking menstrual irregularities';
COMMENT ON COLUMN annual_health_cards.menstrual_symptoms IS 'JSON object tracking menstrual symptoms';
COMMENT ON COLUMN annual_health_cards.menstrual_hygiene_practices IS 'JSON object tracking menstrual hygiene practices';
COMMENT ON COLUMN annual_health_cards.menstrual_educational_resources_accessed IS 'Whether menstrual educational resources were accessed';