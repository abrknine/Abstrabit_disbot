import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type pg from "pg";
import { dbLogger } from "../../utils/logger";
import type {
  CommandConfig,
  InteractionRecord,
  InteractionRepository,
  InteractionStats,
  MirrorStatus,
  StoredInteraction,
} from "./interaction-repository";

const INTERACTION_COLUMNS = `
  interaction_id   AS "interactionId",
  guild_id         AS "guildId",
  channel_id       AS "channelId",
  user_id          AS "userId",
  username,
  command,
  options,
  response_summary AS "responseSummary",
  mirror_status    AS "mirrorStatus",
  mirror_error     AS "mirrorError",
  created_at       AS "createdAt"`;

const CONFIG_COLUMNS = `
  command,
  enabled,
  mirror_enabled AS "mirrorEnabled",
  reply_template AS "replyTemplate",
  updated_at     AS "updatedAt"`;

export class PgInteractionRepository implements InteractionRepository {
  constructor(private readonly pool: pg.Pool) {}

  async init(): Promise<void> {
    const dir = path.join(process.cwd(), "migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await this.pool.query(readFileSync(path.join(dir, file), "utf-8"));
    }
    dbLogger.info("database schema ensured");
  }

  async recordIfNew(record: InteractionRecord): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO interactions
         (interaction_id, guild_id, channel_id, user_id, username, command, options, response_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (interaction_id) DO NOTHING`,
      [
        record.interactionId,
        record.guildId,
        record.channelId,
        record.userId,
        record.username,
        record.command,
        JSON.stringify(record.options),
        record.responseSummary ?? null,
      ]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateMirrorStatus(interactionId: string, status: MirrorStatus, error?: string): Promise<void> {
    await this.pool.query(
      `UPDATE interactions SET mirror_status = $2, mirror_error = $3 WHERE interaction_id = $1`,
      [interactionId, status, error ?? null]
    );
  }

  async countByCommand(guildId: string, command: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM interactions WHERE guild_id = $1 AND command = $2`,
      [guildId, command]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listRecent(opts: { limit: number; command?: string; guildId?: string }): Promise<StoredInteraction[]> {
    const result = await this.pool.query<StoredInteraction>(
      `SELECT ${INTERACTION_COLUMNS}
       FROM interactions
       WHERE ($2::text IS NULL OR command = $2)
         AND ($3::text IS NULL OR guild_id = $3)
       ORDER BY created_at DESC
       LIMIT $1`,
      [opts.limit, opts.command ?? null, opts.guildId ?? null]
    );
    return result.rows;
  }

  async getStats(): Promise<InteractionStats> {
    const totals = await this.pool.query<{ command: string; count: string }>(
      `SELECT command, COUNT(*) AS count FROM interactions GROUP BY command`
    );
    const failed = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM interactions WHERE mirror_status = 'failed'`
    );
    const byCommand = Object.fromEntries(totals.rows.map((r) => [r.command, Number(r.count)]));
    return {
      total: Object.values(byCommand).reduce((a, b) => a + b, 0),
      byCommand,
      mirrorFailed: Number(failed.rows[0]?.count ?? 0),
    };
  }

  async listConfig(): Promise<CommandConfig[]> {
    const result = await this.pool.query<CommandConfig>(
      `SELECT ${CONFIG_COLUMNS} FROM command_config ORDER BY command`
    );
    return result.rows;
  }

  async getConfig(command: string): Promise<CommandConfig | null> {
    const result = await this.pool.query<CommandConfig>(
      `SELECT ${CONFIG_COLUMNS} FROM command_config WHERE command = $1`,
      [command]
    );
    return result.rows[0] ?? null;
  }

  async upsertConfig(config: Omit<CommandConfig, "updatedAt">): Promise<CommandConfig> {
    const result = await this.pool.query<CommandConfig>(
      `INSERT INTO command_config (command, enabled, mirror_enabled, reply_template, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (command) DO UPDATE
         SET enabled = $2, mirror_enabled = $3, reply_template = $4, updated_at = now()
       RETURNING ${CONFIG_COLUMNS}`,
      [config.command, config.enabled, config.mirrorEnabled, config.replyTemplate]
    );
    return result.rows[0];
  }
}
