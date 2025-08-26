-- ImageStorageService Database Schema

CREATE TABLE IF NOT EXISTS chapter_images (
    id BIGSERIAL PRIMARY KEY,
    manga_id BIGINT, -- Может быть NULL для обложек (пока не привязываем к манге)
    chapter_id BIGINT NOT NULL, -- Используем -1 для обложек
    page_number INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    minio_object_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, page_number) -- Уникальность по главе и странице (включая обложки с chapter_id = -1)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chapter_images_manga_chapter ON chapter_images(manga_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_images_minio_object ON chapter_images(minio_object_name);
CREATE INDEX IF NOT EXISTS idx_chapter_images_covers ON chapter_images(chapter_id) WHERE chapter_id = -1; -- Индекс для обложек
