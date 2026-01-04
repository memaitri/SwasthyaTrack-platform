-- Menstrual Cycle Tracking Enhancement
-- This migration adds detailed menstrual cycle tracking fields for adolescent female health

ALTER TABLE annual_health_cards
-- Detailed Menstrual Cycle Tracking for Adolescent Females
ADD COLUMN IF NOT EXISTS menstrual_cycle_regular boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS menstrual_cycle_length_days integer,
ADD COLUMN IF NOT EXISTS menstrual_period_duration_days integer,
ADD COLUMN IF NOT EXISTS menstrual_last_period_date date,
ADD COLUMN IF NOT EXISTS menstrual_irregularities jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS menstrual_symptoms jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS menstrual_hygiene_practices jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS menstrual_educational_resources_accessed boolean DEFAULT false,
-- Adolescent-specific menstrual fields
ADD COLUMN IF NOT EXISTS e4_menstruation_started boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e4_last_menstrual_period date,
ADD COLUMN IF NOT EXISTS e4_cycle_length_days integer,
ADD COLUMN IF NOT EXISTS e4_cycle_regular boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS e4_menstrual_pain_level text,
ADD COLUMN IF NOT EXISTS e4_menstrual_symptoms jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS e4_irregularities text,
ADD COLUMN IF NOT EXISTS e4_educational_resources_accessed boolean DEFAULT false,
-- Referral fields for adolescent health
ADD COLUMN IF NOT EXISTS e1_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e1_referral_facility text,
ADD COLUMN IF NOT EXISTS e1_referral_date date,
ADD COLUMN IF NOT EXISTS e2_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e2_referral_facility text,
ADD COLUMN IF NOT EXISTS e2_referral_date date,
ADD COLUMN IF NOT EXISTS e3_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e3_referral_facility text,
ADD COLUMN IF NOT EXISTS e3_referral_date date,
ADD COLUMN IF NOT EXISTS e4_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e4_referral_facility text,
ADD COLUMN IF NOT EXISTS e4_referral_date date,
ADD COLUMN IF NOT EXISTS e5_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e5_referral_facility text,
ADD COLUMN IF NOT EXISTS e5_referral_date date,
ADD COLUMN IF NOT EXISTS e6_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e6_referral_facility text,
ADD COLUMN IF NOT EXISTS e6_referral_date date,
ADD COLUMN IF NOT EXISTS e7_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e7_referral_facility text,
ADD COLUMN IF NOT EXISTS e7_referral_date date;

-- Create indexes for menstrual cycle tracking fields
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_menstrual_cycle ON annual_health_cards(menstrual_cycle_regular, menstrual_cycle_length_days, menstrual_period_duration_days);
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_menstrual_last_period ON annual_health_cards(menstrual_last_period_date);
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_e4_menstrual ON annual_health_cards(e4_menstruation_started, e4_last_menstrual_period);