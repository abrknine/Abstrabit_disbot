import { Router } from "express";
import { postInteraction } from "../controllers/interactions-controller";
import { verifyDiscordSignature } from "../middlewares/verify-discord-signature";
import { asyncHandler } from "../utils/async-handler";

export const interactionsRouter = Router();

interactionsRouter.post("/", asyncHandler(verifyDiscordSignature), asyncHandler(postInteraction));
