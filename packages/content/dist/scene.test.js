import { describe, expect, it } from "vitest";
import { CORE_SCENARIOS } from "./packs/core.js";
import { classStillOverstates, sceneCandidates, sceneFacets, sceneKey } from "./scene.js";
const base = CORE_SCENARIOS.find((s) => s.id === "the-water-they-both-claim");
describe("the register a scenario is drawn at", () => {
    // The defect this whole axis exists for: a war scenario gated on nothing
    // worse than relationship tension rendered a shell-scarred street and a
    // burnt-out car, above an aircraft lost in open water.
    it("does not call a place damaged because the class is war", () => {
        expect(base.conditions.some((c) => c.kind === "warState")).toBe(false);
        expect(sceneFacets(base).register).toBe("strained");
    });
    it("calls it damaged once the country is actually in the war", () => {
        const atWar = { ...base, conditions: [...base.conditions, { kind: "warState", role: "defender" }] };
        expect(sceneFacets(atWar).register).toBe("damaged");
    });
    it("calls it damaged once a board condition is severe enough to have taken buildings", () => {
        const severe = { ...base, conditions: [{ kind: "conditionActive", atLeast: 0.7 }] };
        expect(sceneFacets(severe).register).toBe("damaged");
    });
    it("leaves a merely active condition alone — coping with something is not wreckage", () => {
        const mild = { ...base, conditions: [{ kind: "conditionActive", atLeast: 0.2 }] };
        expect(sceneFacets(mild).register).toBe("strained");
    });
    it("lets an author override the derivation for the case it cannot know", () => {
        const authored = { ...base, scene: { register: "ceremonial" } };
        expect(sceneFacets(authored).register).toBe("ceremonial");
    });
});
describe("what the briefing falls back to", () => {
    it("gives up the register before the site, because the site is printed in the dateline", () => {
        const candidates = sceneCandidates({ kind: "war", site: "chokepoint", register: "damaged" });
        const firstCapital = candidates.findIndex((k) => k.includes("capital"));
        const firstStrained = candidates.findIndex((k) => k.includes("strained"));
        expect(firstStrained).toBeGreaterThan(-1);
        expect(firstStrained).toBeLessThan(firstCapital);
    });
    it("ends at the bare class, which always exists", () => {
        expect(sceneCandidates(sceneFacets(base)).at(-1)).toBe("war");
    });
    it("never repeats a key when the facets already are the fallback", () => {
        const keys = sceneCandidates({ kind: "unrest", site: "capital", register: "strained" });
        expect(new Set(keys).size).toBe(keys.length);
    });
});
describe("refusing to overstate", () => {
    // The class still for war is a shell-scarred block. Hanging it above a
    // strained scenario is the original defect arriving through the fallback.
    it("rejects the war class still for a scenario that is only strained", () => {
        expect(classStillOverstates({ kind: "war", site: "chokepoint", register: "strained" })).toBe(true);
    });
    it("allows it once the scenario is actually damaged", () => {
        expect(classStillOverstates({ kind: "war", site: "chokepoint", register: "damaged" })).toBe(false);
    });
    it("allows a class whose still was never a catastrophe in the first place", () => {
        expect(classStillOverstates({ kind: "scandal", site: "capital", register: "intact" })).toBe(false);
        expect(classStillOverstates({ kind: "economy", site: "city", register: "strained" })).toBe(false);
    });
    // Names the scenarios that will show no photograph until coverage is bought
    // for their exact tuple, so the list is a decision someone made rather than
    // something discovered on the screen. Add a scenario whose class still would
    // overstate it and this fails until the tuple is listed or the still exists.
    it("leaves exactly the shipped scenarios we know about without a usable class still", () => {
        const blank = CORE_SCENARIOS.filter((def) => classStillOverstates(sceneFacets(def))).map((def) => sceneKey(sceneFacets(def)));
        expect(blank).toEqual(["war_chokepoint_strained"]);
    });
});
