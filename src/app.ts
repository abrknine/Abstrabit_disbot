import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { globalErrorHandler } from "./middlewares/global-error-handler";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { authRouter } from "./routes/auth-router";
import { dashboardRouter } from "./routes/dashboard-router";
import { healthRouter } from "./routes/health-router";
import { interactionsRouter } from "./routes/interactions-router";

export const app = express();

const corsOrigin =
  env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(cors({ origin: corsOrigin }));

// Capture the raw body: Ed25519 verification must run against the exact
// bytes Discord signed, not a re-serialized parse.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

app.use("/interactions", interactionsRouter);
app.use("/healthz", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", dashboardRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);
