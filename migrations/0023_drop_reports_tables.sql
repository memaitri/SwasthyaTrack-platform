-- Drop reports and shared_reports tables
-- This migration removes the reports module completely

-- Drop foreign key constraints first
DROP TABLE IF EXISTS shared_reports CASCADE;

-- Drop the main reports table
DROP TABLE IF EXISTS reports CASCADE;

-- Note: This migration removes all report functionality from the system
-- Any existing report files in storage/reports/ should be manually cleaned up