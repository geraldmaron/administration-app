/** The one product id god mode is sold under. A claim naming anything else is not it. */
export const GOD_MODE_PRODUCT_ID = "com.theadministration.godmode.lifetime";
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
export class EntitlementService {
    store;
    verifiers;
    constructor(store, verifiers) {
        this.store = store;
        this.verifiers = new Map(verifiers.map((verifier) => [verifier.platform, verifier]));
    }
    async redeem(accountId, claim) {
        if (claim.productId !== GOD_MODE_PRODUCT_ID) {
            return { status: "refused", reason: `${claim.productId} is not a product this service grants` };
        }
        if (claim.receipt.trim().length === 0) {
            return { status: "refused", reason: "no receipt was presented" };
        }
        const verifier = this.verifiers.get(claim.platform);
        if (!verifier) {
            return {
                status: "verification-unavailable",
                reason: `this deployment is not configured to verify ${claim.platform} receipts`,
            };
        }
        const verification = await verifier.verify(claim.receipt, claim.productId);
        if (verification.status === "invalid") {
            return { status: "refused", reason: verification.reason };
        }
        if (verification.status === "unavailable") {
            // Never grants on an unreachable store, and never revokes on one either:
            // an existing holder keeps what they already have (see `resolve`).
            return { status: "verification-unavailable", reason: verification.reason };
        }
        const already = await this.store.findByTransaction(verification.transactionId);
        if (already) {
            if (already.accountId !== accountId) {
                return { status: "refused", reason: "this purchase is already attached to another account" };
            }
            return { status: "already-held", entitlement: already.entitlement };
        }
        const entitlement = {
            key: "god-mode",
            platform: claim.platform,
            grantedAt: new Date().toISOString(),
            transactionId: verification.transactionId,
        };
        await this.store.grant(accountId, entitlement);
        return { status: "granted", entitlement };
    }
    /**
     * What this account may do right now. `source` distinguishes an answer the
     * store just confirmed from one served out of the durable grant, so a surface
     * can be honest about it rather than implying a fresh check.
     */
    async resolve(accountId) {
        const entitlements = await this.store.listFor(accountId);
        return {
            godMode: entitlements.some((entitlement) => entitlement.key === "god-mode"),
            source: "server",
            entitlements,
        };
    }
    /**
     * The offline/degraded path: the last known server decision, used as-is.
     * A legitimate purchaser is not locked out because the store is down; the
     * cached answer can only ever have come from a server grant in the first
     * place, so this widens no attack surface that `redeem` did not already close.
     */
    static fromCache(entitlements) {
        return {
            godMode: entitlements.some((entitlement) => entitlement.key === "god-mode"),
            source: "cached",
            entitlements,
        };
    }
}
