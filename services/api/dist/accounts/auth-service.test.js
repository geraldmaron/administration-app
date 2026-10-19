import { describe, it, expect } from "vitest";
import { AuthService } from "./auth-service.js";
import { InMemoryAccountStore } from "./store.js";
import { requiresAccount } from "./types.js";
const SECRET = "test-secret-not-for-prod";
function makeService() {
    return new AuthService(new InMemoryAccountStore(), SECRET);
}
describe("AuthService", () => {
    it("recognizes the same account's session across surfaces", async () => {
        const service = makeService();
        const { account, session } = await service.signUpOrSignIn("player@example.com");
        // "Presented from web" and "presented from iOS" are the same call here —
        // the token isn't bound to a surface, which is the point.
        const recognizedOnWeb = service.verifySession(session.accessToken);
        const recognizedOnIOS = service.verifySession(session.accessToken);
        expect(recognizedOnWeb).toBe(account.id);
        expect(recognizedOnIOS).toBe(account.id);
    });
    it("signing in twice with the same email returns the same account, not a duplicate", async () => {
        const service = makeService();
        const first = await service.signUpOrSignIn("player@example.com");
        const second = await service.signUpOrSignIn("player@example.com");
        expect(second.account.id).toBe(first.account.id);
    });
    it("rejects a forged or expired access token", () => {
        const service = makeService();
        expect(service.verifySession("not-a-real-token")).toBeNull();
        expect(service.verifySession("Zm9v.YmFy")).toBeNull();
    });
    it("refresh rotates the token: the old refresh token cannot be replayed", async () => {
        const service = makeService();
        const { session } = await service.signUpOrSignIn("player@example.com");
        const refreshed = service.refresh(session.refreshToken);
        expect(refreshed).not.toBeNull();
        expect(refreshed.refreshToken).not.toBe(session.refreshToken);
        // Replaying the original refresh token must fail now.
        const replay = service.refresh(session.refreshToken);
        expect(replay).toBeNull();
    });
    it("account deletion removes what it claims to: email is freed, sessions can't refresh", async () => {
        const service = makeService();
        const { account, session } = await service.signUpOrSignIn("player@example.com");
        await service.deleteAccount(account.id);
        expect(service.refresh(session.refreshToken)).toBeNull();
        // The email is free again — a new signup with the same address gets a new account.
        const resignup = await service.signUpOrSignIn("player@example.com");
        expect(resignup.account.id).not.toBe(account.id);
    });
    it("play works without an account; entitlement requires one", () => {
        expect(requiresAccount("play")).toBe(false);
        expect(requiresAccount("god-mode-entitlement")).toBe(true);
    });
});
