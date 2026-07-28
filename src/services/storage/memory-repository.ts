import type {
  CommandConfig,
  InteractionRecord,
  InteractionRepository,
  InteractionStats,
  MirrorStatus,
  StoredInteraction,
} from "./interaction-repository";

/** Development fallback when DATABASE_URL is not configured. */
export class MemoryInteractionRepository implements InteractionRepository {
  private readonly rows = new Map<string, StoredInteraction>();
  private readonly configs = new Map<string, CommandConfig>();

  async init(): Promise<void> {
    for (const command of ["report", "status"]) {
      this.configs.set(command, {
        command,
        enabled: true,
        mirrorEnabled: true,
        replyTemplate: null,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async recordIfNew(record: InteractionRecord): Promise<boolean> {
    if (this.rows.has(record.interactionId)) return false;
    this.rows.set(record.interactionId, {
      ...record,
      mirrorStatus: "pending",
      mirrorError: null,
      createdAt: new Date().toISOString(),
    });
    return true;
  }

  async updateMirrorStatus(interactionId: string, status: MirrorStatus, error?: string): Promise<void> {
    const row = this.rows.get(interactionId);
    if (row) {
      row.mirrorStatus = status;
      row.mirrorError = error ?? null;
    }
  }

  async countByCommand(guildId: string, command: string): Promise<number> {
    return [...this.rows.values()].filter(
      (r) => r.guildId === guildId && r.command === command
    ).length;
  }

  async listRecent(opts: { limit: number; command?: string; guildId?: string }): Promise<StoredInteraction[]> {
    return [...this.rows.values()]
      .filter((r) => !opts.command || r.command === opts.command)
      .filter((r) => !opts.guildId || r.guildId === opts.guildId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit);
  }

  async getStats(): Promise<InteractionStats> {
    const all = [...this.rows.values()];
    const byCommand: Record<string, number> = {};
    for (const row of all) byCommand[row.command] = (byCommand[row.command] ?? 0) + 1;
    return {
      total: all.length,
      byCommand,
      mirrorFailed: all.filter((r) => r.mirrorStatus === "failed").length,
    };
  }

  async listConfig(): Promise<CommandConfig[]> {
    return [...this.configs.values()].sort((a, b) => a.command.localeCompare(b.command));
  }

  async getConfig(command: string): Promise<CommandConfig | null> {
    return this.configs.get(command) ?? null;
  }

  async upsertConfig(config: Omit<CommandConfig, "updatedAt">): Promise<CommandConfig> {
    const stored = { ...config, updatedAt: new Date().toISOString() };
    this.configs.set(config.command, stored);
    return stored;
  }
}
