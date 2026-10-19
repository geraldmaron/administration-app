import type { AccountId, Session } from "./types.js";
export declare function issueAccessToken(accountId: AccountId, secret: string, now?: Date): {
    token: string;
    expiresAt: string;
};
export declare function verifyAccessToken(token: string, secret: string, now?: Date): AccountId | null;
export declare class RefreshTokenStore {
    private tokenToAccount;
    private revoked;
    issue(accountId: AccountId, now?: Date): string;
    /** Redeems and immediately rotates a refresh token. Returns null if invalid, expired, or already used. */
    redeem(token: string, now?: Date): AccountId | null;
    revokeAllFor(accountId: AccountId): void;
}
export declare function buildSession(accountId: AccountId, secret: string, refreshStore: RefreshTokenStore, now?: Date): Session;
