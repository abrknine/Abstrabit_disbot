import type { AdminUser, UserRepository } from "./user-repository";

/** Development fallback when DATABASE_URL is not configured. */
export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, AdminUser>();
  private nextId = 1;

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.users.get(email) ?? null;
  }

  async createUser(email: string, passwordHash: string, role: string): Promise<void> {
    if (this.users.has(email)) return;
    this.users.set(email, { id: this.nextId++, email, passwordHash, role });
  }

  async countUsers(): Promise<number> {
    return this.users.size;
  }
}
