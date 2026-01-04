-- C7 and C8 Health Card Migration - Detailed Leprosy and Tuberculosis Screening
-- Migration for comprehensive childhood leprosy (C7) and tuberculosis (C8) disease screening

-- Add C7 Leprosy fields
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c7_skin_lesion_present BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c7_hypopigmented_reddish_lesion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c7_lesion_sensory_deficit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c7_skin_characteristics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c7_num_lesions TEXT,
ADD COLUMN IF NOT EXISTS c7_lesion_type JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c7_nerves_involved JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c7_nerve_signs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c7_contractures_deformities JSONB DEFAULT '{}';

-- Add C8 Tuberculosis fields - Pulmonary TB Screening
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c8_cough_gt14_days BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_cough_antibiotics_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_cough_with_bronchodilators_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_persistent_fever BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_fever_temperature DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS c8_fever_duration_weeks INTEGER,
ADD COLUMN IF NOT EXISTS c8_reduced_playfulness BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_reduced_daily_activity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_reduced_appetite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_reduced_interaction BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_reduction_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS c8_recent_headache_irritability BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_altered_behavior BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_altered_behavior_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS c8_weight_loss_gt5_percent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_weight_loss_not_responding_deworming BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_weight_loss_not_responding_micronutrient BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_weight_loss_not_responding_nutrition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_close_contact_known_tb BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_contact_relation TEXT,
ADD COLUMN IF NOT EXISTS c8_measles_varicella_3mo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_steroids_chemotherapy_1mo BOOLEAN DEFAULT false;

-- Add C8 Extra-pulmonary TB Screening
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c8_abdominal_pain_dull_aching BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_abdominal_swelling BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_painless_abdominal_mass BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_hepatomegaly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_splenomegaly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_lymph_node_swelling_painless BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_lymph_node_not_responding_antibiotics BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_lymph_node_characteristics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c8_spine_pain_stiffness BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_spinal_deformity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_cold_abscess BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_night_cries_typical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_kyphotic_deformity BOOLEAN DEFAULT false;

-- Add C8 CNS TB Screening
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c8_altered_consciousness BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_convulsions_no_fever BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_vomiting_no_diarrhea BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_focal_neuro_deficit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_abnormal_movements BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_cranial_nerve_palsy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_neck_stiffness_rigidity BOOLEAN DEFAULT false;

-- Add C8 Severe Respiratory Disease
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c8_respiratory_distress BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_difficulty_breathing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_persistent_cough_2weeks BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_increased_respiratory_rate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_difficult_pneumonia BOOLEAN DEFAULT false;

-- Add C8 Bone & Joint TB
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c8_limping_recent_onset BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_joint_pain_swelling BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c8_bone_joint_night_cry BOOLEAN DEFAULT false;

-- Drop old C7 and C8 columns if they exist
ALTER TABLE annual_health_cards
DROP COLUMN IF EXISTS c7 CASCADE,
DROP COLUMN IF EXISTS c7_clinical_features CASCADE,
DROP COLUMN IF EXISTS c7_types CASCADE,
DROP COLUMN IF EXISTS c7_nerve_involvement CASCADE,
DROP COLUMN IF EXISTS c7_functional_impact CASCADE,
DROP COLUMN IF EXISTS c8 CASCADE,
DROP COLUMN IF EXISTS c8_symptoms CASCADE,
DROP COLUMN IF EXISTS c8_relevant_history CASCADE,
DROP COLUMN IF EXISTS c8_extra_pulmonary CASCADE,
DROP COLUMN IF EXISTS c8_investigations CASCADE,
DROP COLUMN IF EXISTS c8_treatment CASCADE;

-- Create index for faster queries on disease screening
CREATE INDEX IF NOT EXISTS idx_c7_c8_screening ON annual_health_cards (c7_suspected, c8_suspected);
CREATE INDEX IF NOT EXISTS idx_referral_status ON referrals (referral_code, status);
