import { describe, it, expect } from "vitest";
import type { StoragePort } from "../persistence/save-store";
import { ENTITLEMENT_KEY, createEntitlementStore } from "./entitlement-store";

function memoryStorage(seed: Record<string, string> = {}): StoragePort & { readonly cells: Map<string, string> } {
  const cells = new Map(Object.entries(seed));
  return {
    cells,
    async getItem(key) {
      return cells.get(key) ?? null;
    },
    async setItem(key, value) {
      cells.set(key, value);
    },
    async removeItem(key) {
      cells.delete(key);
    },
  };
}

describe("the client entitlement seam", () => {
  it("grants nothing by default", async () => {
    const store = createEntitlementStore(memoryStorage());
    expect(await store.read()).toEqual({ godMode: false, source: "none" });
  });

  it("the development grant is honest about where it came from", async () => {
    const store = createEntitlementStore(memoryStorage());
    await store.setDevOverride(true);
    expect(await store.read()).toEqual({ godMode: true, source: "dev-override" });
    await store.setDevOverride(false);
    expect(await store.read()).toEqual({ godMode: false, source: "none" });
  });

  it("a verified server answer reports its own source and outranks the local grant", async () => {
    const storage = memoryStorage({
      [ENTITLEMENT_KEY]: JSON.stringify({
        devOverride: false,
        verified: { godMode: true, source: "server", entitlements: [] },
      }),
    });
    expect(await createEntitlementStore(storage).read()).toEqual({ godMode: true, source: "server" });
  });

  it("a cached server answer still grants, so an offline launch is not a downgrade", async () => {
    const storage = memoryStorage({
      [ENTITLEMENT_KEY]: JSON.stringify({ verified: { godMode: true, source: "cached", entitlements: [] } }),
    });
    expect(await createEntitlementStore(storage).read()).toEqual({ godMode: true, source: "cached" });
  });

  it("unreadable or hostile stored entitlements grant nothing rather than failing the launch", async () => {
    for (const raw of ["not json", "null", '"godMode"', JSON.stringify({ godMode: true }), JSON.stringify([1, 2])]) {
      const store = createEntitlementStore(memoryStorage({ [ENTITLEMENT_KEY]: raw }));
      expect(await store.read()).toEqual({ godMode: false, source: "none" });
    }
  });

  it("turning the development grant off leaves any verified answer intact", async () => {
    const storage = memoryStorage({
      [ENTITLEMENT_KEY]: JSON.stringify({
        devOverride: true,
        verified: { godMode: true, source: "server", entitlements: [] },
      }),
    });
    const store = createEntitlementStore(storage);
    await store.setDevOverride(false);
    expect(await store.read()).toEqual({ godMode: true, source: "server" });
  });
});
