import { getPool } from "../../config/db";
import { MemoryGuildRepository } from "./memory-guild-repository";
import { PgGuildRepository } from "./pg-guild-repository";

export type GuildStatus = "connected" | "removed";

export interface Guild {
  guildId: string;
  name: string;
  icon: string | null;
  mirrorChannelId: string | null;
  mirrorWebhookUrl: string | null;
  status: GuildStatus;
  connectedAt: string;
}

export interface GuildRepository {
  upsert(guild: { guildId: string; name: string; icon: string | null }): Promise<void>;
  findById(guildId: string): Promise<Guild | null>;
  list(): Promise<Guild[]>;
  setMirror(guildId: string, channelId: string, webhookUrl: string): Promise<void>;
  setStatus(guildId: string, status: GuildStatus): Promise<void>;
}

let repository: GuildRepository | null = null;

export const getGuildRepository = (): GuildRepository => {
  if (!repository) {
    const pool = getPool();
    repository = pool ? new PgGuildRepository(pool) : new MemoryGuildRepository();
  }
  return repository;
};
