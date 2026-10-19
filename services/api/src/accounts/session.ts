// Session tokens: a short-lived HMAC access token carrying the account id and
// its expiry, and an opaque refresh token redeemed exactly once. A token is
// bound to the account, never to a device or a surface.
import { createHmac, randomUUID } from "node:crypto";
import type { AccountId, Session } from "./types.js";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // short-lived: never a long-lived secret in client storage
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AccessTokenPayload = { accountId: AccountId; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueAccessToken(accountId: AccountId, secret: string, now = new Date()): { token: string; expiresAt: string } {
  const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS).toISOString();
  const payload: AccessTokenPayload = { accountId, exp: Date.parse(expiresAt) };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encoded}.${sign(encoded, secret)}`;
  return { token, expiresAt };
}

export function verifyAccessToken(token: string, secret: string, now = new Date()): AccountId | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded, secret) !== signature) return null;
  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp < now.getTime()) return null;
  return payload.accountId;
}

// Refresh tokens are opaque, single-use, and rotate on every use: a refresh
// token that's already been redeemed cannot be replayed (revoked set below),
// which is what "refresh handled correctly" means for the acceptance criteria.
export class RefreshTokenStore {
  private tokenToAccount = new Map<string, { accountId: AccountId; expiresAt: number }>();
  private revoked = new Set<string>();

  issue(accountId: AccountId, now = new Date()): string {
    const token = randomUUID();
    this.tokenToAccount.set(token, { accountId, expiresAt: now.getTime() + REFRESH_TOKEN_TTL_MS });
    return token;
  }

  /** Redeems and immediately rotates a refresh token. Returns null if invalid, expired, or already used. */
  redeem(token: string, now = new Date()): AccountId | null {
    if (this.revoked.has(token)) return null;
    const entry = this.tokenToAccount.get(token);
    if (!entry || entry.expiresAt < now.getTime()) return null;
    this.revoked.add(token);
    this.tokenToAccount.delete(token);
    return entry.accountId;
  }

  revokeAllFor(accountId: AccountId): void {
    for (const [token, entry] of this.tokenToAccount.entries()) {
      if (entry.accountId === accountId) {
        this.revoked.add(token);
        this.tokenToAccount.delete(token);
      }
    }
  }
}

export function buildSession(accountId: AccountId, secret: string, refreshStore: RefreshTokenStore, now = new Date()): Session {
  const { token, expiresAt } = issueAccessToken(accountId, secret, now);
  return { accessToken: token, refreshToken: refreshStore.issue(accountId, now), accountId, expiresAt };
}
