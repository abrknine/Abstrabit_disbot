import type { Guild, GuildRepository } from "./guild-repository";

/** Development fallback when DATABASE_URL is not configured. */
export class MemoryGuildRepository implements GuildRepository {
  private readonly guilds = new Map<string, Guild>();

  async upsert(guild: { guildId: string; name: string; icon: string | null }): Promise<void> {
    const existing = this.guilds.get(guild.guildId);
    this.guilds.set(guild.guildId, {
      ...guild,
      mirrorChannelId: existing?.mirrorChannelId ?? null,
      mirrorWebhookUrl: existing?.mirrorWebhookUrl ?? null,
      connectedAt: existing?.connectedAt ?? new Date().toISOString(),
    });
  }

  async findById(guildId: string): Promise<Guild | null> {
    return this.guilds.get(guildId) ?? null;
  }

  async list(): Promise<Guild[]> {
    return [...this.guilds.values()].sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
  }

  async setMirror(guildId: string, channelId: string, webhookUrl: string): Promise<void> {
    const guild = this.guilds.get(guildId);
    if (guild) {
      guild.mirrorChannelId = channelId;
      guild.mirrorWebhookUrl = webhookUrl;
    }
  }
}
