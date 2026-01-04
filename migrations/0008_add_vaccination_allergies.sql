-- Add vaccination and allergies fields to annual_health_cards
ALTER TABLE annual_health_cards
  ADD COLUMN IF NOT EXISTS vaccination_status text,
  ADD COLUMN IF NOT EXISTS vaccinations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allergies jsonb DEFAULT '[]'::jsonb;