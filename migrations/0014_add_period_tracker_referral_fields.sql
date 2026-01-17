-- Add referral fields to period_tracker_entries table
ALTER TABLE period_tracker_entries 
ADD COLUMN is_referred BOOLEAN DEFAULT FALSE,
ADD COLUMN referred_date DATE,
ADD COLUMN referral_facility TEXT;

-- Add indexes for efficient querying of referral data
CREATE INDEX idx_period_tracker_entries_is_referred ON period_tracker_entries(is_referred);
CREATE INDEX idx_period_tracker_entries_referred_date ON period_tracker_entries(referred_date);