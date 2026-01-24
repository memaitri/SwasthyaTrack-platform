-- Add school_type column to schools table
ALTER TABLE schools
  ADD COLUMN school_type VARCHAR(20) NOT NULL DEFAULT 'Government';

-- Add check constraint to enforce enum values
ALTER TABLE schools
  ADD CONSTRAINT schools_school_type_check 
  CHECK (school_type IN ('Government', 'Aided'));

-- Update existing schools to have a default value (Government)
-- This ensures no null values exist
UPDATE schools SET school_type = 'Government' WHERE school_type IS NULL;

-- Remove the default after updating existing records
ALTER TABLE schools ALTER COLUMN school_type DROP DEFAULT;