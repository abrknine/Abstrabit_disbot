import { getPool } from "../../config/db";
import { dbLogger } from "../../utils/logger";
import { MemoryInteractionRepository } from "./memory-repository";
import { PgInteractionRepository } from "./pg-repository";

export type MirrorStatus = "pending" | "sent" | "failed" | "skipped";
export type TicketStatus = "n/a" | "open" | "in_progress" | "resolved";

export interface InteractionRecord {
  interactionId: string;
  guildId: string;
  channelId: string | null;
  userId: string;
  username: string;
  command: string;
  options: Record<string, unknown>;
  status: TicketStatus;
}

export interface Triage {
  summary: string;
  category: string;
  priority: string;
}

export interface StoredInteraction extends InteractionRecord {
  id: number;
  mirrorStatus: MirrorStatus;
  mirrorError: string | null;
  claimedBy: string | null;
  aiSummary: string | null;
  aiCategory: string | null;
  aiPriority: string | null;
  createdAt: string;
}

export interface CommandConfig {
  command: string;
  enabled: boolean;
  mirrorEnabled: boolean;
  aiEnabled: boolean;
  replyTemplate: string | null;
  updatedAt: string;
}

export interface InteractionStats {
  total: number;
  byCommand: Record<string, number>;
  mirrorFailed: number;
  openTickets: number;
  inProgress: number;
  highPriorityOpen: number;
}

export interface TicketCounts {
  open: number;
  inProgress: number;
  resolved: number;
  highOpen: number;
}

export interface ListFilters {
  limit: number;
  command?: string;
  guildId?: string;
  status?: string;
}

export interface InteractionRepository {
  init(): Promise<void>;
  /** Inserts the record; created=false if this interaction id was already handled (dedup). */
  recordIfNew(record: InteractionRecord): Promise<{ created: boolean; rowId: number }>;
  findByInteractionId(interactionId: string): Promise<StoredInteraction | null>;
  updateMirrorStatus(interactionId: string, status: MirrorStatus, error?: string): Promise<void>;
  updateTicketTriage(interactionId: string, triage: Triage): Promise<void>;
  updateTicketStatus(interactionId: string, status: TicketStatus, claimedBy?: string): Promise<void>;
  ticketCounts(guildId: string): Promise<TicketCounts>;
  listRecent(filters: ListFilters): Promise<StoredInteraction[]>;
  getStats(): Promise<InteractionStats>;
  listConfig(): Promise<CommandConfig[]>;
  getConfig(command: string): Promise<CommandConfig | null>;
  upsertConfig(config: Omit<CommandConfig, "updatedAt">): Promise<CommandConfig>;
}

let repository: InteractionRepository | null = null;

export const getRepository = (): InteractionRepository => {
  if (!repository) {
    const pool = getPool();
    if (pool) {
      repository = new PgInteractionRepository(pool);
    } else {
      dbLogger.warn("DATABASE_URL not set — using in-memory store (data lost on restart)");
      repository = new MemoryInteractionRepository();
    }
  }
  return repository;
};
