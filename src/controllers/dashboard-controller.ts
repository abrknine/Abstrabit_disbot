import type { Request, Response } from "express";
import { getRepository } from "../services/storage/interaction-repository";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { configUpdateSchema } from "../validators/config.schema";

export const listInteractions = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const command = typeof req.query.command === "string" ? req.query.command : undefined;
  const guildId = typeof req.query.guildId === "string" ? req.query.guildId : undefined;

  const interactions = await getRepository().listRecent({ limit, command, guildId });
  ApiResponse.success(res, interactions);
};

export const getStats = async (_req: Request, res: Response) => {
  ApiResponse.success(res, await getRepository().getStats());
};

export const listConfig = async (_req: Request, res: Response) => {
  ApiResponse.success(res, await getRepository().listConfig());
};

export const updateConfig = async (req: Request, res: Response) => {
  const command = req.params.command;
  const parsed = configUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid config payload", parsed.error.flatten());
  }

  const existing = await getRepository().getConfig(command);
  if (!existing) {
    throw ApiError.notFound(`No config for command: ${command}`);
  }

  const updated = await getRepository().upsertConfig({ command, ...parsed.data });
  ApiResponse.success(res, updated, "Config updated");
};
