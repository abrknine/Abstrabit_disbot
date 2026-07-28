import type { NextFunction, Request, Response } from "express";
import { verifyKey } from "discord-interactions";
import { env } from "../config/env";
import { apiLogger } from "../utils/logger";

/**
 * Verifies Discord's Ed25519 request signature against the RAW request body.
 * Must run before any handler on the interactions route. Rejecting with 401
 * here is what makes the endpoint pass Discord's save-time forged-request test.
 */
export const verifyDiscordSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.header("X-Signature-Ed25519");
  const timestamp = req.header("X-Signature-Timestamp");
  const rawBody: Buffer | undefined = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!signature || !timestamp || !rawBody) {
    apiLogger.warn({ path: req.path }, "interaction rejected: missing signature headers");
    return res.status(401).json({ error: "invalid request signature" });
  }

  const isValid = await verifyKey(rawBody, signature, timestamp, env.DISCORD_PUBLIC_KEY).catch(
    () => false
  );

  if (!isValid) {
    apiLogger.warn({ path: req.path }, "interaction rejected: signature verification failed");
    return res.status(401).json({ error: "invalid request signature" });
  }

  next();
};
