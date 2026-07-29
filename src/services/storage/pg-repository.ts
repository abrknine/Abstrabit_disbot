import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type pg from "pg";
import { dbLogger } from "../../utils/logger";
import type {
  CommandConfig,
  InteractionRecord,
  InteractionRepository,
  InteractionStats,
  ListFilters,
  MirrorStatus,
  StoredInteraction,
  TicketCounts,
  TicketStatus,
  Triage,
} from "./interaction-repository";

const INTERACTION_COLUMNS = `
  id,
  interaction_id   AS "interactionId",
  guild_id         AS "guildId",
  channel_id       AS "channelId",
  user_id          AS "userId",
  username,
  command,
  options,
  status,
  claimed_by       AS "claimedBy",
  ai_summary       AS "aiSummary",
  ai_category      AS "aiCategory",
  ai_priority      AS "aiPriority",
  mirror_status    AS "mirrorStatus",
  mirror_error     AS "mirrorError",
  created_at       AS "createdAt"`;

const CONFIG_COLUMNS = `
  command,
  enabled,
  mirror_enabled AS "mirrorEnabled",
  ai_enabled     AS "aiEnabled",
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

  async recordIfNew(record: InteractionRecord): Promise<{ created: boolean; rowId: number }> {
    const inserted = await this.pool.query<{ id: number }>(
      `INSERT INTO interactions
         (interaction_id, guild_id, channel_id, user_id, username, command, options, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (interaction_id) DO NOTHING
       RETURNING id`,
      [
        record.interactionId,
        record.guildId,
        record.channelId,
        record.userId,
        record.username,
        record.command,
        JSON.stringify(record.options),
        record.status,
      ]
    );
    if (inserted.rows[0]) return { created: true, rowId: inserted.rows[0].id };

    const existing = await this.pool.query<{ id: number }>(
      `SELECT id FROM interactions WHERE interaction_id = $1`,
      [record.interactionId]
    );
    return { created: false, rowId: existing.rows[0]?.id ?? 0 };
  }

  async findByInteractionId(interactionId: string): Promise<StoredInteraction | null> {
    const result = await this.pool.query<StoredInteraction>(
      `SELECT ${INTERACTION_COLUMNS} FROM interactions WHERE interaction_id = $1`,
      [interactionId]
    );
    return result.rows[0] ?? null;
  }

  async updateMirrorStatus(interactionId: string, status: MirrorStatus, error?: string): Promise<void> {
    await this.pool.query(
      `UPDATE interactions SET mirror_status = $2, mirror_error = $3 WHERE interaction_id = $1`,
      [interactionId, status, error ?? null]
    );
  }

  async updateTicketTriage(interactionId: string, triage: Triage): Promise<void> {
    await this.pool.query(
      `UPDATE interactions SET ai_summary = $2, ai_category = $3, ai_priority = $4
       WHERE interaction_id = $1`,
      [interactionId, triage.summary, triage.category, triage.priority]
    );
  }

  async updateTicketStatus(interactionId: string, status: TicketStatus, claimedBy?: string): Promise<void> {
    await this.pool.query(
      `UPDATE interactions SET status = $2, claimed_by = COALESCE($3, claimed_by)
       WHERE interaction_id = $1`,
      [interactionId, status, claimedBy ?? null]
    );
  }

  async ticketCounts(guildId: string): Promise<TicketCounts> {
    const result = await this.pool.query<{ status: string; high: string; count: string }>(
      `SELECT status, COUNT(*) FILTER (WHERE ai_priority = 'high') AS high, COUNT(*) AS count
       FROM interactions
       WHERE guild_id = $1 AND status <> 'n/a'
       GROUP BY status`,
      [guildId]
    );
    const byStatus = Object.fromEntries(result.rows.map((r) => [r.status, r]));
    return {
      open: Number(byStatus.open?.count ?? 0),
      inProgress: Number(byStatus.in_progress?.count ?? 0),
      resolved: Number(byStatus.resolved?.count ?? 0),
      highOpen: Number(byStatus.open?.high ?? 0),
    };
  }

  async listRecent(filters: ListFilters): Promise<StoredInteraction[]> {
    const result = await this.pool.query<StoredInteraction>(
      `SELECT ${INTERACTION_COLUMNS}
       FROM interactions
       WHERE ($2::text IS NULL OR command = $2)
         AND ($3::text IS NULL OR guild_id = $3)
         AND ($4::text IS NULL OR status = $4)
       ORDER BY created_at DESC
       LIMIT $1`,
      [filters.limit, filters.command ?? null, filters.guildId ?? null, filters.status ?? null]
    );
    return result.rows;
  }

  async getStats(): Promise<InteractionStats> {
    const totals = await this.pool.query<{ command: string; count: string }>(
      `SELECT command, COUNT(*) AS count FROM interactions GROUP BY command`
    );
    const tickets = await this.pool.query<{ open: string; inprog: string; high: string; failed: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'open')                            AS open,
         COUNT(*) FILTER (WHERE status = 'in_progress')                     AS inprog,
         COUNT(*) FILTER (WHERE status = 'open' AND ai_priority = 'high')   AS high,
         COUNT(*) FILTER (WHERE mirror_status = 'failed')                   AS failed
       FROM interactions`
    );
    const byCommand = Object.fromEntries(totals.rows.map((r) => [r.command, Number(r.count)]));
    const t = tickets.rows[0];
    return {
      total: Object.values(byCommand).reduce((a, b) => a + b, 0),
      byCommand,
      mirrorFailed: Number(t?.failed ?? 0),
      openTickets: Number(t?.open ?? 0),
      inProgress: Number(t?.inprog ?? 0),
      highPriorityOpen: Number(t?.high ?? 0),
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
      `INSERT INTO command_config (command, enabled, mirror_enabled, ai_enabled, reply_template, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (command) DO UPDATE
         SET enabled = $2, mirror_enabled = $3, ai_enabled = $4, reply_template = $5, updated_at = now()
       RETURNING ${CONFIG_COLUMNS}`,
      [config.command, config.enabled, config.mirrorEnabled, config.aiEnabled, config.replyTemplate]
    );
    return result.rows[0];
  }
}
