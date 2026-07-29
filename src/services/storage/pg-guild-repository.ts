import type pg from "pg";
import type { Guild, GuildRepository } from "./guild-repository";

const GUILD_COLUMNS = `
  guild_id           AS "guildId",
  name,
  icon,
  mirror_channel_id  AS "mirrorChannelId",
  mirror_webhook_url AS "mirrorWebhookUrl",
  connected_at       AS "connectedAt"`;

export class PgGuildRepository implements GuildRepository {
  constructor(private readonly pool: pg.Pool) {}

  async upsert(guild: { guildId: string; name: string; icon: string | null }): Promise<void> {
    await this.pool.query(
      `INSERT INTO guilds (guild_id, name, icon)
       VALUES ($1, $2, $3)
       ON CONFLICT (guild_id) DO UPDATE SET name = $2, icon = $3, updated_at = now()`,
      [guild.guildId, guild.name, guild.icon]
    );
  }

  async findById(guildId: string): Promise<Guild | null> {
    const result = await this.pool.query<Guild>(
      `SELECT ${GUILD_COLUMNS} FROM guilds WHERE guild_id = $1`,
      [guildId]
    );
    return result.rows[0] ?? null;
  }

  async list(): Promise<Guild[]> {
    const result = await this.pool.query<Guild>(
      `SELECT ${GUILD_COLUMNS} FROM guilds ORDER BY connected_at DESC`
    );
    return result.rows;
  }

  async setMirror(guildId: string, channelId: string, webhookUrl: string): Promise<void> {
    await this.pool.query(
      `UPDATE guilds SET mirror_channel_id = $2, mirror_webhook_url = $3, updated_at = now()
       WHERE guild_id = $1`,
      [guildId, channelId, webhookUrl]
    );
  }
}
