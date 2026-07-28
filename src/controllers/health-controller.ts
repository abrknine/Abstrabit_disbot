import type { Request, Response } from "express";
import { env } from "../config/env";
import { ApiResponse } from "../utils/api-response";

export const getHealth = async (_req: Request, res: Response) => {
  ApiResponse.success(res, {
    status: "ok",
    storage: env.DATABASE_URL ? "postgres" : "memory",
    uptimeSeconds: Math.round(process.uptime()),
  });
};
