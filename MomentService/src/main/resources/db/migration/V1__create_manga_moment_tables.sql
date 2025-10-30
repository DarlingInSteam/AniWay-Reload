CREATE TABLE IF NOT EXISTS manga_moments (
    id BIGSERIAL PRIMARY KEY,
    manga_id BIGINT NOT NULL,
    chapter_id BIGINT,
    page_number INTEGER,
    uploader_id BIGINT NOT NULL,
    image_url VARCHAR(1024) NOT NULL,
    image_key VARCHAR(512) NOT NULL,
    image_width INTEGER NOT NULL,
    image_height INTEGER NOT NULL,
    file_size BIGINT NOT NULL,
    caption VARCHAR(280) NOT NULL,
    is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    is_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_by BIGINT,
    hidden_reason VARCHAR(512),
    is_reported BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    likes_count_7d INTEGER NOT NULL DEFAULT 0,
    dislikes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    comments_count_7d INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manga_moment_reactions (
    id BIGSERIAL PRIMARY KEY,
    moment_id BIGINT NOT NULL REFERENCES manga_moments (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    reaction VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_manga_moment_reaction_type CHECK (reaction IN ('LIKE', 'DISLIKE')),
    CONSTRAINT uq_manga_moment_reaction UNIQUE (moment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_manga_moments_manga_created_at ON manga_moments (manga_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manga_moments_manga_likes ON manga_moments (manga_id, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_manga_moments_uploader_created_at ON manga_moments (uploader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manga_moments_manga_activity ON manga_moments (manga_id, last_activity_at DESC);
