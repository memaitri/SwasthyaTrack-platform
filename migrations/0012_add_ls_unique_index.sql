-- Prevent more than one active Lady Superintendent per school
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'unique_active_ls_per_school'
  ) THEN
    -- This will fail if duplicate active LS rows already exist; resolve duplicates manually before running in production
    CREATE UNIQUE INDEX unique_active_ls_per_school ON users (school_id)
      WHERE role = 'Lady Superintendent' AND is_active = true;
  END IF;
END$$;
