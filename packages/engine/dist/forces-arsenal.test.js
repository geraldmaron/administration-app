import { describe, expect, it } from "vitest";
import { ISRAEL_ID, RUSSIA_ID, worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { declaredWarheads } from "./forces.js";
// A government that has never declared its arsenal is credited with no count
// on any surface; every reader that prints a count reads it through here.
describe("an undeclared arsenal", () => {
    const { campaign } = foundedForBalance("arsenal");
    it("is Israel's in the dataset", () => {
        expect(worldDataset.nations.find((nation) => nation.id === ISRAEL_ID)?.stats.military.arsenal.declared).toBe(false);
    });
    it("reads as no count through the selector, while a declared one reads its count", () => {
        expect(declaredWarheads(campaign, ISRAEL_ID)).toBeUndefined();
        expect(declaredWarheads(campaign, RUSSIA_ID)).toBe(campaign.nations[RUSSIA_ID].stats.military.arsenal.warheads);
    });
    it("keeps the count on the record for the rules that read it", () => {
        expect(campaign.nations[ISRAEL_ID].stats.military.arsenal.warheads).toBeTypeOf("number");
    });
});
