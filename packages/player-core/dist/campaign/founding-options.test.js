import { describe, it, expect } from "vitest";
import { validateFounding } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { DEFAULT_SEED, foundingOptions, openingChoices, } from "./founding-options";
import { openingCampaign } from "../__fixtures__/opening";
describe("founding options", () => {
    const options = foundingOptions(DEFAULT_SEED);
    it("offers only what the shipped dataset actually contains", () => {
        expect(options.nations.length).toBeGreaterThan(0);
        expect(options.nations.every((nation) => nation.playable)).toBe(true);
        expect(options.charters).toEqual(worldDataset.charters);
        expect(options.cradles).toEqual(worldDataset.cradles);
    });
    // The opening slate is complete in everything setup can decide for the
    // player — the constitution, the homeland, a full bench of Cabinet
    // nominees — and blank in the one thing it must not: who they are.
    it("opens on a slate the engine accepts once the player has named themselves", () => {
        const choices = openingChoices(options);
        const named = { ...choices, leader: { ...choices.leader, name: "Ilsabet Ferran" } };
        const validation = validateFounding(worldDataset, named, options.pool);
        expect(validation.rejections).toEqual([]);
        expect(validation.ok).toBe(true);
    });
    it("refuses to open unnamed, so no founding seals on a name nobody chose", () => {
        const validation = validateFounding(worldDataset, openingChoices(options), options.pool);
        expect(validation.ok).toBe(false);
        expect(validation.rejections.map((r) => r.subject)).toContain("leader");
    });
    // Setup no longer offers the constitution, the homeland or the compacts as
    // choices, so the pinned slate has to be the right one on its own.
    it("pins the nation's own constitution and its single homeland", () => {
        const choices = openingChoices(options);
        const nation = options.nations[0];
        expect(choices.charterId).toBe(nation.identity.government);
        expect(options.cradles).toHaveLength(1);
        expect(choices.cradleId).toBe(options.cradles[0].id);
        expect(choices.compactIds).toEqual([]);
    });
    it("seals the same campaign twice from the same seed", () => {
        expect(openingCampaign()).toEqual(openingCampaign());
    });
    it("names the player's nation in the sealed campaign", () => {
        const campaign = openingCampaign();
        expect(campaign.nations[campaign.founding.nation]).toBeDefined();
    });
});
