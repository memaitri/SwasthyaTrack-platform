-- Migration: Add support for PO staff blocking functionality
-- This migration ensures the necessary fields and indexes exist for the staff blocking feature

-- The isActive field should already exist in the users table, but let's ensure it's properly indexed
-- for performance when filtering active/blocked users

-- Add index on isActive field for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add composite index for PO district filtering with active status
CREATE INDEX IF NOT EXISTS idx_users_district_active_role ON users(district, is_active, role);

-- Add index on refresh_tokens.userId for efficient token cleanup when blocking users
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Ensure audit_logs table can handle staff blocking actions
-- (The table should already exist, this is just a safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE TABLE audit_logs (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id VARCHAR,
            details JSONB DEFAULT '{}',
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Add index on audit_logs for staff management actions
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_entity ON audit_logs(action, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);

-- Ensure notifications table can handle staff blocking notifications
-- (The table should already exist, this is just a safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            sender_id VARCHAR NOT NULL,
            sender_role TEXT NOT NULL,
            receiver_role TEXT NOT NULL,
            receiver_school_id VARCHAR,
            receiver_class_section TEXT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_important BOOLEAN DEFAULT FALSE,
            is_read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMP,
            related_student_id VARCHAR,
            related_school_id VARCHAR,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Add index on notifications for staff blocking notifications
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_role_school ON notifications(receiver_role, receiver_school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type_important ON notifications(type, is_important);

-- Add a comment to track this migration
COMMENT ON INDEX idx_users_is_active IS 'Index for PO staff blocking functionality - filters active/blocked users';
COMMENT ON INDEX idx_users_district_active_role IS 'Composite index for PO district-based staff filtering';

-- Insert a system notification about the new feature (optional)
INSERT INTO notifications (
    sender_id, 
    sender_role, 
    receiver_role, 
    type, 
    title, 
    message, 
    is_important,
    metadata
) 
SELECT 
    'system',
    'Admin',
    'PO',
    'system',
    'New Feature: Staff Management',
    'Program Officers can now block and unblock staff accounts in their district. Access this feature from the Staff Management tab in your dashboard.',
    true,
    '{"feature": "staff_blocking", "version": "1.0"}'
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'PO' LIMIT 1);

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 0022_add_staff_blocking_support.sql completed successfully';
    RAISE NOTICE 'Added indexes for PO staff blocking functionality';
    RAISE NOTICE 'PO users can now block/unblock staff accounts in their district';
END $$;