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

    -- Already varchar & no numeric remnants
    IF col_type = 'character varying' AND NOT EXISTS (SELECT 1 FROM admin_action_logs WHERE action_type ~ '^[0-9]+$') THEN
        RAISE NOTICE 'action_type already textual with no numeric remnants.';
        RETURN;
    END IF;

    -- Clean any leftover temp columns from previous failed attempts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_action_logs' AND column_name='action_type_text_shadow') THEN
        ALTER TABLE admin_action_logs DROP COLUMN action_type_text_shadow;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_action_logs' AND column_name='action_type_new') THEN
        ALTER TABLE admin_action_logs DROP COLUMN action_type_new;
    END IF;

    -- Create new column
    ALTER TABLE admin_action_logs ADD COLUMN action_type_new varchar(50);

    -- Populate mapping (cast to text uniformly)
    UPDATE admin_action_logs
    SET action_type_new = CASE (action_type::text)
        WHEN '0' THEN 'CHANGE_ROLE'
        WHEN '1' THEN 'BAN_USER'
        WHEN '2' THEN 'UNBAN_USER'
        WHEN 'CHANGE_ROLE' THEN 'CHANGE_ROLE'
        WHEN 'BAN_USER' THEN 'BAN_USER'
        WHEN 'UNBAN_USER' THEN 'UNBAN_USER'
        ELSE 'CHANGE_ROLE' -- fallback default
    END;

    -- Drop indexes referencing old column (simple pattern search)
    PERFORM 1 FROM pg_indexes WHERE tablename='admin_action_logs' AND indexdef ILIKE '%(action_type)%';
    IF FOUND THEN
        FOR col_type IN SELECT indexname FROM pg_indexes WHERE tablename='admin_action_logs' AND indexdef ILIKE '%(action_type)%' LOOP
            EXECUTE format('DROP INDEX IF EXISTS %I', col_type);
        END LOOP;
    END IF;

    -- Swap columns
    ALTER TABLE admin_action_logs RENAME COLUMN action_type TO action_type_old;
    ALTER TABLE admin_action_logs RENAME COLUMN action_type_new TO action_type;

    -- Ensure new column not null
    ALTER TABLE admin_action_logs ALTER COLUMN action_type SET NOT NULL;

    -- Remove old column
    ALTER TABLE admin_action_logs DROP COLUMN action_type_old;

    -- Optional recreate index
    -- CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON admin_action_logs(action_type);

    RAISE NOTICE 'action_type migration completed successfully.';
END $$;
