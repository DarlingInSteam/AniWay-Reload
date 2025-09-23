-- Migration: normalize timestamp/created_at columns in admin_action_logs
-- Problem observed: inserts fail with "null value in column 'timestamp'" while entity writes to created_at.
-- Root cause: legacy NOT NULL column named "timestamp" still present (or mismatch) after introducing created_at.
-- This script:
-- 1. If only "timestamp" exists -> rename to created_at, add default, backfill.
-- 2. If both exist -> copy data into created_at where null, enforce default, drop legacy "timestamp".
-- 3. If neither exists -> create created_at.
-- 4. If only created_at exists -> ensure default & backfill nulls.
-- Idempotent & safe to re-run.

DO $$
DECLARE
    has_ts BOOLEAN;
    has_created BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='admin_action_logs' AND column_name='timestamp'
    ) INTO has_ts;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='admin_action_logs' AND column_name='created_at'
    ) INTO has_created;

    IF has_ts AND NOT has_created THEN
        -- Legacy only: rename and normalize
        ALTER TABLE admin_action_logs RENAME COLUMN "timestamp" TO created_at;
        ALTER TABLE admin_action_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        UPDATE admin_action_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    ELSIF has_ts AND has_created THEN
        -- Both exist: merge then drop legacy
        UPDATE admin_action_logs SET created_at = COALESCE(created_at, "timestamp");
        ALTER TABLE admin_action_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        UPDATE admin_action_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
        -- Drop legacy column to stop future NOT NULL violations
        ALTER TABLE admin_action_logs DROP COLUMN "timestamp";
    ELSIF NOT has_ts AND NOT has_created THEN
        -- Neither column somehow present: create created_at
        ALTER TABLE admin_action_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        UPDATE admin_action_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    ELSE
        -- Only created_at exists: ensure default & fill nulls
        ALTER TABLE admin_action_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        UPDATE admin_action_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    END IF;
END$$;

-- Verification (run manually):
-- SELECT column_name, is_nullable, column_default FROM information_schema.columns
--  WHERE table_name='admin_action_logs' AND column_name IN ('created_at','timestamp');
-- Expect: only created_at present, with DEFAULT CURRENT_TIMESTAMP and is_nullable = YES/NO (either acceptable if application always sets value).
