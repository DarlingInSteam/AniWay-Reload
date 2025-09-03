-- Comment Service Database Schema

-- Создание таблицы комментариев
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    comment_type VARCHAR(50) NOT NULL, -- MANGA, CHAPTER, PROFILE, REVIEW
    target_id BIGINT NOT NULL, -- ID объекта комментария (manga_id, chapter_id, etc.)
    user_id BIGINT NOT NULL, -- ID пользователя-автора
    parent_comment_id BIGINT, -- Для ответов на комментарии
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Создание таблицы лайков/дизлайков
CREATE TABLE comment_reactions (
    id BIGSERIAL PRIMARY KEY,
    comment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction_type VARCHAR(10) NOT NULL, -- LIKE, DISLIKE
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_comments_type_target ON comments(comment_type, target_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка тестовых данных (опционально)
-- INSERT INTO comments (content, comment_type, target_id, user_id) 
-- VALUES ('Отличная манга!', 'MANGA', 1, 1);

-- INSERT INTO comments (content, comment_type, target_id, user_id, parent_comment_id)
-- VALUES ('Согласен, очень захватывающая!', 'MANGA', 1, 2, 1);
