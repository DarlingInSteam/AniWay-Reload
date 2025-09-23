-- Manual migration script: add ban fields to users and structured reason fields to admin_action_logs
-- Adjust types if using a different RDBMS than assumed (MySQL/InnoDB typical)

ALTER TABLE users
    ADD COLUMN ban_type VARCHAR(16) NOT NULL DEFAULT 'NONE',
    ADD COLUMN ban_expires_at DATETIME NULL,
    ADD COLUMN token_version INT NOT NULL DEFAULT 0;

ALTER TABLE admin_action_logs
    ADD COLUMN reason_code VARCHAR(128) NULL,
    ADD COLUMN reason_details TEXT NULL,
    ADD COLUMN meta_json TEXT NULL,
    ADD COLUMN diff_json TEXT NULL;

-- Optional: backfill existing rows
UPDATE users SET ban_type = 'NONE' WHERE ban_type IS NULL;
