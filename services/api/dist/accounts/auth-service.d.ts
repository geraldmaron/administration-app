import type { AccountStore } from "./store.js";
import type { Account, AccountId, Session } from "./types.js";
/**
 * Accounts across three surfaces: a session is bound to the
 * account, not to a device or surface, so signing in on iOS and presenting
 * that account's token from web or Android is recognized identically.
 */
export declare class AuthService {
    private readonly store;
    private readonly secret;
    private readonly refreshStore;
    constructor(store: AccountStore, secret: string);
    signUpOrSignIn(email: string): Promise<{
        account: Account;
        session: Session;
    }>;
    /** Recognizes an existing session's holder regardless of which surface presents it. */
    verifySession(accessToken: string): AccountId | null;
    /** Rotates the refresh token; the old one is invalid the instant this is called. */
    refresh(refreshToken: string): Session | null;
    /** Removes what it claims to: account record scrubbed, every outstanding session revoked. */
    deleteAccount(accountId: AccountId): Promise<void>;
}
