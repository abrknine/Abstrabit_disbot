CREATE TABLE IF NOT EXISTS command_config (
    command        TEXT PRIMARY KEY,
    enabled        BOOLEAN     NOT NULL DEFAULT true,
    mirror_enabled BOOLEAN     NOT NULL DEFAULT true,
    reply_template TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO command_config (command) VALUES ('report'), ('status')
ON CONFLICT (command) DO NOTHING;
