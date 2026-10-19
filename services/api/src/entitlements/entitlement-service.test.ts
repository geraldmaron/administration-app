import { describe, it, expect } from "vitest";
import type { EntitlementClaim, ReceiptVerification, StorePlatform } from "@admin/contracts";
import { verifiersFromEnv } from "./config.js";
import { EntitlementService, GOD_MODE_PRODUCT_ID } from "./entitlement-service.js";
import { InMemoryEntitlementStore } from "./store.js";
import type { ReceiptVerifier } from "./verifiers/types.js";

function verifier(platform: StorePlatform, answer: ReceiptVerification): ReceiptVerifier {
  return { platform, verify: async () => answer };
}

const VALID: ReceiptVerification = {
  status: "valid",
  transactionId: "txn-1",
  productId: GOD_MODE_PRODUCT_ID,
  purchasedAt: "2026-08-01T00:00:00.000Z",
};

function claim(overrides: Partial<EntitlementClaim> = {}): EntitlementClaim {
  return { platform: "steam", receipt: "ticket-1", productId: GOD_MODE_PRODUCT_ID, ...overrides };
}

function serviceWith(...verifiers: ReceiptVerifier[]) {
  return new EntitlementService(new InMemoryEntitlementStore(), verifiers);
}

// A wire payload from a patched client, carrying every field such a client
// would try. The service reads none of them, because the only route to a grant
// runs through a verifier's answer about the receipt.
function forgedClaim(): EntitlementClaim {
  return JSON.parse(
    JSON.stringify({
      platform: "steam",
      receipt: "totally-made-up",
      productId: GOD_MODE_PRODUCT_ID,
      entitled: true,
      godMode: true,
      entitlements: [{ key: "god-mode", platform: "steam", grantedAt: "2026-08-01", transactionId: "forged" }],
      verified: true,
    }),
  ) as EntitlementClaim;
}

describe("EntitlementService — server-verified grants", () => {
  it("grants god mode on a receipt Steam confirms", async () => {
    const service = serviceWith(verifier("steam", VALID));
    const result = await service.redeem("acct_1", claim());
    expect(result.status).toBe("granted");
    if (result.status !== "granted") return;
    expect(result.entitlement.platform).toBe("steam");
    expect((await service.resolve("acct_1")).godMode).toBe(true);
  });

  it("a product this service does not sell is refused before any store is called", async () => {
    let called = false;
    const service = serviceWith({
      platform: "steam",
      verify: async () => {
        called = true;
        return VALID;
      },
    });
    const result = await service.redeem("acct_1", claim({ productId: "com.example.something-else" }));
    expect(result.status).toBe("refused");
    expect(called).toBe(false);
  });

  it("an empty receipt is refused", async () => {
    const service = serviceWith(verifier("steam", VALID));
    expect((await service.redeem("acct_1", claim({ receipt: "  " }))).status).toBe("refused");
  });
});

describe("EntitlementService — nothing grants without a verifier", () => {
  it("the deployment as configured today verifies nothing, so a Steam claim grants nothing", async () => {
    const store = new InMemoryEntitlementStore();
    const service = new EntitlementService(store, verifiersFromEnv({}));
    const result = await service.redeem("acct_1", claim());
    expect(result.status).toBe("verification-unavailable");
    expect(await store.listFor("acct_1")).toEqual([]);
    expect((await service.resolve("acct_1")).godMode).toBe(false);
  });

  it("a forged claim with no verifier configured is not waved through", async () => {
    const service = serviceWith();
    expect((await service.redeem("acct_1", forgedClaim())).status).toBe("verification-unavailable");
    const state = await service.resolve("acct_1");
    expect(state.godMode).toBe(false);
    expect(state.entitlements).toEqual([]);
  });

  it("a claim naming a platform this deployment has no verifier for grants nothing", async () => {
    const service = serviceWith(verifier("steam", VALID));
    const unknown = { ...claim(), platform: "not-a-store" } as unknown as EntitlementClaim;
    expect((await service.redeem("acct_1", unknown)).status).toBe("verification-unavailable");
    expect((await service.resolve("acct_1")).godMode).toBe(false);
  });
});

describe("EntitlementService — a modified client cannot grant itself god mode", () => {
  it("a forged claim asserting entitlement is refused: only the receipt decides", async () => {
    const service = serviceWith(
      verifier("steam", { status: "invalid", reason: "Steam does not report this account owning the product" }),
    );

    const result = await service.redeem("acct_1", forgedClaim());
    expect(result.status).toBe("refused");
    if (result.status !== "refused") return;
    expect(result.reason).toContain("does not report this account owning");

    const state = await service.resolve("acct_1");
    expect(state.godMode).toBe(false);
    expect(state.entitlements).toEqual([]);
  });

  it("someone else's verified purchase cannot be attached to a second account", async () => {
    const service = serviceWith(verifier("steam", VALID));
    expect((await service.redeem("acct_1", claim())).status).toBe("granted");

    const stolen = await service.redeem("acct_2", claim());
    expect(stolen.status).toBe("refused");
    if (stolen.status !== "refused") return;
    expect(stolen.reason).toContain("another account");
    expect((await service.resolve("acct_2")).godMode).toBe(false);
  });
});

describe("EntitlementService — restore, reinstall, and degraded verification", () => {
  it("presenting the same receipt again is idempotent, which is what restore does", async () => {
    const service = serviceWith(verifier("steam", VALID));
    const first = await service.redeem("acct_1", claim());
    const second = await service.redeem("acct_1", claim());

    expect(first.status).toBe("granted");
    expect(second.status).toBe("already-held");
    expect((await service.resolve("acct_1")).entitlements).toHaveLength(1);
  });

  it("the entitlement is bound to the account, so a reinstall on any surface still holds it", async () => {
    const store = new InMemoryEntitlementStore();
    const bought = new EntitlementService(store, [verifier("steam", VALID)]);
    await bought.redeem("acct_1", claim());

    // A fresh install talking to the same backend: no device identity anywhere
    // in this call, which is the whole point.
    const afterReinstall = await new EntitlementService(store, []).resolve("acct_1");
    expect(afterReinstall.godMode).toBe(true);
    expect(afterReinstall.source).toBe("server");
  });

  it("an unreachable store does not grant, and does not revoke what is already held", async () => {
    const store = new InMemoryEntitlementStore();
    await new EntitlementService(store, [verifier("steam", VALID)]).redeem("acct_1", claim());

    const degraded = new EntitlementService(store, [
      verifier("steam", { status: "unavailable", reason: "Steam returned 503" }),
    ]);
    const retry = await degraded.redeem("acct_1", claim({ receipt: "ticket-2" }));
    expect(retry.status).toBe("verification-unavailable");

    // The legitimate purchaser is not locked out by the outage.
    expect((await degraded.resolve("acct_1")).godMode).toBe(true);
    expect((await degraded.resolve("acct_2")).godMode).toBe(false);
  });

  it("the cached answer is labeled as cached rather than passed off as a fresh check", async () => {
    const store = new InMemoryEntitlementStore();
    const service = new EntitlementService(store, [verifier("steam", VALID)]);
    await service.redeem("acct_1", claim());
    const server = await service.resolve("acct_1");

    const cached = EntitlementService.fromCache(server.entitlements);
    expect(cached.godMode).toBe(true);
    expect(cached.source).toBe("cached");
    expect(EntitlementService.fromCache([]).godMode).toBe(false);
  });
});
