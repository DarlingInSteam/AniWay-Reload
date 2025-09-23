-- Forum Service Database Schema
-- Соответствует FORUM_SERVICE_TZ.md
-- PostgreSQL 15+

-- Включаем расширения для full-text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================
-- ОСНОВНЫЕ ТАБЛИЦЫ
-- ================================

-- 1. Категории форума
CREATE TABLE forum_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- название иконки (lucide/fontawesome)
    color VARCHAR(7), -- hex цвет (#FF5733)
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Темы форума (треды)
CREATE TABLE forum_threads (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    
    -- Статистика
    views_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    
    -- Модерация
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    
    -- Связанная манга (опционально)
    manga_id BIGINT NULL,
    
    -- Временные метки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reply_at TIMESTAMP NULL,
    last_reply_user_id BIGINT NULL,
    
    -- Связи
    FOREIGN KEY (category_id) REFERENCES forum_categories(id)
    -- author_id ссылается на users из AuthService (внешняя связь)
);

-- 3. Сообщения в темах
CREATE TABLE forum_posts (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    author_id BIGINT NOT NULL,
    
    -- Иерархия (для ответов на посты)
    parent_post_id BIGINT NULL,
    
    -- Модерация
    is_deleted BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    
    -- Реакции
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    
    -- Временные метки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Связи
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
    -- author_id ссылается на users из AuthService (внешняя связь)
);

-- 4. Реакции (лайки/дизлайки)
CREATE TABLE forum_reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(20) NOT NULL, -- 'THREAD', 'POST'
    target_id BIGINT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL, -- 'LIKE', 'DISLIKE'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальность: один пользователь - одна реакция на объект
    UNIQUE(user_id, target_type, target_id)
    -- user_id ссылается на users из AuthService (внешняя связь)
);

-- 5. Просмотры тем
CREATE TABLE forum_thread_views (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    user_id BIGINT NULL, -- NULL для анонимных пользователей
    ip_address INET NULL, -- для анонимных пользователей
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
    -- user_id ссылается на users из AuthService (внешняя связь)
);

-- 6. Подписки на темы
CREATE TABLE forum_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    thread_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальность: один пользователь - одна подписка на тему
    UNIQUE(user_id, thread_id),
    
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE
    -- user_id ссылается на users из AuthService (внешняя связь)
);

-- ================================
-- ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ
-- ================================

-- 7. Уведомления форума
CREATE TABLE forum_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'NEW_REPLY', 'THREAD_LIKED', 'POST_MENTIONED', etc.
    thread_id BIGINT NULL,
    post_id BIGINT NULL,
    triggered_by_user_id BIGINT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
    -- user_id, triggered_by_user_id ссылаются на users из AuthService
);

-- 8. Теги для тем
CREATE TABLE forum_tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6B7280', -- серый по умолчанию
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Связь тем и тегов
CREATE TABLE forum_thread_tags (
    thread_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    
    PRIMARY KEY (thread_id, tag_id),
    FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES forum_tags(id) ON DELETE CASCADE
);

-- 10. Статистика форума
CREATE TABLE forum_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_threads_count INTEGER DEFAULT 0,
    total_posts_count INTEGER DEFAULT 0,
    total_users_count INTEGER DEFAULT 0,
    total_views_count INTEGER DEFAULT 0,
    active_users_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ================================

-- Категории
CREATE INDEX idx_forum_categories_active_order ON forum_categories(is_active, display_order);

-- Темы
CREATE INDEX idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX idx_forum_threads_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned, last_activity_at DESC);
CREATE INDEX idx_forum_threads_manga ON forum_threads(manga_id) WHERE manga_id IS NOT NULL;
CREATE INDEX idx_forum_threads_deleted ON forum_threads(is_deleted) WHERE is_deleted = FALSE;

-- Посты
CREATE INDEX idx_forum_posts_thread ON forum_posts(thread_id, created_at);
CREATE INDEX idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_parent ON forum_posts(parent_post_id);
CREATE INDEX idx_forum_posts_deleted ON forum_posts(is_deleted) WHERE is_deleted = FALSE;

-- Реакции
CREATE INDEX idx_forum_reactions_target ON forum_reactions(target_type, target_id);
CREATE INDEX idx_forum_reactions_user ON forum_reactions(user_id);

-- Просмотры
CREATE INDEX idx_forum_views_thread ON forum_thread_views(thread_id);
CREATE INDEX idx_forum_views_user ON forum_thread_views(user_id);
CREATE INDEX idx_forum_views_ip ON forum_thread_views(ip_address);

-- Подписки
CREATE INDEX idx_forum_subscriptions_user ON forum_subscriptions(user_id);
CREATE INDEX idx_forum_subscriptions_thread ON forum_subscriptions(thread_id);
CREATE INDEX idx_forum_subscriptions_active ON forum_subscriptions(is_active) WHERE is_active = TRUE;

-- Уведомления
CREATE INDEX idx_forum_notifications_user ON forum_notifications(user_id, is_read);
CREATE INDEX idx_forum_notifications_thread ON forum_notifications(thread_id);

