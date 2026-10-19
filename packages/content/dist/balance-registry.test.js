import { describe, expect, it } from "vitest";
import { BALANCE_REGISTRY } from "./balance-registry.js";
// This registry cannot drift from the constants it catalogs the way an
// authored figure can drift from a schema — every `value` here IS the import,
// not a retyped copy — so what this test actually guards is the metadata: no
// entry with a hollow reason, no entry claiming a layer that doesn't exist,
// no duplicate id silently shadowing an earlier one.
const LAYERS = ["global", "mechanic", "catalogue", "derivation"];
describe("the balance registry", () => {
    it("has more than a token number of entries", () => {
        expect(BALANCE_REGISTRY.length).toBeGreaterThan(20);
    });
    it("gives every entry a real reason, not a restated name", () => {
        for (const entry of BALANCE_REGISTRY) {
            expect(entry.governs.length, entry.id).toBeGreaterThan(15);
            expect(entry.governs.toLowerCase(), entry.id).not.toBe(entry.id.toLowerCase());
        }
    });
    it("claims only a real layer", () => {
        for (const entry of BALANCE_REGISTRY) {
            expect(LAYERS, entry.id).toContain(entry.layer);
        }
    });
    it("has no duplicate id", () => {
        const ids = BALANCE_REGISTRY.map((entry) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
    it("names a real file for every entry", () => {
        for (const entry of BALANCE_REGISTRY) {
            expect(entry.file, entry.id).toMatch(/^(engine|content)\/[\w-]+\.ts$/);
        }
    });
    it("carries a defined value for every entry — nothing pointing at an unexported constant", () => {
        for (const entry of BALANCE_REGISTRY) {
            expect(entry.value, entry.id).toBeDefined();
        }
    });
    it("has at least one entry at every layer, so the methodology's own ordering is exercised", () => {
        for (const layer of LAYERS) {
            expect(BALANCE_REGISTRY.some((entry) => entry.layer === layer), layer).toBe(true);
        }
    });
});
