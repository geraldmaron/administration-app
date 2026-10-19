import type { EntitlementState } from "@admin/contracts";
import type { StoragePort } from "../persistence/save-store";

// What this device believes the account may do, and the seam the real answer
// arrives through.
//
// The client never decides it paid. `services/api` verifies a receipt with the
// platform and returns an `EntitlementState`; this module is the local cache of
// that decision plus the shape the app reads it through, so every surface is
// already written against the verified answer before the network call exists.
//
// The dev override is the only thing here that grants without a server, and it
// is honest about it: it resolves with `source: "dev-override"`, so a surface
// that reads it can say where the grant came from rather than dressing it up
// as an unlock. It exists so god mode is playable and testable before purchase
// flows land, not as a back door.

export type EntitlementSource = "none" | "dev-override" | EntitlementState["source"];

export type EntitlementSnapshot = {
  readonly godMode: boolean;
  readonly source: EntitlementSource;
};

export const NO_ENTITLEMENTS: EntitlementSnapshot = { godMode: false, source: "none" };

export const ENTITLEMENT_KEY = "administration.entitlements.v1";

export type EntitlementStore = {
  read(): Promise<EntitlementSnapshot>;
  /**
   * Turn the local development grant on or off. Distinct from a purchase on
   * purpose: there is no `grant()` here, because nothing on the client is
   * allowed to write a real entitlement.
   */
  setDevOverride(enabled: boolean): Promise<void>;
};

type StoredEntitlements = {
  readonly devOverride?: boolean;
  /** The last verified server answer, cached so an offline launch is not a downgrade. */
  readonly verified?: EntitlementState;
};

function parse(raw: string): StoredEntitlements {
  // An unreadable entitlement cache is a reason to ask the server again, never
  // a reason to fail a launch — and never a reason to grant.
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as StoredEntitlements;
  } catch {
    return {};
  }
}

function snapshotOf(stored: StoredEntitlements): EntitlementSnapshot {
  if (stored.verified?.godMode === true) return { godMode: true, source: stored.verified.source };
  if (stored.devOverride === true) return { godMode: true, source: "dev-override" };
  return NO_ENTITLEMENTS;
}

export function createEntitlementStore(storage: StoragePort, key: string = ENTITLEMENT_KEY): EntitlementStore {
  async function readStored(): Promise<StoredEntitlements> {
    const raw = await storage.getItem(key);
    return raw === null ? {} : parse(raw);
  }

  return {
    async read(): Promise<EntitlementSnapshot> {
      return snapshotOf(await readStored());
    },
    async setDevOverride(enabled: boolean): Promise<void> {
      const stored = await readStored();
      await storage.setItem(key, JSON.stringify({ ...stored, devOverride: enabled }));
    },
  };
}
