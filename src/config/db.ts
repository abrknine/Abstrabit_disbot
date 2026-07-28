import pg from "pg";
import { env } from "./env";

let pool: pg.Pool | null = null;

export const getPool = (): pg.Pool | null => {
  if (!env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
};
