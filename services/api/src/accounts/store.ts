import type { Account, AccountId } from "./types.js";

// Account persistence as a port. A real backing store implements this same
// interface; the in-memory store here is the reference implementation used by
// tests and by any surface running against a local dev instance.
export interface AccountStore {
  create(email: string): Promise<Account>;
  findByEmail(email: string): Promise<Account | null>;
  findById(id: AccountId): Promise<Account | null>;
  markDeleted(id: AccountId): Promise<void>;
}

export class InMemoryAccountStore implements AccountStore {
  private byId = new Map<AccountId, Account>();
  private idByEmail = new Map<string, AccountId>();
  private nextId = 1;

  async create(email: string): Promise<Account> {
    const existingId = this.idByEmail.get(email);
    if (existingId) {
      const existing = this.byId.get(existingId);
      if (existing && !existing.deletedAt) return existing;
    }
    const id = `acct_${this.nextId++}`;
    const account: Account = { id, email, createdAt: new Date().toISOString(), deletedAt: null };
    this.byId.set(id, account);
    this.idByEmail.set(email, id);
    return account;
  }

  async findByEmail(email: string): Promise<Account | null> {
    const id = this.idByEmail.get(email);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async findById(id: AccountId): Promise<Account | null> {
    return this.byId.get(id) ?? null;
  }

  async markDeleted(id: AccountId): Promise<void> {
    const account = this.byId.get(id);
    if (!account) return;
    // Deletion removes what it claims to: email is scrubbed, not just flagged,
    // so a later findByEmail can't recover the deleted account's identity.
    this.idByEmail.delete(account.email);
    this.byId.set(id, { ...account, email: `deleted:${id}`, deletedAt: new Date().toISOString() });
  }
}
