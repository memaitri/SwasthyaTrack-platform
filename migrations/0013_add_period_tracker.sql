-- Migration: Add Period Tracker Module
-- Description: Create table for daily menstrual cycle tracking with mood, symptoms, flow, and temperature
-- Date: 2026-01-16

-- Create period_tracker_entries table
CREATE TABLE IF NOT EXISTS period_tracker_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR NOT NULL,
  school_id VARCHAR NOT NULL,
  entry_date DATE NOT NULL,
  
  -- Mood tracking (multiple selections stored as JSONB array)
  moods JSONB DEFAULT '[]'::jsonb,
  -- Options: happy, sad, anxious, irritable, energetic, tired, calm, stressed, emotional, normal
  
  -- Physical measurements
  body_temperature_celsius DECIMAL(4, 2),
  -- Range: 35.0 - 42.0°C
  
  -- Pain intensity (0-10 scale)
  pain_intensity INTEGER CHECK (pain_intensity >= 0 AND pain_intensity <= 10),
  
  -- Flow category
  flow_category TEXT CHECK (flow_category IN ('none', 'spotting', 'light', 'medium', 'heavy')),
  
  -- Detailed symptoms (multiple selections stored as JSONB array)
  symptoms JSONB DEFAULT '[]'::jsonb,
  -- Options: cramps, headache, nausea, bloating, breast_tenderness, back_pain, 
  --          fatigue, dizziness, acne, food_cravings, insomnia, diarrhea, constipation
  
  -- Optional notes
  notes TEXT,
  
  -- Tracking metadata
  recorded_by VARCHAR,
  -- User ID who recorded this entry (Lady Superintendent, ClassTeacher, or self if student portal exists)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_period_tracker_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_period_tracker_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_period_tracker_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ensure one entry per student per date
  CONSTRAINT unique_student_date UNIQUE (student_id, entry_date)
);

-- Create indexes for performance

-- Index for student-based lookup (most common query pattern)
CREATE INDEX idx_period_tracker_student_id ON period_tracker_entries(student_id);

-- Index for date-based filtering
CREATE INDEX idx_period_tracker_entry_date ON period_tracker_entries(entry_date);

-- Composite index for student + date range queries (optimized for month-wise performance)
CREATE INDEX idx_period_tracker_student_date ON period_tracker_entries(student_id, entry_date DESC);

-- Index for school-based queries (Lady Superintendent dashboard)
CREATE INDEX idx_period_tracker_school_id ON period_tracker_entries(school_id);

-- Composite index for school + date (for school-wide reports)
CREATE INDEX idx_period_tracker_school_date ON period_tracker_entries(school_id, entry_date DESC);

-- Index for flow category filtering (for analytics)
CREATE INDEX idx_period_tracker_flow_category ON period_tracker_entries(flow_category) WHERE flow_category IS NOT NULL;

-- Comment on table
COMMENT ON TABLE period_tracker_entries IS 'Daily menstrual cycle tracking entries with mood, symptoms, flow, temperature, and pain data';

-- Comment on columns
COMMENT ON COLUMN period_tracker_entries.moods IS 'Array of mood selections: happy, sad, anxious, irritable, energetic, tired, calm, stressed, emotional, normal';
COMMENT ON COLUMN period_tracker_entries.body_temperature_celsius IS 'Body temperature in Celsius (35.0-42.0°C range)';
COMMENT ON COLUMN period_tracker_entries.pain_intensity IS 'Pain intensity on 0-10 scale (0=no pain, 10=severe pain)';
COMMENT ON COLUMN period_tracker_entries.flow_category IS 'Menstrual flow category: none, spotting, light, medium, heavy';
COMMENT ON COLUMN period_tracker_entries.symptoms IS 'Array of symptom selections: cramps, headache, nausea, bloating, breast_tenderness, back_pain, fatigue, dizziness, acne, food_cravings, insomnia, diarrhea, constipation';
COMMENT ON COLUMN period_tracker_entries.notes IS 'Optional free-text notes about the day';
