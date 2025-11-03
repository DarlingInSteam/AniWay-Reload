-- Migration: add manga characters support
-- Creates table manga_characters to store character bios linked to manga titles

CREATE TABLE IF NOT EXISTS manga_characters (
    id BIGSERIAL PRIMARY KEY,
    manga_id BIGINT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    name_primary VARCHAR(255) NOT NULL,
    name_secondary VARCHAR(255),
    description TEXT,
    image_url VARCHAR(512),
    strength VARCHAR(255),
    affiliation VARCHAR(255),
    gender VARCHAR(64),
    age VARCHAR(64),
    classification VARCHAR(255),
    skills TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_by BIGINT,
    approved_by BIGINT,
    rejected_by BIGINT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_manga_characters_manga ON manga_characters(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_characters_status ON manga_characters(status);
CREATE INDEX IF NOT EXISTS idx_manga_characters_manga_status ON manga_characters(manga_id, status);
