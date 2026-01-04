-- Comprehensive Health Card Update for Class Teacher View
-- This migration adds all missing fields for the complete health card functionality

ALTER TABLE annual_health_cards
-- C7 Childhood Leprosy - Additional detailed fields
ADD COLUMN IF NOT EXISTS c7_suspected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS c7_clinical_features jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_types jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_nerve_involvement jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_functional_impact jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c7_referral_facility text,
ADD COLUMN IF NOT EXISTS c7_referral_date date,

-- C8 Childhood Tuberculosis - Additional detailed fields
ADD COLUMN IF NOT EXISTS c8_suspected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_symptoms jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_relevant_history jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_extra_pulmonary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_investigations jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_treatment jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS c8_referral_facility text,
ADD COLUMN IF NOT EXISTS c8_referral_date date,

-- Section D: Developmental Delay/Disability (D1-D9) - Complete with referral fields
ADD COLUMN IF NOT EXISTS d1_seeing_difficulty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d1_referral_facility text,
ADD COLUMN IF NOT EXISTS d1_referral_date date,

ADD COLUMN IF NOT EXISTS d2_walking_delay boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d2_referral_facility text,
ADD COLUMN IF NOT EXISTS d2_referral_date date,

ADD COLUMN IF NOT EXISTS d3_reading_writing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d3_referral_facility text,
ADD COLUMN IF NOT EXISTS d3_referral_date date,

ADD COLUMN IF NOT EXISTS d4_muscle_stiffness boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d4_referral_facility text,
ADD COLUMN IF NOT EXISTS d4_referral_date date,

ADD COLUMN IF NOT EXISTS d5_hearing_difficulty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d5_referral_facility text,
ADD COLUMN IF NOT EXISTS d5_referral_date date,

ADD COLUMN IF NOT EXISTS d6_speech_difficulty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d6_referral_facility text,
ADD COLUMN IF NOT EXISTS d6_referral_date date,

ADD COLUMN IF NOT EXISTS d7_learning_difficulty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d7_referral_facility text,
ADD COLUMN IF NOT EXISTS d7_referral_date date,

ADD COLUMN IF NOT EXISTS d8_inattention_hyperactivity boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d8_referral_facility text,
ADD COLUMN IF NOT EXISTS d8_referral_date date,

ADD COLUMN IF NOT EXISTS d9_behavioral_concerns boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS d9_referral_facility text,
ADD COLUMN IF NOT EXISTS d9_referral_date date,

-- Section E: Adolescent-Specific Questionnaire (E1-E7) - Complete with referral tracking
ADD COLUMN IF NOT EXISTS e1_life_events_difficulty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e1_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e1_referral_facility text,
ADD COLUMN IF NOT EXISTS e1_referral_date date,

ADD COLUMN IF NOT EXISTS e2_peer_pressure_substance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e2_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e2_referral_facility text,
ADD COLUMN IF NOT EXISTS e2_referral_date date,

ADD COLUMN IF NOT EXISTS e3_persistent_sadness boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e3_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e3_referral_facility text,
ADD COLUMN IF NOT EXISTS e3_referral_date date,

-- E4: Female-only, age gating: if female and not started by 16 yrs, refer
ADD COLUMN IF NOT EXISTS e4_menstruation_started boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e4_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e4_referral_facility text,
ADD COLUMN IF NOT EXISTS e4_referral_date date,

ADD COLUMN IF NOT EXISTS e5_pain_urination boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e5_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e5_referral_facility text,
ADD COLUMN IF NOT EXISTS e5_referral_date date,

ADD COLUMN IF NOT EXISTS e6_foul_discharge boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e6_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e6_referral_facility text,
ADD COLUMN IF NOT EXISTS e6_referral_date date,

-- E7: Female-only, severe dysmenorrhea
ADD COLUMN IF NOT EXISTS e7_severe_menstrual_pain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e7_referral_suggested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS e7_referral_facility text,
ADD COLUMN IF NOT EXISTS e7_referral_date date,

-- Summary sections for each major category
ADD COLUMN IF NOT EXISTS summary_defects_neural_tube boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_defects_down_syndrome boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_defects_cleft boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_defects_talipes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_defects_hip_dysplasia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_defects_congenital_deafness boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_defects_other text,

ADD COLUMN IF NOT EXISTS summary_deficiency_anemia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_deficiency_vitamin_a boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_deficiency_vitamin_d boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_deficiency_sam_stunting boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_deficiency_goitre boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_deficiency_vitamin_b boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_deficiency_other text,

ADD COLUMN IF NOT EXISTS summary_disease_skin_conditions boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_vision_impairment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_hearing_impairment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_dental boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_reactive_airway boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_heart boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_convulsive boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_neuro_motor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_cognitive_delay boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_motor_delay boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_speech_delay boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_behavioral_disorder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_tuberculosis boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_leprosy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_disease_other text,

ADD COLUMN IF NOT EXISTS summary_adolescent_menstrual_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_adolescent_substance_use boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_adolescent_depressed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_adolescent_burning_urination boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_adolescent_discharge boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_adolescent_other text,

-- Comprehensive referral summary by category
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

-- Doctor signature and data entry tracking
ADD COLUMN IF NOT EXISTS doctor_mht_name text,
ADD COLUMN IF NOT EXISTS doctor_signature_date date,
ADD COLUMN IF NOT EXISTS data_entry_register boolean DEFAULT false,

-- Date of visit and visit tracking
ADD COLUMN IF NOT EXISTS date_of_visit date,

-- Additional JSON fields for complex data structures
ADD COLUMN IF NOT EXISTS defects_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS deficiencies_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS diseases_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS adolescent_health_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS referral_summary jsonb DEFAULT '{}'::jsonb;

-- Create indexes for better performance on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_c7_suspected ON annual_health_cards(c7_suspected);
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_c8_suspected ON annual_health_cards(c8_suspected);
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_referral_recommended ON annual_health_cards(referral_recommended);
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_date_of_visit ON annual_health_cards(date_of_visit);
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_doctor_signature_date ON annual_health_cards(doctor_signature_date);

-- Create indexes for developmental delay fields
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_developmental ON annual_health_cards(d1_seeing_difficulty, d2_walking_delay, d3_reading_writing, d4_muscle_stiffness, d5_hearing_difficulty, d6_speech_difficulty, d7_learning_difficulty, d8_inattention_hyperactivity, d9_behavioral_concerns);

-- Create indexes for adolescent health fields
CREATE INDEX IF NOT EXISTS idx_annual_health_cards_adolescent ON annual_health_cards(e1_life_events_difficulty, e2_peer_pressure_substance, e3_persistent_sadness, e4_menstruation_started, e5_pain_urination, e6_foul_discharge, e7_severe_menstrual_pain);