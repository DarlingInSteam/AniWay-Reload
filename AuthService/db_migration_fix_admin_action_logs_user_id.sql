-- Migration: normalize user_id / target_user_id columns in admin_action_logs
-- Problem: Application maps field userId -> column target_user_id, but database still has legacy NOT NULL user_id.
-- Inserts omit user_id -> NOT NULL violation 23502.
-- Strategy:
-- 1. If user_id exists and target_user_id does NOT -> rename user_id to target_user_id.
-- 2. If both exist -> copy data (prefer non-null values), drop user_id.
-- 3. Ensure target_user_id allows NULL (entity does) or keep as is; do NOT add NOT NULL automatically.
-- 4. Clean up any indexes on user_id and recreate for target_user_id if needed.
-- Safe & idempotent.

DO $$
DECLARE
    has_user BOOLEAN;
    has_target BOOLEAN;
    idx RECORD;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='admin_action_logs' AND column_name='user_id'
    ) INTO has_user;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='admin_action_logs' AND column_name='target_user_id'
    ) INTO has_target;

    IF has_user AND NOT has_target THEN
        -- Simple rename path
        ALTER TABLE admin_action_logs RENAME COLUMN user_id TO target_user_id;
    ELSIF has_user AND has_target THEN
        -- Merge values: prefer target_user_id if already set, else take user_id
        UPDATE admin_action_logs
           SET target_user_id = COALESCE(target_user_id, user_id)
         WHERE user_id IS NOT NULL
           AND (target_user_id IS NULL OR target_user_id <> user_id);

        -- Drop any indexes referencing user_id (will recreate later if useful)
        FOR idx IN SELECT indexname, indexdef FROM pg_indexes WHERE tablename='admin_action_logs' LOOP
            IF idx.indexdef ILIKE '%(user_id)%' THEN
                EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
            END IF;
        END LOOP;

        -- Finally drop legacy column
        ALTER TABLE admin_action_logs DROP COLUMN user_id;
    END IF;
END$$;

-- Optional: recreate index on target_user_id for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target_user_id ON admin_action_logs(target_user_id);

-- Verification (manual):
-- SELECT column_name FROM information_schema.columns WHERE table_name='admin_action_logs' AND column_name IN ('user_id','target_user_id');
-- Expect only target_user_id.
