-- Add referral status tracking to student checkups
-- This migration adds referral status and completion tracking fields

-- Add referral status enum and tracking fields to student_checkups
ALTER TABLE student_checkups 
ADD COLUMN referral_status text CHECK (referral_status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Rejected')),
ADD COLUMN referral_notes text,
ADD COLUMN referral_date date,
ADD COLUMN present boolean DEFAULT true;

-- Add index for referral status filtering
CREATE INDEX idx_student_checkups_referral_status ON student_checkups(referral_status);

-- Add comments for documentation
COMMENT ON COLUMN student_checkups.referral_status IS 'Status of referral: Pending, In Progress, Completed, Overdue, Rejected';
COMMENT ON COLUMN student_checkups.referral_notes IS 'Additional notes about the referral';
COMMENT ON COLUMN student_checkups.referral_date IS 'Date when referral was made';
COMMENT ON COLUMN student_checkups.present IS 'Whether student was present during checkup';

-- Update existing records to have present = true by default
UPDATE student_checkups SET present = true WHERE present IS NULL;