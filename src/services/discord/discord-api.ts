import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import type { ActionRow, Button } from "../../types/discord";

const discordLogger = logger.child({ context: "discord-api" });

/**
 * Edits the original deferred reply via the interaction's follow-up webhook.
 * Uses the interaction token (valid 15 min) — no bot token needed.
 */
const botHeaders = () => ({
  Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
  "Content-Type": "application/json",
});

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
}

/** Text channels of a guild the bot is in. */
export const listGuildChannels = async (guildId: string): Promise<GuildChannel[]> => {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: botHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    discordLogger.warn({ status: res.status, guildId }, "failed to list guild channels");
    return [];
  }
  const channels = (await res.json()) as GuildChannel[];
  return channels.filter((c) => c.type === 0); // GUILD_TEXT
};

/** Creates a webhook in a channel; requires the Manage Webhooks permission. */
export const createChannelWebhook = async (
  channelId: string,
  name: string
): Promise<string | null> => {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    discordLogger.warn({ status: res.status, channelId }, "failed to create webhook");
    return null;
  }
  const webhook = await res.json();
  return webhook.id && webhook.token
    ? `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`
    : null;
};

/** Registers the slash-command menu for one guild (instant visibility). */
export const registerGuildCommands = async (
  guildId: string,
  commands: object[]
): Promise<boolean> => {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: botHeaders(),
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!res.ok) discordLogger.error({ status: res.status, guildId }, "failed to register commands");
  return res.ok;
};

export const editOriginalResponse = async (
  interactionToken: string,
  payload: { content: string; components?: ActionRow<Button>[] }
): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interactionToken}/messages/@original`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      }
    );
    if (!res.ok) {
      discordLogger.error({ status: res.status }, "failed to edit original response");
      return false;
    }
    return true;
  } catch (err) {
    discordLogger.error({ err }, "failed to edit original response");
    return false;
  }
};
