-- Add missing columns to student_checkups table
-- This migration adds columns that were missing from the initial medical teams migration

-- Add present column (for attendance tracking)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_checkups' AND column_name = 'present') THEN
        ALTER TABLE student_checkups ADD COLUMN present boolean DEFAULT true;
    END IF;
END $$;

-- Add referral tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_checkups' AND column_name = 'referral_status') THEN
        ALTER TABLE student_checkups ADD COLUMN referral_status text;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_checkups' AND column_name = 'referral_notes') THEN
        ALTER TABLE student_checkups ADD COLUMN referral_notes text;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_checkups' AND column_name = 'referral_date') THEN
        ALTER TABLE student_checkups ADD COLUMN referral_date date;
    END IF;
END $$;

-- Add check constraint for referral_status (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_referral_status') THEN
        ALTER TABLE student_checkups ADD CONSTRAINT chk_referral_status 
        CHECK (referral_status IS NULL OR referral_status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Rejected'));
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN student_checkups.present IS 'Whether the student was present during the checkup';
COMMENT ON COLUMN student_checkups.referral_status IS 'Status of referral if student was referred to another facility';
COMMENT ON COLUMN student_checkups.referral_notes IS 'Additional notes about the referral';
COMMENT ON COLUMN student_checkups.referral_date IS 'Date when the referral was made';