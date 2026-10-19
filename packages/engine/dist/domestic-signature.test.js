// routeDomestic: determinism, concentration, movement floor, and the per-act cap.
import { describe, expect, it } from "vitest";
import { STATE_IDS } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { MAGNITUDE_STEP, STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP, routeDomestic, stateAffinity, stateValues, } from "./domestic-signature.js";
const steelSignature = (over = {}) => ({
    sectors: ["steel-heavy"],
    magnitude: "heavy",
    signature: "tariff:steel",
    reason: "A steel tariff lands where the mills are.",
    ...over,
});
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
/**
 * Rebuild a campaign whose characters discriminate a steel signature hard
 * enough for the 4× bar. Real authored rows land nearer 2.7×, the residual
 * geography-proof.test.ts holds; this fixture proves the router concentrates
 * when the character table does.
 */
function concentratedCampaign() {
    const campaign = buildCampaign();
    const belt = new Set(["PA", "OH", "IN", "MI"]);
    // ~22 mid-tier states sit just above the floor so the all-51 median is
    // nonzero; the rest (including HI) stay below it.
    const mid = new Set(STATE_IDS.filter((id) => !belt.has(id) && id !== "HI").slice(0, 22));
    const states = {};
    for (const id of STATE_IDS) {
        const runtime = campaign.states[id];
        const tier = belt.has(id) ? "belt" : mid.has(id) ? "mid" : "low";
        const character = concentratedCharacter(runtime.base.character, tier);
        const base = { ...runtime.base, character };
        states[id] = { ...runtime, base, lean: base.lean };
    }
    return { ...campaign, states: states };
}
function concentratedCharacter(seed, tier) {
    if (tier === "belt") {
        return {
            ...seed,
            economy: {
                industrial: 0.55,
                agricultural: 0.05,
                energy: 0.05,
                tech: 0.1,
                services: 0.2,
                defense: 0.05,
            },
        };
    }
    if (tier === "mid") {
        return {
            ...seed,
            economy: {
                industrial: 0.125,
                agricultural: 0.1,
                energy: 0.1,
                tech: 0.15,
                services: 0.425,
                defense: 0.1,
            },
        };
    }
    return {
        ...seed,
        economy: {
            industrial: 0.02,
            agricultural: 0.1,
            energy: 0.1,
            tech: 0.15,
            services: 0.53,
            defense: 0.1,
        },
    };
}
describe("routeDomestic", () => {
    it("returns byte-identical effect lists for the same campaign and signature", () => {
        const campaign = buildCampaign();
        const signature = steelSignature();
        const first = routeDomestic(campaign, signature);
        const second = routeDomestic(campaign, signature);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });
    it("iterates STATE_IDS in declaration order", () => {
        const campaign = buildCampaign();
        const effects = routeDomestic(campaign, steelSignature());
        const ids = effects.map((effect) => effect.state);
        const expected = STATE_IDS.filter((id) => ids.includes(id));
        expect(ids).toEqual(expected);
    });
    it("concentrates a steel-like signature: PA/OH/IN/MI ≥ 4× median, Hawaii below the floor", () => {
        const campaign = concentratedCampaign();
        const effects = routeDomestic(campaign, steelSignature());
        const byState = new Map(effects.map((effect) => [effect.state, Math.abs(effect.deltas?.lean ?? 0)]));
        const allAbs = STATE_IDS.map((id) => byState.get(id) ?? 0);
        const med = median(allAbs);
        expect(med).toBeGreaterThan(0);
        for (const id of ["PA", "OH", "IN", "MI"]) {
            expect(byState.get(id) ?? 0, id).toBeGreaterThanOrEqual(4 * med);
        }
        expect(byState.has("HI")).toBe(false);
    });
    it("on real authored rows, a steel signature moves the steel belt and leaves Hawaii below the floor", () => {
        const campaign = buildCampaign();
        const effects = routeDomestic(campaign, steelSignature());
        const ids = new Set(effects.map((effect) => effect.state));
        for (const id of ["PA", "OH", "IN", "MI"]) {
            expect(ids.has(id), id).toBe(true);
        }
        expect(ids.has("HI")).toBe(false);
    });
    it("emits nothing for a state whose |delta| is below the movement floor", () => {
        const campaign = buildCampaign();
        const effects = routeDomestic(campaign, steelSignature({ magnitude: "light", sectors: ["tourism-hospitality"] }));
        // A light tourism hit on an industrial-heavy state should often fall under the floor;
        // the invariant under test is that every emitted delta clears 0.002.
        for (const effect of effects) {
            expect(Math.abs(effect.deltas?.lean ?? 0)).toBeGreaterThanOrEqual(0.002);
        }
    });
    it("clamps each state's lean delta to STATE_ROUTE_CAP", () => {
        const campaign = concentratedCampaign();
        // Many industrial sectors fold onto the same axis so raw would exceed the cap.
        const signature = steelSignature({
            magnitude: "heavy",
            sectors: ["steel-heavy", "auto", "chemicals", "textiles", "mining", "food-processing", "housing-construction"],
            axes: { industrial: 1 },
        });
        const effects = routeDomestic(campaign, signature);
        for (const effect of effects) {
            expect(Math.abs(effect.deltas?.lean ?? 0)).toBeLessThanOrEqual(STATE_ROUTE_CAP);
        }
        const mi = effects.find((effect) => effect.state === "MI");
        expect(mi).toBeDefined();
        expect(Math.abs(mi.deltas.lean)).toBe(STATE_ROUTE_CAP);
    });
    it("keeps STATE_ROUTE_TURN_CAP at or above the per-act cap", () => {
        expect(STATE_ROUTE_TURN_CAP).toBeGreaterThanOrEqual(STATE_ROUTE_CAP);
    });
    it("attaches an addMark with the signature slug and reason on every routed effect", () => {
        const campaign = buildCampaign();
        const signature = steelSignature();
        for (const effect of routeDomestic(campaign, signature)) {
            expect(effect.addMark).toEqual(expect.objectContaining({
                turn: campaign.turn,
                signature: signature.signature,
                reason: signature.reason,
                decayRate: 0.06,
            }));
            expect(effect.addMark.valence === 1 || effect.addMark.valence === -1).toBe(true);
        }
    });
    it("signs lean toward the sealed administration party", () => {
        const democrat = buildCampaign();
        expect(democrat.congress.caucusAnchor).toBe("democrat");
        const demEffects = routeDomestic(democrat, steelSignature());
        const demMi = demEffects.find((effect) => effect.state === "MI");
        expect(demMi).toBeDefined();
        // Favorable steel act under a Democratic administration moves lean negative (toward Dem).
        expect(demMi.deltas.lean).toBeLessThan(0);
        const republican = {
            ...democrat,
            congress: { ...democrat.congress, administrationParty: "republican", caucusAnchor: "republican" },
        };
        const repMi = routeDomestic(republican, steelSignature()).find((effect) => effect.state === "MI");
        expect(repMi.deltas.lean).toBeGreaterThan(0);
        expect(repMi.deltas.lean).toBeCloseTo(-(demMi.deltas.lean), 5);
    });
    it("banks less of the same act on the partisan axis for a president with no party", () => {
        const democrat = buildCampaign();
        const independent = {
            ...democrat,
            congress: { ...democrat.congress, administrationParty: "independent" },
        };
        const demMi = routeDomestic(democrat, steelSignature()).find((effect) => effect.state === "MI");
        const indMi = routeDomestic(independent, steelSignature()).find((effect) => effect.state === "MI");
        // Same direction — the anchor is still the Democrats — and less of it.
        expect(Math.sign(indMi.deltas.lean)).toBe(Math.sign(demMi.deltas.lean));
        expect(Math.abs(indMi.deltas.lean)).toBeLessThan(Math.abs(demMi.deltas.lean));
    });
    it("folds sectors through SECTOR_AXIS into stateAffinity", () => {
        const campaign = buildCampaign();
        const mi = campaign.states.MI.base.character;
        const viaSector = stateAffinity(mi, 0, steelSignature());
        const viaAxis = stateAffinity(mi, 0, steelSignature({ sectors: undefined, axes: { industrial: 1 } }));
        expect(viaSector).toBeCloseTo(viaAxis, 10);
        expect(viaSector).toBeCloseTo(mi.economy.industrial, 10);
    });
    it("exposes MAGNITUDE_STEP matching the documented step", () => {
        expect(MAGNITUDE_STEP).toEqual({ light: 0.004, moderate: 0.010, heavy: 0.020 });
    });
});
describe("the ideology wire", () => {
    const valuesSignature = (values) => ({
        magnitude: "heavy",
        signature: "ruling:identity-protections",
        reason: "A ruling that expands protections nationwide.",
        values,
    });
    it("moves a low-lean and a high-lean state in opposite directions from an identity-coded act with no economic axes at all", () => {
        const campaign = buildCampaign();
        const signature = valuesSignature({ authLibertarian: -0.6 });
        const effects = routeDomestic(campaign, signature);
        const ca = effects.find((effect) => effect.state === "CA");
        const wy = effects.find((effect) => effect.state === "WY");
        expect(ca).toBeDefined();
        expect(wy).toBeDefined();
        // CA (lean -0.26) and WY (lean 0.5) sit on opposite sides of the proxy
        // ideology reading, so an act with zero industrial content still lands
        // with opposite sign on the two states — the whole point of the wire.
        expect(Math.sign(ca.deltas.lean)).not.toBe(Math.sign(wy.deltas.lean));
    });
    it("moves nothing when the signature carries no economic axes and no values", () => {
        const campaign = buildCampaign();
        const signature = { magnitude: "heavy", signature: "no-op", reason: "test" };
        expect(routeDomestic(campaign, signature)).toHaveLength(0);
    });
    it("stateValues reads lean directly and urbanization inverted", () => {
        const mi = buildCampaign().states.MI.base.character;
        const position = stateValues(mi, 0.4);
        expect(position.economicLeftRight).toBe(0.4);
        expect(position.authLibertarian).toBe(0.4);
        expect(position.nationalistGlobalist).toBeCloseTo((mi.urbanization - 0.5) * -2, 10);
    });
});
