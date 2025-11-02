-- MangaService Database Schema

-- Drop table if exists to ensure clean slate
DROP TABLE IF EXISTS manga;

CREATE TABLE manga (
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
    -- Новые поля для сортировки
    rating DECIMAL(3,2) DEFAULT 0.0, -- Средний рейтинг (0.0 - 10.0)
    rating_count INTEGER DEFAULT 0, -- Количество оценок
    likes BIGINT DEFAULT 0, -- Общее количество лайков к главам
    reviews INTEGER DEFAULT 0, -- Количество отзывов
    comments INTEGER DEFAULT 0, -- Количество комментариев
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_manga_title ON manga(title);
CREATE INDEX IF NOT EXISTS idx_manga_status ON manga(status);
CREATE INDEX IF NOT EXISTS idx_manga_created_at ON manga(created_at);
-- Новые индексы для сортировки
CREATE INDEX IF NOT EXISTS idx_manga_views ON manga(views);
CREATE INDEX IF NOT EXISTS idx_manga_rating ON manga(rating);
CREATE INDEX IF NOT EXISTS idx_manga_rating_count ON manga(rating_count);
CREATE INDEX IF NOT EXISTS idx_manga_likes ON manga(likes);
CREATE INDEX IF NOT EXISTS idx_manga_reviews ON manga(reviews);
CREATE INDEX IF NOT EXISTS idx_manga_comments ON manga(comments);
CREATE INDEX IF NOT EXISTS idx_manga_updated_at ON manga(updated_at);

-- Characters linked to manga titles
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
