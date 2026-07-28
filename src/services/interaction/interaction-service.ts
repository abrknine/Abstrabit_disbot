import {
  EPHEMERAL,
  InteractionCallbackType,
  InteractionType,
  type Interaction,
  type InteractionResponse,
} from "../../types/discord";
import { apiLogger } from "../../utils/logger";
import { mirrorNotification } from "../mirror/mirror-service";
import { getRepository } from "../storage/interaction-repository";
import { commandHandlers } from "./command-handlers";

const reply = (content: string, ephemeral = false): InteractionResponse => ({
  type: InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: { content, ...(ephemeral ? { flags: EPHEMERAL } : {}) },
});

const renderTemplate = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);

/**
 * Full pipeline for one interaction: dedup → record → rule → reply.
 * The mirror runs fire-and-forget AFTER the response is decided, so slow or
 * failing downstream calls never break the ~3s Discord response window.
 */
export const handleInteraction = async (interaction: Interaction): Promise<InteractionResponse> => {
  if (interaction.type === InteractionType.PING) {
    return { type: InteractionCallbackType.PONG };
  }

  if (interaction.type !== InteractionType.APPLICATION_COMMAND || !interaction.data) {
    return reply("Unsupported interaction type.", true);
  }

  const command = interaction.data.name;
  const handler = commandHandlers[command];
  if (!handler) {
    return reply(`Unknown command: /${command}`, true);
  }

  const config = await getRepository().getConfig(command);
  if (config && !config.enabled) {
    return reply(`/${command} is currently disabled by the admin.`, true);
  }

  const user = interaction.member?.user ?? interaction.user;
  const guildId = interaction.guild_id ?? "dm";
  const username = user?.global_name || user?.username || "unknown";
  const options = Object.fromEntries(
    (interaction.data.options ?? []).map((o) => [o.name, o.value])
  );

  const repo = getRepository();
  const isNew = await repo.recordIfNew({
    interactionId: interaction.id,
    guildId,
    channelId: interaction.channel_id ?? null,
    userId: user?.id ?? "unknown",
    username,
    command,
    options,
  });

  if (!isNew) {
    apiLogger.info({ interactionId: interaction.id, command }, "duplicate interaction, acknowledging only");
    return reply("This command was already processed.", true);
  }

  const result = await handler({ interaction, guildId, username, options });
  const content = config?.replyTemplate
    ? renderTemplate(config.replyTemplate, { username, text: String(options.text ?? "") })
    : result.content;

  if (result.mirror && (config?.mirrorEnabled ?? true)) {
    // Deliberately not awaited: reply to Discord first, mirror after.
    void mirrorNotification(interaction.id, result.mirror);
  } else {
    void repo.updateMirrorStatus(interaction.id, "skipped");
  }

  apiLogger.info({ interactionId: interaction.id, command, guildId, username }, "interaction handled");
  return reply(content);
};
