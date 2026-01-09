-- C9 Sickle Cell Anaemia Migration
-- Migration for adding Sickle Cell Anaemia (C9) disease screening with hemoglobin type classification

-- Add C9 Sickle Cell Anaemia fields
ALTER TABLE annual_health_cards
ADD COLUMN IF NOT EXISTS c9_suspected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS c9_clinical_features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c9_hemoglobin_type JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS c9_referral_facility TEXT,
ADD COLUMN IF NOT EXISTS c9_referral_date DATE,
ADD COLUMN IF NOT EXISTS summary_disease_sickle_cell_anaemia BOOLEAN DEFAULT false;

-- Create index for faster queries on disease screening
CREATE INDEX IF NOT EXISTS idx_c9_screening ON annual_health_cards (c9_suspected);
CREATE INDEX IF NOT EXISTS idx_c9_summary ON annual_health_cards (summary_disease_sickle_cell_anaemia);
