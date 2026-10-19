import type { Entitlement, EntitlementClaim, EntitlementState, RedeemResult } from "@admin/contracts";
import type { AccountId } from "../accounts/types.js";
import type { EntitlementStore } from "./store.js";
import type { ReceiptVerifier } from "./verifiers/types.js";
/** The one product id god mode is sold under. A claim naming anything else is not it. */
export declare const GOD_MODE_PRODUCT_ID = "com.theadministration.godmode.lifetime";
/**
 * Server-verified entitlements.
 *
 * The security property: nothing a client sends can grant an entitlement.
 * `redeem` takes a receipt and a platform, and the only route to `granted`
 * runs through a verifier returning `valid`. There is no argument, field, or
 * header on this API that means "I already own this" — a forged claim has
 * nothing to forge, which is why the forgery test below can only fail by
 * someone adding such a field.
 */
export declare class EntitlementService {
    private readonly store;
    private readonly verifiers;
    constructor(store: EntitlementStore, verifiers: readonly ReceiptVerifier[]);
    redeem(accountId: AccountId, claim: EntitlementClaim): Promise<RedeemResult>;
    /**
     * What this account may do right now. `source` distinguishes an answer the
     * store just confirmed from one served out of the durable grant, so a surface
     * can be honest about it rather than implying a fresh check.
     */
    resolve(accountId: AccountId): Promise<EntitlementState>;
    /**
     * The offline/degraded path: the last known server decision, used as-is.
     * A legitimate purchaser is not locked out because the store is down; the
     * cached answer can only ever have come from a server grant in the first
     * place, so this widens no attack surface that `redeem` did not already close.
     */
    static fromCache(entitlements: readonly Entitlement[]): EntitlementState;
}
