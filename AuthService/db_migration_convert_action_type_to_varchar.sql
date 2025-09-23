-- Converts legacy smallint-based ordinal action_type column to varchar textual enum names
-- Safe to run multiple times: checks data types / values first.
-- Enum mapping (existing ordinal -> name):
-- 0 -> CHANGE_ROLE
-- 1 -> BAN_USER
-- 2 -> UNBAN_USER

DO $$
DECLARE
    col_type TEXT;
    needs_alter BOOLEAN := FALSE;
    needs_update BOOLEAN := FALSE;
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
        needs_alter := TRUE;
        needs_update := TRUE; -- numeric values need mapping after alter
    ELSIF col_type = 'character varying' THEN
        IF EXISTS (SELECT 1 FROM admin_action_logs WHERE action_type ~ '^[0-9]+$') THEN
            needs_update := TRUE; -- numeric strings remain
        END IF;
    END IF;

    IF needs_alter THEN
        RAISE NOTICE 'Altering action_type column type to varchar(50)...';
        ALTER TABLE admin_action_logs
            ALTER COLUMN action_type TYPE varchar(50)
            USING action_type::text; -- cast numbers to text
    END IF;

    IF needs_update THEN
        RAISE NOTICE 'Updating action_type values (ordinals -> enum names)...';
        UPDATE admin_action_logs
        SET action_type = CASE action_type
            WHEN '0' THEN 'CHANGE_ROLE'
            WHEN '1' THEN 'BAN_USER'
            WHEN '2' THEN 'UNBAN_USER'
            WHEN 'CHANGE_ROLE' THEN 'CHANGE_ROLE'
            WHEN 'BAN_USER' THEN 'BAN_USER'
            WHEN 'UNBAN_USER' THEN 'UNBAN_USER'
            ELSE action_type -- leave unknowns untouched
        END
        WHERE action_type IN ('0','1','2','CHANGE_ROLE','BAN_USER','UNBAN_USER');
    END IF;

    IF NOT needs_alter AND NOT needs_update THEN
        RAISE NOTICE 'No changes required for action_type.';
    ELSE
        RAISE NOTICE 'action_type migration step complete.';
    END IF;
END $$;
