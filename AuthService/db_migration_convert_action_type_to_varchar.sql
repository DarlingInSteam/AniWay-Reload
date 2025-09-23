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

    IF col_type IN ('smallint','integer') THEN
        RAISE NOTICE 'Converting numeric action_type to textual enum names...';

        -- Cleanup any previous temp columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_action_logs' AND column_name='action_type_new') THEN
            ALTER TABLE admin_action_logs DROP COLUMN action_type_new;
        END IF;

        ALTER TABLE admin_action_logs ADD COLUMN action_type_new varchar(50);

        UPDATE admin_action_logs
        SET action_type_new = CASE action_type
            WHEN 0 THEN 'CHANGE_ROLE'
            WHEN 1 THEN 'BAN_USER'
            WHEN 2 THEN 'UNBAN_USER'
            ELSE 'CHANGE_ROLE' -- fallback for unexpected
        END;

        -- Drop indexes referencing old column if any
        FOR col_type IN SELECT indexname FROM pg_indexes WHERE tablename='admin_action_logs' AND indexdef ILIKE '%(action_type)%' LOOP
            EXECUTE format('DROP INDEX IF EXISTS %I', col_type);
        END LOOP;

        ALTER TABLE admin_action_logs RENAME COLUMN action_type TO action_type_old_num;
        ALTER TABLE admin_action_logs RENAME COLUMN action_type_new TO action_type;
        ALTER TABLE admin_action_logs ALTER COLUMN action_type SET NOT NULL;
        ALTER TABLE admin_action_logs DROP COLUMN action_type_old_num;

        RAISE NOTICE 'Numeric -> textual conversion finished.';

    ELSIF col_type = 'character varying' THEN
        -- Replace any lingering numeric strings '0','1','2'
        IF EXISTS (SELECT 1 FROM admin_action_logs WHERE action_type IN ('0','1','2')) THEN
            RAISE NOTICE 'Normalizing textual column containing numeric remnants...';
            UPDATE admin_action_logs
            SET action_type = CASE action_type
                WHEN '0' THEN 'CHANGE_ROLE'
                WHEN '1' THEN 'BAN_USER'
                WHEN '2' THEN 'UNBAN_USER'
                ELSE action_type
            END
            WHERE action_type IN ('0','1','2');
        ELSE
            RAISE NOTICE 'action_type already clean textual.';
        END IF;
    ELSE
        RAISE NOTICE 'Unhandled action_type data type: %', col_type;
    END IF;
END $$;
