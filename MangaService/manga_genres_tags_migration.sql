-- Создание таблицы жанров
CREATE TABLE IF NOT EXISTS genres (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    slug VARCHAR(100) NOT NULL UNIQUE,
    manga_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы тегов
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    slug VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    manga_count INTEGER NOT NULL DEFAULT 0,
    popularity_score INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы связей между мангой и жанрами
CREATE TABLE IF NOT EXISTS manga_genres (
    manga_id BIGINT NOT NULL,
    genre_id BIGINT NOT NULL,
    PRIMARY KEY (manga_id, genre_id),
    FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- Создание таблицы связей между мангой и тегами
CREATE TABLE IF NOT EXISTS manga_tags (
    manga_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (manga_id, tag_id),
    FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Переименование поля tags в таблице manga для избежания конфликтов
ALTER TABLE manga RENAME COLUMN tags TO tags_string;

-- Создание индексов для оптимизации производительности
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug);
CREATE INDEX IF NOT EXISTS idx_genres_manga_count ON genres(manga_count DESC);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(is_active);
CREATE INDEX IF NOT EXISTS idx_tags_popularity ON tags(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_tags_manga_count ON tags(manga_count DESC);

CREATE INDEX IF NOT EXISTS idx_manga_genres_manga_id ON manga_genres(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_genres_genre_id ON manga_genres(genre_id);

CREATE INDEX IF NOT EXISTS idx_manga_tags_manga_id ON manga_tags(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_tags_tag_id ON manga_tags(tag_id);

-- Создание триггера для автоматического обновления updated_at в таблице genres
CREATE OR REPLACE FUNCTION update_genres_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_genres_updated_at
    BEFORE UPDATE ON genres
    FOR EACH ROW
    EXECUTE FUNCTION update_genres_updated_at();

-- Создание триггера для автоматического обновления updated_at в таблице tags
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tags_updated_at();