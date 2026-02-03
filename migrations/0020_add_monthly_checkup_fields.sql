-- Add month and year fields to student_checkups for monthly tracking
-- This enables proper monthly checkup tracking with locking rules

-- Add month and year columns
ALTER TABLE student_checkups 
ADD COLUMN checkup_month integer NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);

ALTER TABLE student_checkups 
ADD COLUMN checkup_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Add unique constraint to prevent duplicate monthly checkups
-- student_id + event_id + month + year must be unique
ALTER TABLE student_checkups 
ADD CONSTRAINT unique_student_event_month_year 
UNIQUE (student_id, event_id, checkup_month, checkup_year);

-- Add check constraints for valid month and year ranges
ALTER TABLE student_checkups 
ADD CONSTRAINT chk_checkup_month 
CHECK (checkup_month >= 1 AND checkup_month <= 12);

ALTER TABLE student_checkups 
ADD CONSTRAINT chk_checkup_year 
CHECK (checkup_year >= 2020 AND checkup_year <= 2050);

-- Add indexes for performance
CREATE INDEX idx_student_checkups_month_year ON student_checkups(checkup_month, checkup_year);
CREATE INDEX idx_student_checkups_student_month_year ON student_checkups(student_id, checkup_month, checkup_year);

-- Add comments for documentation
COMMENT ON COLUMN student_checkups.checkup_month IS 'Month of the checkup (1-12)';
COMMENT ON COLUMN student_checkups.checkup_year IS 'Year of the checkup';
COMMENT ON CONSTRAINT unique_student_event_month_year ON student_checkups IS 'Ensures one checkup per student per event per month/year';