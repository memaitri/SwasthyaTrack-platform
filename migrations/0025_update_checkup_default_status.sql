-- Migration: Update default status for student checkups from "Not started" to "In progress"
-- This ensures new checkups automatically start with "In progress" status

-- Update the default value for the status column
ALTER TABLE student_checkups 
ALTER COLUMN status SET DEFAULT 'In progress';

-- Update existing "Not started" checkups to "In progress" (optional - only if you want to update existing records)
-- Uncomment the line below if you want to update existing records
-- UPDATE student_checkups SET status = 'In progress' WHERE status = 'Not started';

-- Add comment to document the change
COMMENT ON COLUMN student_checkups.status IS 'Checkup status: defaults to "In progress" on creation. Once marked "Completed", becomes read-only.';
