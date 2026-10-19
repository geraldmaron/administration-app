import type { AccountStore } from "./store.js";
import { RefreshTokenStore, buildSession, verifyAccessToken } from "./session.js";
import type { Account, AccountId, Session } from "./types.js";

/**
 * Accounts across three surfaces: a session is bound to the
 * account, not to a device or surface, so signing in on iOS and presenting
 * that account's token from web or Android is recognized identically.
 */
export class AuthService {
  private readonly refreshStore = new RefreshTokenStore();

  constructor(
    private readonly store: AccountStore,
    private readonly secret: string,
  ) {}

  async signUpOrSignIn(email: string): Promise<{ account: Account; session: Session }> {
    const account = await this.store.create(email);
    return { account, session: buildSession(account.id, this.secret, this.refreshStore) };
  }

  /** Recognizes an existing session's holder regardless of which surface presents it. */
  verifySession(accessToken: string): AccountId | null {
    return verifyAccessToken(accessToken, this.secret);
  }

  /** Rotates the refresh token; the old one is invalid the instant this is called. */
  refresh(refreshToken: string): Session | null {
    const accountId = this.refreshStore.redeem(refreshToken);
    if (!accountId) return null;
    return buildSession(accountId, this.secret, this.refreshStore);
  }

  /** Removes what it claims to: account record scrubbed, every outstanding session revoked. */
  async deleteAccount(accountId: AccountId): Promise<void> {
    await this.store.markDeleted(accountId);
    this.refreshStore.revokeAllFor(accountId);
  }
}
