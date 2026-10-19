/**
 * Entitlement wire shapes.
 *
 * God mode is a one-time lifetime unlock bound to an account, not a device.
 * The client never asserts that it paid: it presents a receipt, the server
 * verifies it with the platform, and the client's local flag is a cache of
 * that server decision. Nothing in this file lets a client hand the server a
 * grant — `EntitlementClaim` carries a receipt and nothing else that matters.
 */
export {};
