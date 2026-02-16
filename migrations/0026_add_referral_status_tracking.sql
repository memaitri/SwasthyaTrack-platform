-- Migration: Add referral status tracking to monthly_checkups and period_tracker_entries
-- This allows Class Teachers to update referral status for all referral types

-- Add referral status tracking to monthly_checkups
ALTER TABLE monthly_checkups 
ADD COLUMN IF NOT EXISTS referral_status TEXT,
ADD COLUMN IF NOT EXISTS referral_completion_date DATE,
ADD COLUMN IF NOT EXISTS referral_notes TEXT;

-- Add referral status tracking to period_tracker_entries
ALTER TABLE period_tracker_entries 
ADD COLUMN IF NOT EXISTS referral_status TEXT,
ADD COLUMN IF NOT EXISTS referral_completion_date DATE,
ADD COLUMN IF NOT EXISTS referral_notes TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_checkups_referral_status 
ON monthly_checkups(referral_status) 
WHERE referred_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_period_tracker_referral_status 
ON period_tracker_entries(referral_status) 
WHERE is_referred = true;

-- Add comments
COMMENT ON COLUMN monthly_checkups.referral_status IS 'Status of the referral: Pending, In Progress, Completed, Overdue, Rejected';
COMMENT ON COLUMN monthly_checkups.referral_completion_date IS 'Date when the referral was completed';
COMMENT ON COLUMN monthly_checkups.referral_notes IS 'Additional notes about the referral follow-up';

COMMENT ON COLUMN period_tracker_entries.referral_status IS 'Status of the referral: Pending, In Progress, Completed, Overdue, Rejected';
COMMENT ON COLUMN period_tracker_entries.referral_completion_date IS 'Date when the referral was completed';
COMMENT ON COLUMN period_tracker_entries.referral_notes IS 'Additional notes about the referral follow-up';
