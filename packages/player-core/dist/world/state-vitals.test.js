import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { stateVitals } from "./state-vitals";
const base = openingCampaign();
const firstStateId = Object.keys(base.states)[0];
function withAnchor(unemployment, crimeIndex, costOfLiving) {
    const runtime = base.states[firstStateId];
    return {
        ...base,
        states: {
            ...base.states,
            [firstStateId]: {
                ...runtime,
                base: { ...runtime.base, character: { ...runtime.base.character, vitalAnchor: { unemployment, crimeIndex, costOfLiving } } },
            },
        },
    };
}
describe("stateVitals", () => {
    it("reads three bands for a founded state", () => {
        const vitals = stateVitals(base, firstStateId);
        expect(vitals?.map((vital) => vital.key)).toEqual(["jobs", "prices", "crime"]);
    });
    it("is undefined for a state id the campaign carries no runtime for", () => {
        expect(stateVitals(base, "STATE-NOT-REAL")).toBeUndefined();
    });
    it("reads a quiet, cheap, fully employed state with no deviation as favorable across all three", () => {
        const calm = withAnchor(-0.2, -0.5, -0.5);
        const vitals = stateVitals(calm, firstStateId);
        expect(vitals.every((vital) => vital.stance === "favorable")).toBe(true);
    });
    it("carries a real deviation through, not just a label: a state anchored ten points above the country's own unemployment reads adverse", () => {
        const harsh = withAnchor(0.4, 0.4, 0.4);
        const vitals = stateVitals(harsh, firstStateId);
        expect(vitals.find((vital) => vital.key === "jobs").stance).toBe("adverse");
        expect(vitals.find((vital) => vital.key === "crime").stance).toBe("adverse");
        expect(vitals.find((vital) => vital.key === "prices").stance).toBe("adverse");
    });
});
