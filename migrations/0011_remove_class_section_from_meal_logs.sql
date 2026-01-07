-- Migration: Remove class_section from meal_logs (meals are school-level only)
BEGIN;

-- Drop column if exists
-- Drop any RLS policies that depend on class_section first
DO $$
BEGIN
    -- Drop legacy policy that referenced class_section
    IF EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'class_teacher_meals_policy' AND polrelid = 'meal_logs'::regclass
    ) THEN
        EXECUTE 'DROP POLICY class_teacher_meals_policy ON meal_logs';
    END IF;

    -- Safety: remove any other named policies that may reference class_section (if present)
    IF EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'class_teacher_health_cards_policy' AND polrelid = 'meal_logs'::regclass
    ) THEN
        EXECUTE 'DROP POLICY class_teacher_health_cards_policy ON meal_logs';
    END IF;

    -- Now drop the column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meal_logs' AND column_name = 'class_section'
    ) THEN
        EXECUTE 'ALTER TABLE meal_logs DROP COLUMN class_section';
    END IF;
END$$;

-- Safety: re-enable RLS if needed (no-op if already enabled)
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

COMMIT;
