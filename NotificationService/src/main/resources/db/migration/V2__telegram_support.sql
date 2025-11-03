CREATE TABLE IF NOT EXISTS telegram_notification_log (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT,
    user_id BIGINT NOT NULL,
    chat_id BIGINT,
    manga_id BIGINT,
    chapter_id BIGINT,
    status VARCHAR(20) NOT NULL,
    error_code VARCHAR(64),
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    payload TEXT,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_log_user ON telegram_notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_log_chapter ON telegram_notification_log(chapter_id);
CREATE INDEX IF NOT EXISTS idx_tg_log_status ON telegram_notification_log(status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tg_log_user_chapter ON telegram_notification_log(user_id, chapter_id) WHERE chapter_id IS NOT NULL;
