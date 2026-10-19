import { describe, expect, it } from "vitest";
import { gazetteerEffects, domesticSignatureEffects } from "./scenario-gazetteer.js";
import { castBound } from "./scenario-cast.js";
import { ScenarioDef } from "./scenario.js";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
// Compiles a closed gazetteer recipe into City / State / Sector effects, and a
// DomesticSignature into routed StateEffects plus CohortEffects beside them.
describe("gazetteerEffects", () => {
    it("compiles city, state, and sector recipes when the locus names all three", () => {
        const campaign = sealedCampaign("gazetteer-compile");
        const effects = gazetteerEffects(campaign, plantHolidayScenario, {
            cityEmployment: 4000,
            taxHolidayYears: 10,
            adminLean: 0.05,
            stateLean: 0.04,
            sectorEmployment: -2000,
            sectorLaborPressure: 0.08,
        }, "the plant stayed");
        expect(effects.some((effect) => effect.kind === "city" && effect.city === "CITY-USA-pittsburgh")).toBe(true);
        expect(effects.some((effect) => effect.kind === "state" && effect.state === "PA")).toBe(true);
        expect(effects.some((effect) => effect.kind === "sector" && effect.sector === "steel-heavy")).toBe(true);
    });
    it("does not emit a state or sector effect when the locus left that bind off", () => {
        const campaign = sealedCampaign("gazetteer-unbound");
        const unbound = {
            ...plantHolidayScenario,
            locus: { ...plantHolidayScenario.locus, state: undefined, sector: undefined },
        };
        const effects = gazetteerEffects(campaign, unbound, { stateLean: 0.04, sectorEmployment: -2000 }, "the plant stayed");
        expect(effects.some((effect) => effect.kind === "state")).toBe(false);
        expect(effects.some((effect) => effect.kind === "sector")).toBe(false);
    });
});
describe("domesticSignatureEffects", () => {
    const steel = {
        axes: { industrial: 1 },
        sectors: ["steel-heavy"],
        magnitude: "heavy",
        signature: "steel-scare:test",
        reason: "the mills were named",
    };
    it("routes StateEffects with the signature's mark slug and CohortEffects beside them", () => {
        const campaign = sealedCampaign("domestic-compile");
        const effects = domesticSignatureEffects(campaign, steel);
        expect(effects.length).toBeGreaterThan(0);
        const states = effects.filter((effect) => effect.kind === "state");
        const cohorts = effects.filter((effect) => effect.kind === "cohort");
        expect(states.length).toBeGreaterThan(0);
        expect(cohorts.length).toBeGreaterThan(0);
        const marked = states.filter((effect) => effect.kind === "state" && effect.addMark?.signature === "steel-scare:test");
        expect(marked.length).toBe(states.length);
    });
    it("is byte-identical across runs on the same campaign", () => {
        const campaign = sealedCampaign("domestic-determinism");
        expect(domesticSignatureEffects(campaign, steel)).toEqual(domesticSignatureEffects(campaign, steel));
    });
    it("moves the steel belt for an industrial signature", () => {
        const campaign = sealedCampaign("domestic-concentration");
        const effects = domesticSignatureEffects(campaign, steel);
        const ids = new Set(effects.filter((effect) => effect.kind === "state").map((e) => e.state));
        for (const id of ["PA", "OH", "IN", "MI"]) {
            expect(ids.has(id), id).toBe(true);
        }
    });
});
describe("cast splices domestic beside gazetteer", () => {
    it("puts routed StateEffects on the reply's resolved list next to CityEffects", () => {
        const withDomestic = ScenarioDef.parse({
            ...plantHolidayScenario,
            replies: plantHolidayScenario.replies.map((reply, index) => index === 0
                ? {
                    ...reply,
                    commitment: {
                        ...reply.commitment,
                        domestic: {
                            axes: { industrial: 1 },
                            sectors: ["steel-heavy"],
                            magnitude: "heavy",
                            signature: "steel-scare:pittsburgh",
                            reason: "The mills were promised jobs and Pennsylvania remembers.",
                        },
                    },
                }
                : reply),
        });
        const campaign = sealedCampaign("domestic-cast-splice");
        const cast = castBound(campaign, withDomestic, campaign.founding.nation);
        const option = cast.script.options.find((entry) => entry.id === "approve-ten");
        expect(option?.commitment.kind).toBe("position");
        if (option?.commitment.kind !== "position")
            return;
        const resolved = option.commitment.resolved ?? [];
        expect(resolved.some((effect) => effect.kind === "city" && effect.city === "CITY-USA-pittsburgh")).toBe(true);
        expect(resolved.some((effect) => effect.kind === "state" && effect.addMark?.signature === "steel-scare:pittsburgh")).toBe(true);
        // Authored domestic is stripped; only compiled effects remain.
        expect("domestic" in option.commitment).toBe(false);
    });
});
