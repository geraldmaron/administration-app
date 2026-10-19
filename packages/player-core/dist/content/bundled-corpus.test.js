import { describe, it, expect } from "vitest";
import { sha256Hex } from "../persistence/sha256";
import { BUNDLED_CONTENT_SET_ID, BUNDLED_SHARDS, BUNDLED_SHARD_DIGESTS, bundledCorpusScenarios } from "./bundled-corpus";
// The bake is generated from the built content set, so what these check is not
// the writing but the faithfulness: that the bytes in the binary are the bytes
// the manifest published, and that every one of them is a scenario the desk
// can actually deal.
describe("the corpus baked into this build", () => {
    it("names the content set it was baked from", () => {
        expect(BUNDLED_CONTENT_SET_ID).toMatch(/\S/);
        expect(BUNDLED_SHARDS.length).toBeGreaterThan(0);
    });
    // The digest is what delivery compares a published shard against to decide
    // whether fetching it would buy anything. A baked body that does not hash to
    // its recorded digest would make every one of those comparisons a guess.
    it("hashes to the digests it carries", () => {
        for (const shard of BUNDLED_SHARDS) {
            expect(sha256Hex(shard.jsonl)).toBe(shard.sha256);
            expect(BUNDLED_SHARD_DIGESTS.get(shard.shardId)).toBe(shard.sha256);
        }
    });
    // Delivery drops a line it cannot parse on purpose, which means a bad line
    // baked into the binary would cost a scenario with nothing to say so.
    it("parses every line it carries, losing none of them", () => {
        const lines = BUNDLED_SHARDS.reduce((sum, shard) => sum + shard.jsonl.split("\n").filter((line) => line.trim().length > 0).length, 0);
        expect(bundledCorpusScenarios()).toHaveLength(lines);
    });
    it("holds distinct scenarios, not a shard repeated", () => {
        const ids = new Set(bundledCorpusScenarios().map((def) => def.id));
        expect(ids.size).toBe(bundledCorpusScenarios().length);
    });
});
