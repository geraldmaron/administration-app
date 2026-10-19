import { describe, it, expect } from "vitest";
import { auditStarterPack, checkManifestCompatibility, lazyEntries, starterPack } from "./manifest.js";
function manifest(overrides = {}) {
    return {
        contentSetId: "set-2026-08",
        schemaVersion: 3,
        manifestRevision: 12,
        generatedAt: "2026-08-01T00:00:00.000Z",
        entries: [
            {
                poolKey: "crisis.core",
                shardId: "000",
                path: "/content/set-2026-08/crisis.core/000.json",
                bytes: 1024,
                sha256: "a".repeat(64),
                itemCount: 40,
                bundled: true,
                requires: ["conversation.core"],
            },
            {
                poolKey: "conversation.core",
                shardId: "000",
                path: "/content/set-2026-08/conversation.core/000.json",
                bytes: 2048,
                sha256: "b".repeat(64),
                itemCount: 30,
                bundled: true,
                requires: [],
            },
            {
                poolKey: "crisis.economic",
                shardId: "004",
                path: "/content/set-2026-08/crisis.economic/004.json",
                bytes: 4096,
                sha256: "c".repeat(64),
                itemCount: 120,
                bundled: false,
                requires: ["conversation.core"],
            },
        ],
        images: [
            { imageId: "portrait-fallback", path: "/img/portrait-fallback.png", bytes: 500, sha256: "d".repeat(64), bundled: true },
            { imageId: "brief-caracas", path: "/img/brief-caracas.png", bytes: 90_000, sha256: "e".repeat(64), bundled: false },
        ],
        ...overrides,
    };
}
describe("manifest versioning", () => {
    it("accepts a content set built for this client", () => {
        expect(checkManifestCompatibility(manifest(), 3).status).toBe("ok");
    });
    it("refuses a content set newer than the app, with a message that says what to do", () => {
        const result = checkManifestCompatibility(manifest({ schemaVersion: 5 }), 3);
        expect(result.status).toBe("client-too-old");
        if (result.status !== "client-too-old")
            return;
        expect(result.message).toContain("Update the app");
        expect(result.manifestSchemaVersion).toBe(5);
    });
    it("names stale content as stale content rather than telling the player to update", () => {
        const result = checkManifestCompatibility(manifest({ schemaVersion: 1 }), 3);
        expect(result.status).toBe("content-too-old");
        if (result.status !== "content-too-old")
            return;
        expect(result.message).not.toContain("Update the app");
    });
});
describe("the offline starter pack", () => {
    it("bundled shards are self-contained: nothing they reach for needs the network", () => {
        const audit = auditStarterPack(manifest());
        expect(audit.status).toBe("self-contained");
        if (audit.status !== "self-contained")
            return;
        expect(audit.poolKeys).toContain("crisis.core");
        expect(audit.poolKeys).toContain("conversation.core");
    });
    it("a bundled shard that depends on a non-bundled pool fails the audit", () => {
        const broken = manifest();
        const audit = auditStarterPack({
            ...broken,
            entries: broken.entries.map((entry) => entry.poolKey === "conversation.core" ? { ...entry, bundled: false } : entry),
        });
        expect(audit.status).toBe("incomplete");
        if (audit.status !== "incomplete")
            return;
        expect(audit.missing).toEqual(["conversation.core"]);
    });
    it("a content set that bundles nothing fails the audit rather than shipping an unplayable install", () => {
        const empty = manifest();
        const audit = auditStarterPack({
            ...empty,
            entries: empty.entries.map((entry) => ({ ...entry, bundled: false })),
        });
        expect(audit.status).toBe("incomplete");
    });
    it("splits bundled from lazy entries", () => {
        expect(starterPack(manifest())).toHaveLength(2);
        expect(lazyEntries(manifest())).toHaveLength(1);
    });
});
