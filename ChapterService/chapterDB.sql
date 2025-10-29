-- ChapterService Database Schema

CREATE TABLE IF NOT EXISTS chapter (
    id BIGSERIAL PRIMARY KEY,
    manga_id BIGINT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    page_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    published_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    melon_chapter_id VARCHAR(191),

    -- Ensure unique chapter numbers per manga
    UNIQUE(manga_id, chapter_number),
    UNIQUE(manga_id, melon_chapter_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chapter_manga_id ON chapter(manga_id);
CREATE INDEX IF NOT EXISTS idx_chapter_number ON chapter(chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapter_melon_id ON chapter(melon_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_published_date ON chapter(published_date);

-- Table for chapter likes
CREATE TABLE IF NOT EXISTS chapter_like (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chapter_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one like per user per chapter
    UNIQUE(user_id, chapter_id),

    -- Foreign key to chapter
    FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE
);

-- Indexes for chapter_like
CREATE INDEX IF NOT EXISTS idx_chapter_like_user_id ON chapter_like(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_like_chapter_id ON chapter_like(chapter_id);
