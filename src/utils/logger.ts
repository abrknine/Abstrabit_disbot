import { pino } from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "*.botToken",
      "*.token",
      "*.webhookUrl",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export const apiLogger = logger.child({ context: "api" });
export const dbLogger = logger.child({ context: "db" });
export const mirrorLogger = logger.child({ context: "mirror" });
