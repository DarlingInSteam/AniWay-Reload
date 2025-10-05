CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chat_categories (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(80)      NOT NULL,
    slug            VARCHAR(80)      NOT NULL,
    description     VARCHAR(512),
    is_default      BOOLEAN          NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN          NOT NULL DEFAULT FALSE,
    created_by      BIGINT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_chat_categories_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(16)      NOT NULL,
    category_id     BIGINT REFERENCES chat_categories(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_conversations_type CHECK (type IN ('PRIVATE', 'CHANNEL'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id                   BIGSERIAL PRIMARY KEY,
    conversation_id      UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id              BIGINT NOT NULL,
    joined_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_read_message_id UUID,
    last_read_at         TIMESTAMP WITH TIME ZONE,
    muted                BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_conversation_participants_conversation_user UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id      UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id            BIGINT NOT NULL,
    content              VARCHAR(4000) NOT NULL,
    reply_to_message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    edited_at            TIMESTAMP WITH TIME ZONE,
    deleted_at           TIMESTAMP WITH TIME ZONE,
    deleted_by           BIGINT,
    metadata_json        TEXT,
    CONSTRAINT uk_messages_conversation_created_at UNIQUE (conversation_id, created_at, id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at ON messages(sender_id, created_at DESC);

CREATE TABLE IF NOT EXISTS channel_read_markers (
    category_id          BIGINT NOT NULL REFERENCES chat_categories(id) ON DELETE CASCADE,
    user_id              BIGINT NOT NULL,
    last_read_message_id UUID,
    last_read_at         TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (category_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_read_markers_user ON channel_read_markers(user_id);
