-- ImageStorageService Database Schema

CREATE TABLE IF NOT EXISTS chapter_image (
    id BIGSERIAL PRIMARY KEY,
    chapter_id BIGINT NOT NULL,
    page_number INTEGER NOT NULL,
    image_url VARCHAR(500) NOT NULL, -- MinIO URL
    image_key VARCHAR(255) NOT NULL, -- MinIO object key
    file_size BIGINT,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique page numbers per chapter
    UNIQUE(chapter_id, page_number)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chapter_image_chapter_id ON chapter_image(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_image_page_number ON chapter_image(page_number);
CREATE INDEX IF NOT EXISTS idx_chapter_image_key ON chapter_image(image_key);
