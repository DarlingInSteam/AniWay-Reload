-- Migration: add created_at column to admin_action_logs if it does not exist
-- Compatible with PostgreSQL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='admin_action_logs' AND column_name='created_at'
    ) THEN
        ALTER TABLE admin_action_logs
            ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Backfill nulls explicitly (new column already defaulted for new rows)
        UPDATE admin_action_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    END IF;
END$$;