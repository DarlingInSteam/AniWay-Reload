-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar VARCHAR(500),
    bio TEXT,
    role VARCHAR(20) DEFAULT 'USER' NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_account_non_expired BOOLEAN DEFAULT TRUE,
    is_account_non_locked BOOLEAN DEFAULT TRUE,
    is_credentials_non_expired BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    chapters_read_count INTEGER DEFAULT 0,
    likes_given_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    manga_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, manga_id)
);

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS reading_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    manga_id BIGINT NOT NULL,
    chapter_id BIGINT NOT NULL,
    chapter_number DOUBLE PRECISION NOT NULL,
    page_number INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chapter_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_manga_id ON bookmarks(manga_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_status ON bookmarks(status);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_manga_id ON reading_progress(manga_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_chapter_id ON reading_progress(chapter_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, display_name, role, chapters_read_count, likes_given_count, comments_count) 
VALUES (
    'admin', 
    'admin@aniway.com', 
    '$2a$10$sF4AXJ1O7jj8bW8mQHvQ/eNvYX5K5fQ5oU8qPz9Zt8cM.vZk9sWqS', 
    'Administrator',
    'ADMIN',
    0, 0, 0
) ON CONFLICT (username) DO NOTHING;
