import { z } from "zod";

/**
 * Light structural validation of the interaction payload. Authenticity is
 * already proven by the Ed25519 signature; this guards against malformed
 * bodies reaching the service layer.
 */
export const interactionSchema = z
  .object({
    id: z.string().min(1),
    type: z.number().int(),
    token: z.string().min(1),
    guild_id: z.string().optional(),
    channel_id: z.string().optional(),
    data: z
      .object({
        name: z.string().min(1),
        options: z
          .array(
            z.object({
              name: z.string(),
              type: z.number(),
              value: z.union([z.string(), z.number(), z.boolean()]).optional(),
            })
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();
