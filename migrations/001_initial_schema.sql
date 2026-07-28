CREATE TABLE IF NOT EXISTS interactions (
    id              BIGSERIAL PRIMARY KEY,
    interaction_id  TEXT        NOT NULL UNIQUE,
    guild_id        TEXT        NOT NULL,
    channel_id      TEXT,
    user_id         TEXT        NOT NULL,
    username        TEXT        NOT NULL,
    command         TEXT        NOT NULL,
    options         JSONB       NOT NULL DEFAULT '{}',
    response_summary TEXT,
    mirror_status   TEXT        NOT NULL DEFAULT 'pending',
    mirror_error    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_guild_created
    ON interactions (guild_id, created_at DESC);
