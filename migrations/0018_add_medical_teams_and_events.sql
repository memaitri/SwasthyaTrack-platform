-- Medical Teams and Events Migration
-- Creates tables for medical team registration and event-driven monthly checkups

-- Medical Teams table
CREATE TABLE medical_teams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  primary_contact_member_id varchar,
  default_medications jsonb DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Medical Team Members table
CREATE TABLE medical_team_members (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES medical_teams(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Doctor', 'Pharmacist', 'Nurse', 'Technician', 'Other')),
  full_name text NOT NULL,
  designation text NOT NULL,
  phone text NOT NULL,
  email text,
  reg_number text,
  license_expiry date,
  facility text,
  notes text,
  created_at timestamp DEFAULT now()
);

-- Medical Events table
CREATE TABLE medical_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES medical_teams(id),
  name text NOT NULL,
  event_date date NOT NULL,
  location text,
  notes text,
  created_at timestamp DEFAULT now(),
  created_by varchar NOT NULL
);

-- Student Checkups table (enhanced version of monthly_checkups for events)
CREATE TABLE student_checkups (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar NOT NULL,
  event_id varchar NOT NULL REFERENCES medical_events(id) ON DELETE CASCADE,
  team_id varchar NOT NULL REFERENCES medical_teams(id),
  status text NOT NULL DEFAULT 'Not started' CHECK (status IN ('Not started', 'In progress', 'Completed')),
  height_cm decimal(5,2),
  weight_kg decimal(5,2),
  bmi decimal(5,2),
  temperature_c decimal(4,2),
  bp_systolic integer,
  bp_diastolic integer,
  symptoms text,
  diagnosis text,
  medications_given text,
  referred_to text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Add foreign key constraint for primary contact
ALTER TABLE medical_teams 
ADD CONSTRAINT fk_primary_contact 
FOREIGN KEY (primary_contact_member_id) REFERENCES medical_team_members(id);

-- Add indices for performance
CREATE INDEX idx_medical_team_members_team_id ON medical_team_members(team_id);
CREATE INDEX idx_medical_events_date ON medical_events(event_date);
CREATE INDEX idx_medical_events_team_id ON medical_events(team_id);
CREATE INDEX idx_student_checkups_event_id ON student_checkups(event_id);
CREATE INDEX idx_student_checkups_student_id ON student_checkups(student_id);
CREATE INDEX idx_student_checkups_status ON student_checkups(status);

-- Add unique constraint to prevent duplicate event names on same date
CREATE UNIQUE INDEX idx_unique_event_name_date ON medical_events(name, event_date);

-- Add comments for documentation
COMMENT ON TABLE medical_teams IS 'Medical teams that conduct health checkups';
COMMENT ON TABLE medical_team_members IS 'Individual members of medical teams';
COMMENT ON TABLE medical_events IS 'Scheduled medical checkup events';
COMMENT ON TABLE student_checkups IS 'Individual student checkup records for events';
COMMENT ON COLUMN medical_teams.default_medications IS 'JSON array of default medications/formulary for this team';
COMMENT ON COLUMN student_checkups.status IS 'Checkup completion status: Not started, In progress, Completed';