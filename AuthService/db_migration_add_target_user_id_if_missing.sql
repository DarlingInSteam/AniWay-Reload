-- Migration: ensure target_user_id column exists in admin_action_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='admin_action_logs' AND column_name='target_user_id'
    ) THEN
        ALTER TABLE admin_action_logs ADD COLUMN target_user_id BIGINT;
    END IF;
END$$;
