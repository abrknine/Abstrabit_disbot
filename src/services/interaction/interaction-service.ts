import {
  EPHEMERAL,
  InteractionCallbackType,
  InteractionType,
  type Interaction,
  type InteractionResponse,
  type ModalField,
} from "../../types/discord";
import { apiLogger } from "../../utils/logger";
import { getRepository } from "../storage/interaction-repository";
import { applyTicketAction, finalizeTicket, type TicketFields } from "./ticket-service";

const reply = (content: string, ephemeral = false): InteractionResponse => ({
  type: InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: { content, ...(ephemeral ? { flags: EPHEMERAL } : {}) },
});

const REPORT_MODAL: InteractionResponse = {
  type: InteractionCallbackType.MODAL,
  data: {
    custom_id: "report_modal",
    title: "File a support ticket",
    components: [
      {
        type: 1,
        components: [
          { type: 4, custom_id: "title", label: "Title", style: 1, required: true, max_length: 100 },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "description",
            label: "What happened?",
            style: 2,
            required: true,
            max_length: 1000,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "urgency",
            label: "How urgent is it for you?",
            style: 1,
            required: false,
            max_length: 20,
            placeholder: "low / medium / high",
          },
        ],
      },
    ],
  },
};

const getUser = (interaction: Interaction) => interaction.member?.user ?? interaction.user;

const modalFields = (interaction: Interaction): TicketFields => {
  const fields = new Map<string, string>();
  for (const row of interaction.data?.components ?? []) {
    for (const field of row.components as ModalField[]) {
      if (field.custom_id && field.value !== undefined) fields.set(field.custom_id, field.value);
    }
  }
  return {
    title: fields.get("title") ?? "Untitled",
    description: fields.get("description") ?? "",
    urgency: fields.get("urgency") || undefined,
  };
};

const handleCommand = async (interaction: Interaction): Promise<InteractionResponse> => {
  const command = interaction.data?.name ?? "";
  const repo = getRepository();
  const config = await repo.getConfig(command);

  if (config && !config.enabled) {
    return reply(`/${command} is currently disabled by the admin.`, true);
  }

  if (command === "report") {
    // No DB write yet — the ticket is recorded on modal submit.
    return REPORT_MODAL;
  }

  if (command === "status") {
    const user = getUser(interaction);
    const guildId = interaction.guild_id ?? "dm";
    const { created } = await repo.recordIfNew({
      interactionId: interaction.id,
      guildId,
      channelId: interaction.channel_id ?? null,
      userId: user?.id ?? "unknown",
      username: user?.global_name || user?.username || "unknown",
      command: "status",
      options: {},
      status: "n/a",
    });
    if (!created) return reply("This command was already processed.", true);

    void repo.updateMirrorStatus(interaction.id, "skipped");
    const counts = await repo.ticketCounts(guildId);
    return reply(
      `📊 **Ticket queue** — 🟢 ${counts.open} open` +
        `${counts.highOpen ? ` (🔴 ${counts.highOpen} high priority)` : ""}` +
        ` · 🔷 ${counts.inProgress} in progress · ✅ ${counts.resolved} resolved`
    );
  }

  return reply(`Unknown command: /${command}`, true);
};

const handleModalSubmit = async (interaction: Interaction): Promise<InteractionResponse> => {
  if (interaction.data?.custom_id !== "report_modal") {
    return reply("Unknown form submission.", true);
  }

  const repo = getRepository();
  const user = getUser(interaction);
  const username = user?.global_name || user?.username || "unknown";
  const fields = modalFields(interaction);

  const { created } = await repo.recordIfNew({
    interactionId: interaction.id,
    guildId: interaction.guild_id ?? "dm",
    channelId: interaction.channel_id ?? null,
    userId: user?.id ?? "unknown",
    username,
    command: "report",
    options: { ...fields },
    status: "open",
  });
  if (!created) return reply("This report was already processed.", true);

  const config = await repo.getConfig("report");

  // Acknowledge within the 3s window; AI triage + mirror continue async.
  void finalizeTicket(interaction, fields, config?.aiEnabled ?? true, config?.mirrorEnabled ?? true);

  apiLogger.info({ interactionId: interaction.id, username }, "ticket filed, triage deferred");
  return { type: InteractionCallbackType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
};

const handleComponent = async (interaction: Interaction): Promise<InteractionResponse> => {
  const [action, ticketInteractionId] = (interaction.data?.custom_id ?? "").split(":");
  if (!["claim", "resolve"].includes(action) || !ticketInteractionId) {
    return reply("Unknown action.", true);
  }

  const user = getUser(interaction);
  const actor = user?.global_name || user?.username || "unknown";
  const updated = await applyTicketAction(action, ticketInteractionId, actor);
  if (!updated) return reply("This ticket no longer exists.", true);

  return { type: InteractionCallbackType.UPDATE_MESSAGE, data: updated };
};

/**
 * Dispatcher for all verified interactions. Slow work (AI, mirror) always runs
 * AFTER the response is decided so the ~3s Discord window is never at risk.
 */
export const handleInteraction = async (interaction: Interaction): Promise<InteractionResponse> => {
  switch (interaction.type) {
    case InteractionType.PING:
      return { type: InteractionCallbackType.PONG };
    case InteractionType.APPLICATION_COMMAND:
      return handleCommand(interaction);
    case InteractionType.MODAL_SUBMIT:
      return handleModalSubmit(interaction);
    case InteractionType.MESSAGE_COMPONENT:
      return handleComponent(interaction);
    default:
      return reply("Unsupported interaction type.", true);
  }
};
