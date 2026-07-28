import type { Interaction } from "../../types/discord";
import { getRepository } from "../storage/interaction-repository";

export interface CommandResult {
  /** Reply shown in the Discord channel. */
  content: string;
  /** If set, this text is mirrored to the second channel's webhook. */
  mirror?: string;
}

export interface CommandContext {
  interaction: Interaction;
  guildId: string;
  username: string;
  options: Record<string, unknown>;
}

type CommandHandler = (ctx: CommandContext) => Promise<CommandResult>;

const handleReport: CommandHandler = async ({ username, options }) => {
  const text = String(options.text ?? "").trim();
  return {
    content: `✅ Thanks ${username}, your report has been logged: "${text}"`,
    mirror: `🚨 New report from **${username}**: ${text}`,
  };
};

const handleStatus: CommandHandler = async ({ guildId }) => {
  const reportCount = await getRepository().countByCommand(guildId, "report");
  return {
    content: `📊 Status: operational. Reports logged in this server: **${reportCount}**`,
  };
};

export const commandHandlers: Record<string, CommandHandler> = {
  report: handleReport,
  status: handleStatus,
};
