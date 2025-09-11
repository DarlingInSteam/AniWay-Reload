-- MangaService Database Schema

CREATE TABLE IF NOT EXISTS manga (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    artist VARCHAR(255),
    release_date DATE,
    status VARCHAR(50) DEFAULT 'ONGOING', -- ONGOING, COMPLETED, HIATUS, CANCELLED
    genre VARCHAR(500), -- JSON array as string for simplicity
    cover_image_url VARCHAR(500),
    total_chapters INTEGER DEFAULT 0,
    views BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_manga_title ON manga(title);
CREATE INDEX IF NOT EXISTS idx_manga_status ON manga(status);
CREATE INDEX IF NOT EXISTS idx_manga_created_at ON manga(created_at);
