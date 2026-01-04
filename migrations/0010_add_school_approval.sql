-- Add approval status and audit fields to schools table
ALTER TABLE schools
  ADD COLUMN approval_status text DEFAULT 'Pending',
  ADD COLUMN approver_id varchar,
  ADD COLUMN approver_note text,
  ADD COLUMN requested_by_email text,
  ADD COLUMN approved_at timestamp;

-- Existing active schools should be considered already approved
UPDATE schools SET approval_status = 'Approved' WHERE is_active = true;
