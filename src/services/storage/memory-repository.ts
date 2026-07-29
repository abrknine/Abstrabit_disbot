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

/** Development fallback when DATABASE_URL is not configured. */
export class MemoryInteractionRepository implements InteractionRepository {
  private readonly rows = new Map<string, StoredInteraction>();
  private readonly configs = new Map<string, CommandConfig>();
  private nextId = 1;

  async init(): Promise<void> {
    for (const command of ["report", "status"]) {
      this.configs.set(command, {
        command,
        enabled: true,
        mirrorEnabled: true,
        aiEnabled: true,
        replyTemplate: null,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async recordIfNew(record: InteractionRecord): Promise<{ created: boolean; rowId: number }> {
    const existing = this.rows.get(record.interactionId);
    if (existing) return { created: false, rowId: existing.id };

    const stored: StoredInteraction = {
      ...record,
      id: this.nextId++,
      mirrorStatus: "pending",
      mirrorError: null,
      claimedBy: null,
      aiSummary: null,
      aiCategory: null,
      aiPriority: null,
      createdAt: new Date().toISOString(),
    };
    this.rows.set(record.interactionId, stored);
    return { created: true, rowId: stored.id };
  }

  async findByInteractionId(interactionId: string): Promise<StoredInteraction | null> {
    return this.rows.get(interactionId) ?? null;
  }

  async updateMirrorStatus(interactionId: string, status: MirrorStatus, error?: string): Promise<void> {
    const row = this.rows.get(interactionId);
    if (row) {
      row.mirrorStatus = status;
      row.mirrorError = error ?? null;
    }
  }

  async updateTicketTriage(interactionId: string, triage: Triage): Promise<void> {
    const row = this.rows.get(interactionId);
    if (row) {
      row.aiSummary = triage.summary;
      row.aiCategory = triage.category;
      row.aiPriority = triage.priority;
    }
  }

  async updateTicketStatus(interactionId: string, status: TicketStatus, claimedBy?: string): Promise<void> {
    const row = this.rows.get(interactionId);
    if (row) {
      row.status = status;
      if (claimedBy) row.claimedBy = claimedBy;
    }
  }

  async ticketCounts(guildId: string): Promise<TicketCounts> {
    const tickets = [...this.rows.values()].filter(
      (r) => r.guildId === guildId && r.status !== "n/a"
    );
    return {
      open: tickets.filter((r) => r.status === "open").length,
      inProgress: tickets.filter((r) => r.status === "in_progress").length,
      resolved: tickets.filter((r) => r.status === "resolved").length,
      highOpen: tickets.filter((r) => r.status === "open" && r.aiPriority === "high").length,
    };
  }

  async listRecent(filters: ListFilters): Promise<StoredInteraction[]> {
    return [...this.rows.values()]
      .filter((r) => !filters.command || r.command === filters.command)
      .filter((r) => !filters.guildId || r.guildId === filters.guildId)
      .filter((r) => !filters.status || r.status === filters.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filters.limit);
  }

  async getStats(): Promise<InteractionStats> {
    const all = [...this.rows.values()];
    const byCommand: Record<string, number> = {};
    for (const row of all) byCommand[row.command] = (byCommand[row.command] ?? 0) + 1;
    return {
      total: all.length,
      byCommand,
      mirrorFailed: all.filter((r) => r.mirrorStatus === "failed").length,
      openTickets: all.filter((r) => r.status === "open").length,
      inProgress: all.filter((r) => r.status === "in_progress").length,
      highPriorityOpen: all.filter((r) => r.status === "open" && r.aiPriority === "high").length,
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
