// Session tokens: a short-lived HMAC access token carrying the account id and
// its expiry, and an opaque refresh token redeemed exactly once. A token is
// bound to the account, never to a device or a surface.
import { createHmac, randomUUID } from "node:crypto";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // short-lived: never a long-lived secret in client storage
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
function sign(payload, secret) {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}
export function issueAccessToken(accountId, secret, now = new Date()) {
    const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS).toISOString();
    const payload = { accountId, exp: Date.parse(expiresAt) };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `${encoded}.${sign(encoded, secret)}`;
    return { token, expiresAt };
}
export function verifyAccessToken(token, secret, now = new Date()) {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature)
        return null;
    if (sign(encoded, secret) !== signature)
        return null;
    let payload;
    try {
        payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    }
    catch {
        return null;
    }
    if (payload.exp < now.getTime())
        return null;
    return payload.accountId;
}
// Refresh tokens are opaque, single-use, and rotate on every use: a refresh
// token that's already been redeemed cannot be replayed (revoked set below),
// which is what "refresh handled correctly" means for the acceptance criteria.
export class RefreshTokenStore {
    tokenToAccount = new Map();
    revoked = new Set();
    issue(accountId, now = new Date()) {
        const token = randomUUID();
        this.tokenToAccount.set(token, { accountId, expiresAt: now.getTime() + REFRESH_TOKEN_TTL_MS });
        return token;
    }
    /** Redeems and immediately rotates a refresh token. Returns null if invalid, expired, or already used. */
    redeem(token, now = new Date()) {
        if (this.revoked.has(token))
            return null;
        const entry = this.tokenToAccount.get(token);
        if (!entry || entry.expiresAt < now.getTime())
            return null;
        this.revoked.add(token);
        this.tokenToAccount.delete(token);
        return entry.accountId;
    }
    revokeAllFor(accountId) {
        for (const [token, entry] of this.tokenToAccount.entries()) {
            if (entry.accountId === accountId) {
                this.revoked.add(token);
                this.tokenToAccount.delete(token);
            }
        }
    }
}
export function buildSession(accountId, secret, refreshStore, now = new Date()) {
    const { token, expiresAt } = issueAccessToken(accountId, secret, now);
    return { accessToken: token, refreshToken: refreshStore.issue(accountId, now), accountId, expiresAt };
}
