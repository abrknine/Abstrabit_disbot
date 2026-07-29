import { Router } from "express";
import {
  getInstallUrl,
  listChannels,
  listGuilds,
  oauthCallback,
  setMirrorChannel,
} from "../controllers/discord-controller";
import { adminAuth } from "../middlewares/admin-auth";
import { asyncHandler } from "../utils/async-handler";

export const discordRouter = Router();

// Public: target of Discord's browser redirect (protected by signed state).
discordRouter.get("/callback", asyncHandler(oauthCallback));

discordRouter.get("/install-url", adminAuth, asyncHandler(getInstallUrl));
discordRouter.get("/guilds", adminAuth, asyncHandler(listGuilds));
discordRouter.get("/guilds/:guildId/channels", adminAuth, asyncHandler(listChannels));
discordRouter.put("/guilds/:guildId/mirror-channel", adminAuth, asyncHandler(setMirrorChannel));
