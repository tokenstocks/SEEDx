import { type User } from "@shared/schema";
import { randomUUID } from "crypto";

// This is a legacy storage interface that is no longer used.
// The application now uses Drizzle ORM directly via server/db.ts
// This file is kept for backwards compatibility but can be removed.

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
}

export const storage = new MemStorage();
