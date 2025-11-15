-- Таблица предложений похожих манг
CREATE TABLE similar_manga_suggestions (
    id BIGSERIAL PRIMARY KEY,
    source_manga_id BIGINT NOT NULL,        -- Исходный тайтл
    target_manga_id BIGINT NOT NULL,        -- Предложенный похожий тайтл
    suggested_by_user_id BIGINT NOT NULL,   -- Кто предложил
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_manga_id, target_manga_id)
);

-- Таблица голосов за предложения
CREATE TABLE similar_manga_votes (
    id BIGSERIAL PRIMARY KEY,
    suggestion_id BIGINT NOT NULL REFERENCES similar_manga_suggestions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE')),
    voted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(suggestion_id, user_id)
);

-- Локальная таблица манг (синхронизируется через события)
CREATE TABLE manga_metadata (
    manga_id BIGINT PRIMARY KEY,
);

-- Локальная таблица пользовательских предпочтений
CREATE TABLE user_preference_profiles (
    user_id BIGINT PRIMARY KEY,
    genre_weights JSONB,
    tag_weights JSONB,
    genre_frequency JSONB,
    tag_frequency JSONB,
    total_manga_count INTEGER,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Материализованное представление для рейтингов похожих манг
CREATE MATERIALIZED VIEW similar_manga_ratings AS
SELECT
    s.id AS suggestion_id,
    s.source_manga_id,
    s.target_manga_id,
    COUNT(CASE WHEN v.vote_type = 'UPVOTE' THEN 1 END) AS upvotes,
    COUNT(CASE WHEN v.vote_type = 'DOWNVOTE' THEN 1 END) AS downvotes,
    COUNT(CASE WHEN v.vote_type = 'UPVOTE' THEN 1 END) -
    COUNT(CASE WHEN v.vote_type = 'DOWNVOTE' THEN 1 END) AS rating
FROM similar_manga_suggestions s
LEFT JOIN similar_manga_votes v ON s.id = v.suggestion_id
GROUP BY s.id, s.source_manga_id, s.target_manga_id;

-- Индексы для оптимизации производительности
CREATE INDEX idx_similar_ratings_source ON similar_manga_ratings(source_manga_id, rating DESC);
CREATE INDEX idx_manga_metadata_genres ON manga_metadata USING GIN (genres);
CREATE INDEX idx_manga_metadata_tags ON manga_metadata USING GIN (tags);
CREATE INDEX idx_user_preference_profiles_user ON user_preference_profiles(user_id); -- ИСПРАВЛЕНО
CREATE INDEX idx_user_bookmarks_user ON user_bookmarks(user_id); -- ДОБАВЛЕНО
CREATE INDEX idx_user_bookmarks_manga ON user_bookmarks(manga_id); -- ДОБАВЛЕНО
CREATE INDEX idx_similar_suggestions_source ON similar_manga_suggestions(source_manga_id);
CREATE INDEX idx_similar_votes_suggestion ON similar_manga_votes(suggestion_id);
