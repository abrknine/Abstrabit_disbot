import { getPool } from "../../config/db";
import { dbLogger } from "../../utils/logger";
import { MemoryInteractionRepository } from "./memory-repository";
import { PgInteractionRepository } from "./pg-repository";

export type MirrorStatus = "pending" | "sent" | "failed" | "skipped";

export interface InteractionRecord {
  interactionId: string;
  guildId: string;
  channelId: string | null;
  userId: string;
  username: string;
  command: string;
  options: Record<string, unknown>;
  responseSummary?: string;
}

export interface StoredInteraction extends InteractionRecord {
  mirrorStatus: MirrorStatus;
  mirrorError: string | null;
  createdAt: string;
}

export interface CommandConfig {
  command: string;
  enabled: boolean;
  mirrorEnabled: boolean;
  replyTemplate: string | null;
  updatedAt: string;
}

export interface InteractionStats {
  total: number;
  byCommand: Record<string, number>;
  mirrorFailed: number;
}

export interface InteractionRepository {
  init(): Promise<void>;
  /** Inserts the record; returns false if this interaction id was already handled (dedup). */
  recordIfNew(record: InteractionRecord): Promise<boolean>;
  updateMirrorStatus(interactionId: string, status: MirrorStatus, error?: string): Promise<void>;
  countByCommand(guildId: string, command: string): Promise<number>;
  listRecent(opts: { limit: number; command?: string; guildId?: string }): Promise<StoredInteraction[]>;
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
