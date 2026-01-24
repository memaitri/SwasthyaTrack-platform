-- Check columns for menstrual_health_records
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'menstrual_health_records'
ORDER BY ordinal_position;

-- Check constraints for menstrual_health_records
SELECT c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'menstrual_health_records';

-- Check indexes for menstrual_health_records
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'menstrual_health_records';
