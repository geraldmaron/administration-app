import { describe, expect, it } from "vitest";
import { COHORT_AXIS, COHORT_IDS } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { CHANNEL_REACH, DOMESTIC_CHANNELS, channelAffinity } from "./cohort-channels.js";
import { routeDomestic } from "./domestic-signature.js";
import { apply } from "./effects.js";
import { LEGISLATIVE_ACTS } from "./legislative-acts.js";
import { FURTHER_US_ORDERS } from "./order-families.js";
import { EXECUTIVE_ORDERS } from "./orders.js";
import { selectApproval } from "./opinion.js";
import { routeCohorts } from "./route-cohorts.js";
const DEMOGRAPHIC_AXES = ["race", "sex", "nativity", "disability", "veteran"];
const DEMOGRAPHIC_COHORTS = COHORT_IDS.filter((id) => DEMOGRAPHIC_AXES.includes(COHORT_AXIS[id]));
const signatures = () => [...LEGISLATIVE_ACTS, ...EXECUTIVE_ORDERS, ...FURTHER_US_ORDERS].flatMap((a) => (a.domestic ? [a.domestic] : []));
function strainBy(signature) {
    const campaign = buildCampaign();
    const routed = routeDomestic(campaign, signature);
    return Object.fromEntries(routeCohorts(campaign, signature, routed).map((effect) => [effect.cohort, (effect.addStrain?.weight ?? 0) * (effect.addStrain?.valence ?? 1)]));
}
describe("every demographic cohort is reached by a named channel (DECISIONS 5.8)", () => {
    it("reaches each of the thirteen new cohorts through at least one channel with real reach", () => {
        expect(DEMOGRAPHIC_COHORTS).toHaveLength(13);
        for (const cohort of DEMOGRAPHIC_COHORTS) {
            const strongest = Math.max(0, ...DOMESTIC_CHANNELS.map((channel) => CHANNEL_REACH[cohort][channel] ?? 0));
            // The unreached complements (U.S.-born, no disability, non-veteran) are the rest of their axis and
            // are reached by the sector and program terms; every cell with an identity of its own needs a channel.
            if (["us-born", "no-disability", "non-veteran", "race-white", "sex-male"].includes(cohort))
                continue;
            expect(strongest, cohort).toBeGreaterThanOrEqual(0.3);
        }
    });
    it("keeps every reach between zero and one and gives every cohort a row", () => {
        for (const cohort of COHORT_IDS) {
            for (const channel of DOMESTIC_CHANNELS) {
                const reach = CHANNEL_REACH[cohort][channel] ?? 0;
                expect(reach).toBeGreaterThanOrEqual(0);
                expect(reach).toBeLessThanOrEqual(1);
            }
        }
    });
    it("moves each channel by at least one act or order in the catalogue, so no channel is declared and unused", () => {
        for (const channel of DOMESTIC_CHANNELS) {
            expect(signatures().some((s) => (s.channels?.[channel] ?? 0) !== 0), channel).toBe(true);
        }
    });
    it("keeps every declared channel weight within minus one and one", () => {
        for (const s of signatures())
            for (const w of Object.values(s.channels ?? {}))
                expect(Math.abs(w)).toBeLessThanOrEqual(1);
    });
});
describe("what routing does with a channel", () => {
    const rights = { channels: { civilRights: 0.9 }, magnitude: "moderate", signature: "test:rights", reason: "r" };
    const entry = { channels: { immigration: -0.6 }, magnitude: "moderate", signature: "test:entry", reason: "e" };
    const veterans = { channels: { veterans: 0.9 }, magnitude: "moderate", signature: "test:vets", reason: "v" };
    it("lands an act on the cohorts its channel reaches and barely on the rest", () => {
        const s = strainBy(rights);
        expect(s["race-black"]).toBeGreaterThan(0);
        expect(s["with-disability"]).toBeGreaterThan(s["race-white"] ?? 0);
        expect(s["race-black"]).toBeGreaterThan((s["race-white"] ?? 0) * 2);
        expect(s["us-born"] ?? 0).toBe(0);
    });
    it("carries direction: restricting entry strains the cohorts it reaches and favors none of them", () => {
        const s = strainBy(entry);
        expect(s["foreign-born"]).toBeLessThan(0);
        // A cohort the channel only brushes (a Hispanic household may or may not include someone foreign-born)
        // falls under the strain floor at this size, so it carries less than the cohort the act is about.
        expect(Math.abs(s["race-hispanic"] ?? 0)).toBeLessThan(Math.abs(s["foreign-born"]));
        expect(s["us-born"] ?? 0).toBeGreaterThanOrEqual(s["foreign-born"]);
    });
    it("reaches veterans and not non-veterans", () => {
        const s = strainBy(veterans);
        expect(s["veteran"]).toBeGreaterThan(0);
        expect(s["non-veteran"] ?? 0).toBe(0);
    });
    it("never moves a state's lean, because demography does not derive lean", () => {
        for (const signature of [rights, entry, veterans])
            expect(routeDomestic(buildCampaign(), signature)).toEqual([]);
    });
    it("adds nothing for a signature that names no channel", () => {
        for (const cohort of COHORT_IDS)
            expect(channelAffinity(cohort, { magnitude: "light", signature: "x", reason: "x" })).toBe(0);
    });
    it("cannot move national approval: the channel strain is cohort memory only", () => {
        const campaign = buildCampaign();
        const effects = routeCohorts(campaign, rights, []);
        expect(effects.length).toBeGreaterThan(0);
        const after = effects.reduce((state, effect) => apply(state, { source: "action", actor: "player", turn: state.turn, narration: { summary: "t" }, effects: [effect] }), campaign);
        expect(selectApproval(after)).toBe(selectApproval(campaign));
    });
    it("is deterministic: the same signature routes to the same strains twice", () => {
        expect(strainBy(rights)).toEqual(strainBy(rights));
    });
});
describe("the catalogue reaches the new cohorts", () => {
    it("strains every identity cohort for at least one act or order that names a channel", () => {
        const reached = new Set();
        for (const signature of signatures().filter((s) => s.channels))
            for (const [cohort, w] of Object.entries(strainBy(signature)))
                if (Math.abs(w) > 0)
                    reached.add(cohort);
        for (const cohort of ["race-hispanic", "race-black", "race-asian", "race-other", "sex-female", "foreign-born", "with-disability", "veteran"]) {
            expect(reached.has(cohort), cohort).toBe(true);
        }
    });
});
describe("the channels' meanings", () => {
    it("names every channel", async () => {
        const { CHANNEL_MEANING } = await import("./cohort-channels.js");
        for (const channel of DOMESTIC_CHANNELS)
            expect(CHANNEL_MEANING[channel].length).toBeGreaterThan(10);
    });
});
