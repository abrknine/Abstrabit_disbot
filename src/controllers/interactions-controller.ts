import type { Request, Response } from "express";
import { handleInteraction } from "../services/interaction/interaction-service";
import type { Interaction } from "../types/discord";
import { ApiError } from "../utils/api-error";
import { interactionSchema } from "../validators/interaction.schema";

/**
 * Note: responses here follow Discord's interaction-callback format, not the
 * ApiResponse envelope — Discord dictates the shape.
 */
export const postInteraction = async (req: Request, res: Response) => {
  const parsed = interactionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Malformed interaction payload", parsed.error.flatten());
  }

  const response = await handleInteraction(parsed.data as unknown as Interaction);
  res.json(response);
};
