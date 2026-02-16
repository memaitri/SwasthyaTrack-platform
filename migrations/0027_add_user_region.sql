-- Add region column to users table for PO users
ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT;

-- Add comment
COMMENT ON COLUMN users.region IS 'Region assignment for PO users (Maharashtra, etc.)';
