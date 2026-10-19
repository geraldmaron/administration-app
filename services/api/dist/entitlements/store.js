export class InMemoryEntitlementStore {
    byAccount = new Map();
    async listFor(accountId) {
        return [...(this.byAccount.get(accountId) ?? [])];
    }
    async grant(accountId, entitlement) {
        const held = this.byAccount.get(accountId) ?? [];
        this.byAccount.set(accountId, [...held, entitlement]);
    }
    async findByTransaction(transactionId) {
        for (const [accountId, entitlements] of this.byAccount.entries()) {
            const found = entitlements.find((candidate) => candidate.transactionId === transactionId);
            if (found)
                return { accountId, entitlement: found };
        }
        return null;
    }
}
