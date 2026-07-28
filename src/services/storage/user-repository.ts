import bcrypt from "bcryptjs";
import { getPool } from "../../config/db";
import { env } from "../../config/env";
import { dbLogger } from "../../utils/logger";
import { MemoryUserRepository } from "./memory-user-repository";
import { PgUserRepository } from "./pg-user-repository";

export interface AdminUser {
  id: number;
  email: string;
  passwordHash: string;
  role: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<AdminUser | null>;
  createUser(email: string, passwordHash: string, role: string): Promise<void>;
  countUsers(): Promise<number>;
}

let repository: UserRepository | null = null;

export const getUserRepository = (): UserRepository => {
  if (!repository) {
    const pool = getPool();
    repository = pool ? new PgUserRepository(pool) : new MemoryUserRepository();
  }
  return repository;
};

/** First-boot bootstrap: seed the admin account from env if no users exist. */
export const seedAdminUser = async (): Promise<void> => {
  const repo = getUserRepository();
  if ((await repo.countUsers()) > 0) return;

  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await repo.createUser(env.ADMIN_EMAIL, hash, "admin");
  dbLogger.info({ email: env.ADMIN_EMAIL }, "seeded initial admin user");
};
