import { z } from "zod";

export const configUpdateSchema = z.object({
  enabled: z.boolean(),
  mirrorEnabled: z.boolean(),
  replyTemplate: z.string().max(500).nullable(),
});
