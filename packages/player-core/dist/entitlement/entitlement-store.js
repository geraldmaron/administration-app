export const NO_ENTITLEMENTS = { godMode: false, source: "none" };
export const ENTITLEMENT_KEY = "administration.entitlements.v1";
function parse(raw) {
    // An unreadable entitlement cache is a reason to ask the server again, never
    // a reason to fail a launch — and never a reason to grant.
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null)
            return {};
        return parsed;
    }
    catch {
        return {};
    }
}
function snapshotOf(stored) {
    if (stored.verified?.godMode === true)
        return { godMode: true, source: stored.verified.source };
    if (stored.devOverride === true)
        return { godMode: true, source: "dev-override" };
    return NO_ENTITLEMENTS;
}
export function createEntitlementStore(storage, key = ENTITLEMENT_KEY) {
    async function readStored() {
        const raw = await storage.getItem(key);
        return raw === null ? {} : parse(raw);
    }
    return {
        async read() {
            return snapshotOf(await readStored());
        },
        async setDevOverride(enabled) {
            const stored = await readStored();
            await storage.setItem(key, JSON.stringify({ ...stored, devOverride: enabled }));
        },
    };
}
