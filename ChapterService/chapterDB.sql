-- ChapterService Database Schema

CREATE TABLE IF NOT EXISTS chapter (
    id BIGSERIAL PRIMARY KEY,
    manga_id BIGINT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    page_count INTEGER DEFAULT 0,
    published_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique chapter numbers per manga
    UNIQUE(manga_id, chapter_number)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chapter_manga_id ON chapter(manga_id);
CREATE INDEX IF NOT EXISTS idx_chapter_number ON chapter(chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapter_published_date ON chapter(published_date);
