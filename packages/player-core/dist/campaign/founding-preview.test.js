import { describe, expect, it } from "vitest";
import { sealFounding } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { DEFAULT_SEED, cabinetSlate, foundingOptions, openingChoices, openingFor, runningMateSlate } from "./founding-options";
import { previewFounding } from "./founding-preview";
describe("previewFounding", () => {
    const choices = openingChoices(foundingOptions(DEFAULT_SEED));
    it("is the campaign the oath would seal", () => {
        const named = { ...choices, leader: { ...choices.leader, name: "Preview Leader" } };
        const preview = previewFounding(DEFAULT_SEED, named);
        expect(preview).toEqual({ ok: true, campaign: sealFounding(DEFAULT_SEED, worldDataset, named) });
    });
    it("is the seal for every party and every choice the new founding asks", () => {
        for (const party of ["democrat", "republican", "independent"]) {
            const options = foundingOptions(DEFAULT_SEED);
            const leader = { ...choices.leader, name: `Preview ${party}`, party, homeState: "GA", presentation: "feminine" };
            const cabinet = openingChoices(options).cabinet;
            const staffed = {
                cabinet: party === "democrat" ? cabinet : Object.fromEntries(Object.entries(cabinetSlate(options, options.charters[0], options.nations[0], leader)).map(([role, list]) => [role, list[0].id])),
                leader,
                mandate: "narrow",
            };
            const runningMate = runningMateSlate(options, staffed)[1]?.person.id;
            const full = runningMate ? { ...staffed, runningMate } : staffed;
            const preview = previewFounding(DEFAULT_SEED, full);
            expect(preview, party).toEqual({ ok: true, campaign: sealFounding(DEFAULT_SEED, worldDataset, full) });
        }
    });
    it("prices the opening on the rail exactly as the seal opens it", () => {
        const named = { ...choices, leader: { ...choices.leader, name: "Rail Leader", backgroundId: "path-general", age: 60 } };
        const rail = openingFor(foundingOptions(DEFAULT_SEED), named);
        const sealed = sealFounding(DEFAULT_SEED, worldDataset, named);
        expect(rail.metrics).toEqual(sealed.player.metrics);
        expect(rail.contributions.some((line) => line.reason.includes("four stars"))).toBe(true);
    });
    it("returns the seal's own refusals instead of throwing", () => {
        const preview = previewFounding(DEFAULT_SEED, choices);
        expect(preview.ok).toBe(false);
        if (!preview.ok)
            expect(preview.rejections.map((r) => r.subject)).toContain("leader");
    });
});
