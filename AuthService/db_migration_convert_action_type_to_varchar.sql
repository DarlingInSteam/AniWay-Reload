-- Converts legacy smallint-based ordinal action_type column to varchar textual enum names
-- Safe to run multiple times: checks data types / values first.
-- Enum mapping (existing ordinal -> name):
-- 0 -> CHANGE_ROLE
-- 1 -> BAN_USER
-- 2 -> UNBAN_USER

DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'admin_action_logs'
      AND column_name = 'action_type';

    IF NOT FOUND THEN
        RAISE NOTICE 'Column action_type not found, skipping.';
        RETURN;
    END IF;

    -- If already varchar and no numeric remnants -> nothing
    IF col_type = 'character varying' AND NOT EXISTS (SELECT 1 FROM admin_action_logs WHERE action_type ~ '^[0-9]+$') THEN
        RAISE NOTICE 'action_type already textual without numeric remnants. Skipping.';
        RETURN;
    END IF;

    -- Strategy: create shadow column, populate mapped values, swap.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_action_logs' AND column_name = 'action_type_text_shadow'
    ) THEN
        ALTER TABLE admin_action_logs ADD COLUMN action_type_text_shadow varchar(50);
    END IF;

    UPDATE admin_action_logs
    SET action_type_text_shadow = CASE
        WHEN col_type IN ('smallint','integer') THEN (
            CASE action_type::text
                WHEN '0' THEN 'CHANGE_ROLE'
                WHEN '1' THEN 'BAN_USER'
                WHEN '2' THEN 'UNBAN_USER'
                ELSE action_type::text
            END)
        ELSE (
            CASE action_type
                WHEN '0' THEN 'CHANGE_ROLE'
                WHEN '1' THEN 'BAN_USER'
                WHEN '2' THEN 'UNBAN_USER'
                WHEN 'CHANGE_ROLE' THEN 'CHANGE_ROLE'
                WHEN 'BAN_USER' THEN 'BAN_USER'
                WHEN 'UNBAN_USER' THEN 'UNBAN_USER'
                ELSE action_type
            END)
    END
    WHERE action_type_text_shadow IS NULL
          OR action_type_text_shadow <> CASE
                WHEN col_type IN ('smallint','integer') THEN action_type::text
                ELSE action_type END; -- minimal update set

    -- Ensure no NULLs remain
    UPDATE admin_action_logs SET action_type_text_shadow = 'CHANGE_ROLE' WHERE action_type_text_shadow IS NULL;

    -- Drop dependent indexes / constraints referencing action_type (if any) dynamically
    -- (We only look for simple indexes here)
    FOR col_type IN
        SELECT indexname FROM pg_indexes
        WHERE tablename='admin_action_logs' AND indexdef ILIKE '%(action_type)%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', col_type);
    END LOOP;

    -- Rename original column
    ALTER TABLE admin_action_logs RENAME COLUMN action_type TO action_type_old_backup;
    ALTER TABLE admin_action_logs RENAME COLUMN action_type_text_shadow TO action_type;

    -- Set type already varchar; cleanup old column
    ALTER TABLE admin_action_logs DROP COLUMN action_type_old_backup;

    -- Optional: add index back (uncomment if needed)
    -- CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON admin_action_logs(action_type);

    RAISE NOTICE 'action_type migration via shadow column complete.';
END $$;
