-- Migration: extend manga_characters with image metadata columns
ALTER TABLE manga_characters
    ADD COLUMN IF NOT EXISTS image_object_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS image_width INTEGER,
    ADD COLUMN IF NOT EXISTS image_height INTEGER,
    ADD COLUMN IF NOT EXISTS image_size_bytes BIGINT;
