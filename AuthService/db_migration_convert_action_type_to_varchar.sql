-- Converts legacy smallint-based ordinal action_type column to varchar textual enum names
-- Safe to run multiple times: checks data types / values first.
-- Enum mapping (existing ordinal -> name):
-- 0 -> CHANGE_ROLE
-- 1 -> BAN_USER
-- 2 -> UNBAN_USER

DO $$
DECLARE
    col_type TEXT;
    needs_change BOOLEAN := FALSE;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'admin_action_logs'
      AND column_name = 'action_type';

    -- If column missing, nothing to do
    IF NOT FOUND THEN
        RAISE NOTICE 'Column action_type not found, skipping.';
        RETURN;
    END IF;

    -- Determine if conversion required
    IF col_type IN ('smallint','integer') THEN
        needs_change := TRUE;
    ELSIF col_type = 'character varying' THEN
        -- Already varchar: verify if any purely numeric strings remain and convert them
        IF EXISTS (SELECT 1 FROM admin_action_logs WHERE action_type ~ '^[0-9]+$') THEN
            needs_change := TRUE;
        END IF;
    END IF;

    IF needs_change THEN
        RAISE NOTICE 'Converting action_type ordinals to textual enum names...';

        -- Normalize any integer typed column to integer semantics via casting in update
        UPDATE admin_action_logs
        SET action_type = CASE
            WHEN action_type::text IN ('0','CHANGE_ROLE') THEN 'CHANGE_ROLE'
            WHEN action_type::text IN ('1','BAN_USER') THEN 'BAN_USER'
            WHEN action_type::text IN ('2','UNBAN_USER') THEN 'UNBAN_USER'
            ELSE action_type::text -- leave unknowns as-is for manual review
        END;

        -- If original underlying type not varchar, alter type
        IF col_type IN ('smallint','integer') THEN
            ALTER TABLE admin_action_logs
                ALTER COLUMN action_type TYPE varchar(50)
                USING action_type::text;
        END IF;

        -- Optional: enforce NOT NULL if expected
        -- ALTER TABLE admin_action_logs ALTER COLUMN action_type SET NOT NULL;

        RAISE NOTICE 'Conversion of action_type completed.';
    ELSE
        RAISE NOTICE 'action_type already textual with no numeric remnants. Skipping.';
    END IF;
END $$;
