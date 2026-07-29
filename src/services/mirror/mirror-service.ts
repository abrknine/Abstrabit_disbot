import { env } from "../../config/env";
import { mirrorLogger } from "../../utils/logger";
import { getGuildRepository } from "../storage/guild-repository";
import { getRepository } from "../storage/interaction-repository";

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 500;

/**
 * Posts a notification to the mirror webhook — the guild's own webhook when
 * the admin configured one via the dashboard, otherwise the env fallback.
 * Runs after the Discord reply has already been sent, so a mirror failure
 * never loses the interaction — the outcome is recorded on the row.
 */
export const mirrorNotification = async (
  interactionId: string,
  guildId: string,
  content: string
): Promise<void> => {
  const repo = getRepository();
  const guild = await getGuildRepository().findById(guildId);
  const webhookUrl = guild?.mirrorWebhookUrl ?? env.MIRROR_WEBHOOK_URL;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: AbortSignal.timeout(5_000),
      });

      if (res.ok) {
        await repo.updateMirrorStatus(interactionId, "sent");
        mirrorLogger.info({ interactionId, attempt }, "mirror notification sent");
        return;
      }

      // 4xx will not succeed on retry; 5xx/429 might.
      if (res.status < 500 && res.status !== 429) {
        await repo.updateMirrorStatus(interactionId, "failed", `HTTP ${res.status}`);
        mirrorLogger.error({ interactionId, status: res.status }, "mirror rejected, not retrying");
        return;
      }

      mirrorLogger.warn({ interactionId, attempt, status: res.status }, "mirror attempt failed");
    } catch (err) {
      mirrorLogger.warn({ interactionId, attempt, err }, "mirror attempt errored");
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
    }
  }

  await repo.updateMirrorStatus(interactionId, "failed", `all ${MAX_ATTEMPTS} attempts failed`);
  mirrorLogger.error({ interactionId }, "mirror notification permanently failed");
};
