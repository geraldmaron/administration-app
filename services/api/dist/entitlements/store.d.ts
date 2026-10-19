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
    findByTransaction(transactionId: string): Promise<{
        accountId: AccountId;
        entitlement: Entitlement;
    } | null>;
}
export declare class InMemoryEntitlementStore implements EntitlementStore {
    private readonly byAccount;
    listFor(accountId: AccountId): Promise<readonly Entitlement[]>;
    grant(accountId: AccountId, entitlement: Entitlement): Promise<void>;
    findByTransaction(transactionId: string): Promise<{
        accountId: AccountId;
        entitlement: Entitlement;
    } | null>;
}
