-- Add school admission date field to students table
ALTER TABLE students ADD COLUMN school_admission_date date;

-- Make the field NOT NULL after adding it (to handle existing records)
-- For existing records, use enrollment_date as default if available, otherwise use created_at date
UPDATE students 
SET school_admission_date = COALESCE(enrollment_date, created_at::date)
WHERE school_admission_date IS NULL;

-- Now make it NOT NULL
ALTER TABLE students ALTER COLUMN school_admission_date SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN students.school_admission_date IS 'Date when student was first admitted to the school (mandatory field)';