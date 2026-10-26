/**
 * Every strait with a sourced flow and a sourced bypass reaches the world price
 * when a government on its shores is at war, charged on the flow that cannot
 * go around; a strait with no sourced row reaches nothing.
 */
import { describe, expect, it } from "vitest";
import { CHOKEPOINT_FLOWS } from "@admin/world";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { commodityPhase } from "./commodity-phase.js";
import { commodityShocks, contestedRoutes, ROUTE_CLOSURE, ROUTE_RISK } from "./commodity-shocks.js";
import { referenceIndex } from "./commodity-registry.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
const { campaign: BARE } = foundedForBalance("chokepoint-proof", "democrat", {}, { carriedWorld: false });
const at = (aggressor, defender, intensity = 1) => {
    const war = { ...openConflict(aggressor, defender, BARE.turn, "A test war."), intensity };
    return { ...BARE, conflicts: { [war.id]: war } };
};
function crudeAfter(campaign, weeks) {
    let working = campaign;
    for (let week = 0; week < weeks; week += 1) {
        for (const packet of commodityPhase(working))
            working = apply(working, packet);
        working = withWeeksElapsed(working, 1);
    }
    return working.markets?.commodities.crude?.index ?? referenceIndex("crude");
}
const row = (chokepoint, commodity) => CHOKEPOINT_FLOWS.find((flow) => flow.chokepoint === chokepoint && flow.commodity === commodity);
describe("the Bab el-Mandeb", () => {
    // Djibouti and Eritrea hold the strait's western shore and produce no oil, so
    // the strait is the only thing a war between them can move.
    const redSea = at("ERI", "DJI");
    const bab = row("CP-BAB-EL-MANDEB", "crude");
    it("is contested by a war between governments on its shores, net of what goes round the Cape", () => {
        const route = commodityShocks(redSea, "crude").filter((shock) => shock.kind === "route");
        expect(route).toHaveLength(1);
        expect(route[0].cause).toContain("Bab el-Mandeb");
        expect(route[0].loss).toBeCloseTo(bab.share * (1 - bab.bypass) * ROUTE_CLOSURE, 9);
        expect(route[0].risk).toBeCloseTo(bab.share * (1 - bab.bypass) * ROUTE_RISK, 9);
    });
    // EIA: in 2024 the strait's flow fell from 8.7 to 4.0 Mb/d, the Cape took 3.2
    // of it, and Brent stood at $79 to $81 that October. A full war on the strait
    // should move the price, and by a few percent rather than a Hormuz shock.
    it("moves crude inside the band the 2024 Red Sea attacks set", () => {
        const rest = referenceIndex("crude");
        const twelve = crudeAfter(redSea, 12);
        expect(twelve).toBeGreaterThan(rest);
        expect(twelve).toBeLessThan(rest * 1.05);
        const hormuz = crudeAfter(at("OMN", "ARE"), 12);
        expect(hormuz - rest).toBeGreaterThan(3 * (twelve - rest));
    });
});
describe("Hormuz", () => {
    // The flow the strait would have carried is net of what the war already took
    // from the producers who ship it: the Emirates, a principal in this war, lose
    // output to the war itself, and those barrels are not there to be stopped.
    it("is charged on the flow its pipelines cannot carry round, net of what the war already took at origin", () => {
        const hormuz = row("CP-HORMUZ", "crude");
        const campaign = at("OMN", "ARE", 0.5);
        const route = commodityShocks(campaign, "crude").find((shock) => shock.kind === "route");
        const [contested] = contestedRoutes(campaign, "crude");
        expect(contested.upstreamLost).toBeGreaterThan(0);
        expect(contested.upstreamLost).toBeLessThan(1);
        expect(route.loss).toBeCloseTo(hormuz.share * (1 - hormuz.bypass) * 0.5 * ROUTE_CLOSURE * (1 - contested.upstreamLost), 9);
        expect(route.loss).toBeLessThan(hormuz.share * (1 - hormuz.bypass) * 0.5 * ROUTE_CLOSURE);
    });
});
describe("a strait with no sourced row", () => {
    it("moves no market, rather than one moved by an invented share", () => {
        expect(CHOKEPOINT_FLOWS.some((flow) => flow.chokepoint === "CP-MALACCA")).toBe(false);
        const straits = at("MYS", "IDN");
        expect(commodityShocks(straits, "crude").filter((shock) => shock.kind === "route")).toEqual([]);
    });
});
