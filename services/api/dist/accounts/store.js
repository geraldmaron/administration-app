export class InMemoryAccountStore {
    byId = new Map();
    idByEmail = new Map();
    nextId = 1;
    async create(email) {
        const existingId = this.idByEmail.get(email);
        if (existingId) {
            const existing = this.byId.get(existingId);
            if (existing && !existing.deletedAt)
                return existing;
        }
        const id = `acct_${this.nextId++}`;
        const account = { id, email, createdAt: new Date().toISOString(), deletedAt: null };
        this.byId.set(id, account);
        this.idByEmail.set(email, id);
        return account;
    }
    async findByEmail(email) {
        const id = this.idByEmail.get(email);
        if (!id)
            return null;
        return this.byId.get(id) ?? null;
    }
    async findById(id) {
        return this.byId.get(id) ?? null;
    }
    async markDeleted(id) {
        const account = this.byId.get(id);
        if (!account)
            return;
        // Deletion removes what it claims to: email is scrubbed, not just flagged,
        // so a later findByEmail can't recover the deleted account's identity.
        this.idByEmail.delete(account.email);
        this.byId.set(id, { ...account, email: `deleted:${id}`, deletedAt: new Date().toISOString() });
    }
}
