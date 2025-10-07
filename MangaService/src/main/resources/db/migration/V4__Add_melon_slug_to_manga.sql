-- Add column to store the original Melon slug for each manga
ALTER TABLE manga ADD COLUMN melon_slug VARCHAR(255);

-- Enforce uniqueness for non-null slugs to prevent duplicates
ALTER TABLE manga ADD CONSTRAINT uk_manga_melon_slug UNIQUE (melon_slug);

-- Create an index to speed up lookups by slug
CREATE INDEX idx_manga_melon_slug ON manga(melon_slug);
