CREATE TABLE IF NOT EXISTS guilds (
    guild_id           TEXT        PRIMARY KEY,
    name               TEXT        NOT NULL,
    icon               TEXT,
    mirror_channel_id  TEXT,
    mirror_webhook_url TEXT,
    connected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
