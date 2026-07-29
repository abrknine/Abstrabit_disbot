import type { Request, Response } from "express";
import { env } from "../config/env";
import { commandDefinitions } from "../services/discord/command-definitions";
import {
  createChannelWebhook,
  listBotGuildIds,
  listGuildChannels,
  registerGuildCommands,
} from "../services/discord/discord-api";
import { buildInstallUrl, exchangeCode, verifyState } from "../services/discord/oauth-service";
import { getGuildRepository } from "../services/storage/guild-repository";
import { apiLogger } from "../utils/logger";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";

export const getInstallUrl = async (req: Request, res: Response) => {
  ApiResponse.success(res, { url: buildInstallUrl(req.admin?.email ?? "admin") });
};

/**
 * Discord redirects the admin's browser here after they authorize the bot
 * into a server. Auth is proven by the signed `state` (the browser has no JWT
 * header on a redirect), then the code is exchanged and the guild stored.
 */
export const oauthCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) return res.redirect(`${env.FRONTEND_URL}/?connect=denied`);
  if (!code || !state) throw ApiError.badRequest("Missing code or state");

  verifyState(state);
  const guild = await exchangeCode(code);

  await getGuildRepository().upsert(guild);
  await registerGuildCommands(guild.guildId, commandDefinitions);
  apiLogger.info({ guildId: guild.guildId, name: guild.name }, "guild connected via oauth");

  res.redirect(`${env.FRONTEND_URL}/?connect=ok&guild=${guild.guildId}`);
};

/**
 * Lists connected guilds, reconciled against live bot membership: the bot
 * gets no event when it is kicked, so we diff our records with Discord's
 * member list on each load. A re-added guild flips back to connected.
 */
export const listGuilds = async (_req: Request, res: Response) => {
  const repo = getGuildRepository();
  const liveIds = await listBotGuildIds();

  if (liveIds) {
    for (const guild of await repo.list()) {
      const isMember = liveIds.has(guild.guildId);
      if (guild.status === "connected" && !isMember) {
        await repo.setStatus(guild.guildId, "removed");
        apiLogger.info({ guildId: guild.guildId, name: guild.name }, "guild marked removed (bot kicked)");
      } else if (guild.status === "removed" && isMember) {
        await repo.setStatus(guild.guildId, "connected");
      }
    }
  }

  ApiResponse.success(res, await repo.list());
};

export const listChannels = async (req: Request, res: Response) => {
  ApiResponse.success(res, await listGuildChannels(req.params.guildId));
};

export const setMirrorChannel = async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const channelId = String(req.body?.channelId ?? "");
  if (!/^\d+$/.test(channelId)) throw ApiError.badRequest("channelId must be a snowflake");

  const repo = getGuildRepository();
  if (!(await repo.findById(guildId))) throw ApiError.notFound("Guild not connected");

  const webhookUrl = await createChannelWebhook(channelId, "Abstrabit Mirror");
  if (!webhookUrl) {
    throw ApiError.badRequest(
      "Could not create webhook — does the bot have Manage Webhooks in that channel?"
    );
  }

  await repo.setMirror(guildId, channelId, webhookUrl);
  apiLogger.info({ guildId, channelId }, "mirror channel configured");
  ApiResponse.success(res, await repo.findById(guildId), "Mirror channel configured");
};