-- Теги
CREATE INDEX idx_forum_tags_name ON forum_tags(name);
CREATE INDEX idx_forum_thread_tags_thread ON forum_thread_tags(thread_id);
CREATE INDEX idx_forum_thread_tags_tag ON forum_thread_tags(tag_id);

-- ================================
-- ПОЛНОТЕКСТОВЫЙ ПОИСК
-- ================================

-- Добавляем поля для поиска
ALTER TABLE forum_threads ADD COLUMN search_vector tsvector;
ALTER TABLE forum_posts ADD COLUMN search_vector tsvector;

-- Индексы для поиска
CREATE INDEX idx_forum_threads_search ON forum_threads USING gin(search_vector);
CREATE INDEX idx_forum_posts_search ON forum_posts USING gin(search_vector);

-- Функция обновления search_vector для тем
CREATE OR REPLACE FUNCTION update_forum_threads_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция обновления search_vector для постов
CREATE OR REPLACE FUNCTION update_forum_posts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления
CREATE TRIGGER trigger_forum_threads_search_vector
    BEFORE INSERT OR UPDATE ON forum_threads
    FOR EACH ROW EXECUTE FUNCTION update_forum_threads_search_vector();

CREATE TRIGGER trigger_forum_posts_search_vector
    BEFORE INSERT OR UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_forum_posts_search_vector();

-- ================================
-- ПРЕДУСТАНОВЛЕННЫЕ ДАННЫЕ
-- ================================

-- Базовые категории форума
INSERT INTO forum_categories (name, description, icon, color, display_order) VALUES
('Обсуждение манги', 'Общие обсуждения тайтлов, рекомендации и обзоры', 'book-open', '#3B82F6', 1),
('Предложения', 'Идеи новых функций и улучшений платформы', 'lightbulb', '#10B981', 2),
('Баги и проблемы', 'Технические вопросы и сообщения об ошибках', 'bug', '#EF4444', 3),
('Объявления', 'Новости от администрации и важные обновления', 'megaphone', '#8B5CF6', 4),
('Общение', 'Свободное общение и знакомства', 'message-circle', '#F59E0B', 5);

-- Базовые теги
INSERT INTO forum_tags (name, color) VALUES
('новичок', '#10B981'),
('помощь', '#3B82F6'),
('обсуждение', '#6B7280'),
('предложение', '#F59E0B'),
('баг', '#EF4444'),
('решено', '#10B981'),
('важно', '#8B5CF6');

-- ================================
-- ФУНКЦИИ ОБНОВЛЕНИЯ СЧЕТЧИКОВ
-- ================================

-- Функция обновления счетчика ответов в теме
CREATE OR REPLACE FUNCTION update_thread_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_threads 
        SET replies_count = replies_count + 1,
            last_activity_at = NEW.created_at,
            last_reply_at = NEW.created_at,
            last_reply_user_id = NEW.author_id
        WHERE id = NEW.thread_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_threads 
        SET replies_count = replies_count - 1
        WHERE id = OLD.thread_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Функция обновления счетчика лайков
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'THREAD' THEN
            IF NEW.reaction_type = 'LIKE' THEN
                UPDATE forum_threads SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
            END IF;
        ELSIF NEW.target_type = 'POST' THEN
            IF NEW.reaction_type = 'LIKE' THEN
                UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
            ELSIF NEW.reaction_type = 'DISLIKE' THEN
                UPDATE forum_posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.target_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'THREAD' THEN
            IF OLD.reaction_type = 'LIKE' THEN
                UPDATE forum_threads SET likes_count = likes_count - 1 WHERE id = OLD.target_id;
            END IF;
        ELSIF OLD.target_type = 'POST' THEN
            IF OLD.reaction_type = 'LIKE' THEN
                UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.target_id;
            ELSIF OLD.reaction_type = 'DISLIKE' THEN
                UPDATE forum_posts SET dislikes_count = dislikes_count - 1 WHERE id = OLD.target_id;
            END IF;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Обработка изменения типа реакции
        IF OLD.target_type = 'THREAD' THEN
            IF OLD.reaction_type = 'LIKE' THEN
                UPDATE forum_threads SET likes_count = likes_count - 1 WHERE id = OLD.target_id;
            END IF;
            IF NEW.reaction_type = 'LIKE' THEN
                UPDATE forum_threads SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
            END IF;
        ELSIF OLD.target_type = 'POST' THEN
            IF OLD.reaction_type = 'LIKE' THEN
                UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.target_id;
            ELSIF OLD.reaction_type = 'DISLIKE' THEN
                UPDATE forum_posts SET dislikes_count = dislikes_count - 1 WHERE id = OLD.target_id;
            END IF;
            IF NEW.reaction_type = 'LIKE' THEN
                UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
            ELSIF NEW.reaction_type = 'DISLIKE' THEN
                UPDATE forum_posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.target_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления счетчиков
CREATE TRIGGER trigger_forum_posts_replies_count
    AFTER INSERT OR DELETE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_thread_replies_count();

CREATE TRIGGER trigger_forum_reactions_likes_count
    AFTER INSERT OR UPDATE OR DELETE ON forum_reactions
    FOR EACH ROW EXECUTE FUNCTION update_likes_count();