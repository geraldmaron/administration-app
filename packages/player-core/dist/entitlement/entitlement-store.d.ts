import type { EntitlementState } from "@admin/contracts";
import type { StoragePort } from "../persistence/save-store";
export type EntitlementSource = "none" | "dev-override" | EntitlementState["source"];
export type EntitlementSnapshot = {
    readonly godMode: boolean;
    readonly source: EntitlementSource;
};
export declare const NO_ENTITLEMENTS: EntitlementSnapshot;
export declare const ENTITLEMENT_KEY = "administration.entitlements.v1";
export type EntitlementStore = {
    read(): Promise<EntitlementSnapshot>;
    /**
     * Turn the local development grant on or off. Distinct from a purchase on
     * purpose: there is no `grant()` here, because nothing on the client is
     * allowed to write a real entitlement.
     */
    setDevOverride(enabled: boolean): Promise<void>;
};
export declare function createEntitlementStore(storage: StoragePort, key?: string): EntitlementStore;
