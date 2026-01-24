-- Migration: Add student academic status and audit logging
-- Date: 2025-01-23
-- Purpose: Support Promote/Demote/Detain functionality

-- Add academic status to students table
ALTER TABLE students 
ADD COLUMN academic_status text NOT NULL DEFAULT 'Active' 
CHECK (academic_status IN ('Active', 'Promoted', 'Demoted', 'Detained'));

-- Add academic year tracking
ALTER TABLE students 
ADD COLUMN academic_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Add previous class tracking for audit purposes
ALTER TABLE students 
ADD COLUMN previous_class_section text;

-- Create student academic actions audit table
CREATE TABLE student_academic_actions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('Promote', 'Demote', 'Detain')),
  old_status text NOT NULL,
  new_status text NOT NULL,
  old_class_section text NOT NULL,
  new_class_section text NOT NULL,
  old_teacher_id varchar,
  new_teacher_id varchar,
  reason text NOT NULL,
  academic_year integer NOT NULL,
  performed_by varchar NOT NULL REFERENCES users(id),
  performed_by_role text NOT NULL,
  performed_at timestamp DEFAULT NOW(),
  created_at timestamp DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_student_academic_actions_student_id ON student_academic_actions(student_id);
CREATE INDEX idx_student_academic_actions_performed_by ON student_academic_actions(performed_by);
CREATE INDEX idx_student_academic_actions_academic_year ON student_academic_actions(academic_year);

-- Add comments for documentation
COMMENT ON TABLE student_academic_actions IS 'Audit log for all student academic status changes (Promote/Demote/Detain)';
COMMENT ON COLUMN students.academic_status IS 'Current academic status: Active, Promoted, Demoted, Detained';
COMMENT ON COLUMN students.academic_year IS 'Academic year for tracking promotions/demotions';
COMMENT ON COLUMN students.previous_class_section IS 'Previous class section before last academic action';