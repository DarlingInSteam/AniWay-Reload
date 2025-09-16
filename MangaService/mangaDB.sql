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
