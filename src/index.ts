import { app } from "./app";
import { env } from "./config/env";
import { getRepository } from "./services/storage/interaction-repository";
import { seedAdminUser } from "./services/storage/user-repository";
import { logger } from "./utils/logger";

const start = async () => {
  await getRepository().init();
  await seedAdminUser();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "server listening");
  });
};

start().catch((err) => {
  logger.fatal({ err }, "failed to start server");
  process.exit(1);
});
