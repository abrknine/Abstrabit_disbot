import type pg from "pg";
import type { AdminUser, UserRepository } from "./user-repository";

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findByEmail(email: string): Promise<AdminUser | null> {
    const result = await this.pool.query<AdminUser>(
      `SELECT id, email, password_hash AS "passwordHash", role
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] ?? null;
  }

  async createUser(email: string, passwordHash: string, role: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [email, passwordHash, role]
    );
  }

  async countUsers(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM users`);
    return Number(result.rows[0]?.count ?? 0);
  }
}
