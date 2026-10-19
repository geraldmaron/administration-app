import { describe, expect, it } from "vitest";
import { worldDataset } from "@admin/world";
import { MISSILE_REACH, missileRangeKm, withinMissileReach } from "./missile-reach.js";
import { propensityFor } from "./propensity.js";
import { requireAny } from "./instrument-gates.js";
// Reach a government's missiles give it, from a sourced row per government,
// and the difference it makes to whether force is on the table at all.
const byId = new Map(worldDataset.nations.map((nation) => [nation.id, nation]));
const nation = (id) => byId.get(id);
describe("missile reach", () => {
    it("cites an opened source and its date on every row, for a government on the roster", () => {
        for (const row of MISSILE_REACH) {
            expect(row.source, row.nation).toMatch(/^https:\/\/missilethreat\.csis\.org\/country\/[a-z-]+\/$/);
            expect(row.opened, row.nation).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(row.rangeKm, row.nation).toBeGreaterThan(0);
            expect(byId.has(row.nation), row.nation).toBe(true);
        }
    });
    it("reaches a regional capital a medium-range arsenal covers, and not one an ocean away", () => {
        expect(withinMissileReach(nation("IRN"), nation("ISR"))).toBe(true);
        expect(withinMissileReach(nation("IRN"), nation("USA"))).toBe(false);
        expect(withinMissileReach(nation("PRK"), nation("USA"))).toBe(true);
    });
    it("reaches the United States through a country hosting its forces nearby", () => {
        expect(withinMissileReach(nation("IRN"), nation("USA"), [nation("QAT")])).toBe(true);
    });
    it("gives no reach to a government the table records none for", () => {
        expect(missileRangeKm("CUB")).toBe(0);
        expect(withinMissileReach(nation("CUB"), nation("USA"))).toBe(false);
    });
    it("makes force likelier against a capital in range than against one out of it", () => {
        const iran = nation("IRN");
        expect(propensityFor("military", iran, nation("ISR"))).toBeGreaterThan(propensityFor("military", { ...iran, id: "ZZZ" }, nation("ISR")));
    });
    it("opens a gate either way in, and names the first way's shortfall where neither is open", () => {
        expect(requireAny({ ok: false, missingCapability: "air" }, { ok: true }).ok).toBe(true);
        expect(requireAny({ ok: false, missingCapability: "air" }, { ok: false, missingCapability: "missiles" })).toEqual({ ok: false, missingCapability: "air" });
    });
});
