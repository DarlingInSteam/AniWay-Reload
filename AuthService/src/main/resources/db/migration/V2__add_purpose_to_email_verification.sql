-- Adds purpose column to email_verification, backfills existing rows as REGISTRATION and creates index
ALTER TABLE email_verification ADD COLUMN IF NOT EXISTS purpose VARCHAR(30);
-- Backfill nulls
UPDATE email_verification SET purpose='REGISTRATION' WHERE purpose IS NULL;
-- Ensure not null constraint (PostgreSQL requires new table rewrite if nulls exist)
ALTER TABLE email_verification ALTER COLUMN purpose SET NOT NULL;
-- Add index if not exists (Postgres 9.5+ supports IF NOT EXISTS for create index concurrently only in newer versions; using DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind='i' AND c.relname='idx_email_verification_purpose'
    ) THEN
        CREATE INDEX idx_email_verification_purpose ON email_verification(purpose);
    END IF;
END$$;
