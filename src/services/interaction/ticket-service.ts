import { editOriginalResponse } from "../discord/discord-api";
import { triageReport } from "../ai/triage-service";
import { mirrorNotification } from "../mirror/mirror-service";
import { getRepository, type StoredInteraction, type TicketStatus } from "../storage/interaction-repository";
import { logger } from "../../utils/logger";
import type { ActionRow, Button, Interaction } from "../../types/discord";

const ticketLogger = logger.child({ context: "ticket" });

const CATEGORY_EMOJI: Record<string, string> = {
  bug: "🐛",
  question: "❓",
  "feature-request": "💡",
  abuse: "🚫",
  other: "📄",
  unclassified: "📄",
};

const PRIORITY_EMOJI: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
  unknown: "⚪",
};

const STATUS_LABEL: Record<string, string> = {
  open: "🟢 Open",
  in_progress: "🔷 In progress",
  resolved: "✅ Resolved",
};

export interface TicketFields {
  title: string;
  description: string;
  urgency?: string;
}

export const ticketButtons = (interactionId: string, status: TicketStatus): ActionRow<Button>[] => {
  if (status === "resolved") return [];
  const buttons: Button[] = [];
  if (status === "open") {
    buttons.push({ type: 2, style: 1, label: "Claim", custom_id: `claim:${interactionId}` });
  }
  buttons.push({ type: 2, style: 3, label: "Resolve", custom_id: `resolve:${interactionId}` });
  return [{ type: 1, components: buttons }];
};

export const ticketMessage = (ticket: StoredInteraction): string => {
  const category = ticket.aiCategory ?? "unclassified";
  const priority = ticket.aiPriority ?? "unknown";
  const title = String(ticket.options.title ?? "Untitled");
  const lines = [
    `🎫 **Ticket #${ticket.id}** · ${CATEGORY_EMOJI[category] ?? "📄"} ${category} · ${PRIORITY_EMOJI[priority] ?? "⚪"} ${priority}`,
    `**${title}**${ticket.aiSummary ? ` — ${ticket.aiSummary}` : ""}`,
    `Status: ${STATUS_LABEL[ticket.status] ?? ticket.status}${ticket.claimedBy ? ` (by ${ticket.claimedBy})` : ""}`,
  ];
  return lines.join("\n");
};

/**
 * Runs after the deferred acknowledgment: AI triage, then edit the deferred
 * reply into the ticket card, then mirror to the staff channel. Every step is
 * best-effort — the ticket row is already persisted before this runs.
 */
export const finalizeTicket = async (
  interaction: Interaction,
  fields: TicketFields,
  aiEnabled: boolean,
  mirrorEnabled: boolean
): Promise<void> => {
  const repo = getRepository();

  const triage = aiEnabled ? await triageReport(fields) : null;
  await repo.updateTicketTriage(interaction.id, {
    summary: triage?.summary ?? fields.title,
    category: triage?.category ?? "unclassified",
    priority: triage?.priority ?? "medium",
  });

  const ticket = await repo.findByInteractionId(interaction.id);
  if (!ticket) {
    ticketLogger.error({ interactionId: interaction.id }, "ticket vanished before finalize");
    return;
  }

  await editOriginalResponse(interaction.token, {
    content: ticketMessage(ticket),
    components: ticketButtons(interaction.id, ticket.status),
  });

  if (mirrorEnabled) {
    const priority = ticket.aiPriority ?? "unknown";
    const mirrorText =
      `🚨 ${priority === "high" ? "**[HIGH]** " : ""}Ticket #${ticket.id} from **${ticket.username}**` +
      `\n${CATEGORY_EMOJI[ticket.aiCategory ?? "unclassified"]} ${ticket.aiCategory ?? "unclassified"} · ${ticket.aiSummary ?? fields.title}`;
    await mirrorNotification(interaction.id, ticket.guildId, mirrorText);
  } else {
    await repo.updateMirrorStatus(interaction.id, "skipped");
  }

  ticketLogger.info(
    { interactionId: interaction.id, ticketId: ticket.id, category: ticket.aiCategory, priority: ticket.aiPriority },
    "ticket finalized"
  );
};

/** Handles Claim/Resolve button clicks. Returns the updated message body. */
export const applyTicketAction = async (
  action: string,
  ticketInteractionId: string,
  actor: string
): Promise<{ content: string; components: ActionRow<Button>[] } | null> => {
  const repo = getRepository();
  const ticket = await repo.findByInteractionId(ticketInteractionId);
  if (!ticket) return null;

  const status: TicketStatus = action === "claim" ? "in_progress" : "resolved";
  await repo.updateTicketStatus(ticketInteractionId, status, actor);

  const updated = { ...ticket, status, claimedBy: action === "claim" ? actor : ticket.claimedBy ?? actor };
  ticketLogger.info({ ticketId: ticket.id, action, actor }, "ticket action applied");

  return {
    content: ticketMessage(updated),
    components: ticketButtons(ticketInteractionId, status),
  };
};
