import type { Entitlement } from "@admin/contracts";
import type { AccountId } from "../accounts/types.js";

/**
 * Entitlements are bound to an account, never to a device or an install — that
 * is what makes them survive a reinstall and restore on a different surface.
 * `findByTransaction` exists so a receipt presented twice grants once.
 */
export interface EntitlementStore {
  listFor(accountId: AccountId): Promise<readonly Entitlement[]>;
  grant(accountId: AccountId, entitlement: Entitlement): Promise<void>;
  findByTransaction(transactionId: string): Promise<{ accountId: AccountId; entitlement: Entitlement } | null>;
}

export class InMemoryEntitlementStore implements EntitlementStore {
  private readonly byAccount = new Map<AccountId, Entitlement[]>();

  async listFor(accountId: AccountId): Promise<readonly Entitlement[]> {
    return [...(this.byAccount.get(accountId) ?? [])];
  }

  async grant(accountId: AccountId, entitlement: Entitlement): Promise<void> {
    const held = this.byAccount.get(accountId) ?? [];
    this.byAccount.set(accountId, [...held, entitlement]);
  }

  async findByTransaction(
    transactionId: string,
  ): Promise<{ accountId: AccountId; entitlement: Entitlement } | null> {
    for (const [accountId, entitlements] of this.byAccount.entries()) {
      const found = entitlements.find((candidate) => candidate.transactionId === transactionId);
      if (found) return { accountId, entitlement: found };
    }
    return null;
  }
}
