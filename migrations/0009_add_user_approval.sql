-- Migration: Add approval workflow fields to users
-- Adds approval_status, approver_id, approver_note, requested_at, approved_at

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'Approved',
  ADD COLUMN IF NOT EXISTS approver_id varchar,
  ADD COLUMN IF NOT EXISTS approver_note text,
  ADD COLUMN IF NOT EXISTS requested_at timestamp,
  ADD COLUMN IF NOT EXISTS approved_at timestamp;

-- Backfill: set approval_status to 'Approved' for existing active users
UPDATE users SET approval_status = 'Approved' WHERE approval_status IS NULL AND is_active = true;
