/**
 * Entitlement wire shapes.
 *
 * God mode is a one-time lifetime unlock bound to an account, not a device.
 * The client never asserts that it paid: it presents a receipt, the server
 * verifies it with the platform, and the client's local flag is a cache of
 * that server decision. Nothing in this file lets a client hand the server a
 * grant — `EntitlementClaim` carries a receipt and nothing else that matters.
 */
export type EntitlementKey = "god-mode";
/** Steam is the one storefront the game sells through. */
export type StorePlatform = "steam";
export type EntitlementClaim = {
    readonly platform: StorePlatform;
    /**
     * The platform's own opaque ownership proof: for Steam, the session ticket
     * the client obtains from Steamworks. The server resolves it to a Steam
     * account and reads that account's ownership back from Steam; nothing else
     * about the purchase is trusted from here.
     */
    readonly receipt: string;
    readonly productId: string;
};
export type Entitlement = {
    readonly key: EntitlementKey;
    readonly platform: StorePlatform;
    readonly grantedAt: string;
    /** The platform's transaction identity, kept so a duplicate receipt is idempotent. */
    readonly transactionId: string;
};
/** What a verifier concluded. There is deliberately no "assume valid" case. */
export type ReceiptVerification = {
    readonly status: "valid";
    readonly transactionId: string;
    readonly productId: string;
    readonly purchasedAt: string;
} | {
    readonly status: "invalid";
    readonly reason: string;
} | {
    /**
     * The platform could not be reached, or this deployment is not configured
     * to verify against it. Distinct from `invalid` on purpose: an unreachable
     * store must never look like a refused purchase, and must never grant.
     */
    readonly status: "unavailable";
    readonly reason: string;
};
export type RedeemResult = {
    readonly status: "granted";
    readonly entitlement: Entitlement;
} | {
    readonly status: "already-held";
    readonly entitlement: Entitlement;
} | {
    readonly status: "refused";
    readonly reason: string;
} | {
    readonly status: "verification-unavailable";
    readonly reason: string;
};
/**
 * What the client is told it may do. `source` is honest about where the answer
 * came from, so a surface can say "using your saved unlock" when the store is
 * unreachable instead of pretending it just re-checked.
 */
export type EntitlementState = {
    readonly godMode: boolean;
    readonly source: "server" | "cached";
    readonly entitlements: readonly Entitlement[];
};
