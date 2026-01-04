-- Migration: Restrict Program Officer (PO) to SELECT-only on students, annual_health_cards, and meal_logs
-- Run this migration on your target database (staging/production) to enforce read-only PO access.

BEGIN;

-- students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_students_policy ON students;
CREATE POLICY po_students_policy
  ON students
  FOR SELECT
  USING (current_setting('request.jwt.claims.role') = 'PO');

-- annual_health_cards
ALTER TABLE annual_health_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_health_cards_policy ON annual_health_cards;
CREATE POLICY po_health_cards_policy
  ON annual_health_cards
  FOR SELECT
  USING (current_setting('request.jwt.claims.role') = 'PO');

-- meal_logs
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_meals_policy ON meal_logs;
CREATE POLICY po_meals_policy
  ON meal_logs
  FOR SELECT
  USING (current_setting('request.jwt.claims.role') = 'PO');

COMMIT;

-- Notes:
-- - This migration is idempotent (uses DROP POLICY IF EXISTS).
-- - For safety, review the policies after running by querying pg_policy:
--     SELECT polname, polrelid::regclass::text AS table_name, polcmd FROM pg_policy WHERE polrelid::regclass::text IN ('students','annual_health_cards','meal_logs');
-- - To apply via node script (uses your .env DATABASE_URL):
--     node script/apply_rls_final.mjs
