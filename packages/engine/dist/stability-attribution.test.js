import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance, playCampaign } from "./balance-harness.js";
import { campaignPhaseSequence } from "./turn-phases.js";
import { DAY_RESOLVERS, DECISIONS, attributeMetricWeek, metricShares, openMetricAttribution } from "./stability-attribution.js";
const base = buildCampaign();
const at = (stability, treasury) => ({
    ...base,
    player: { ...base.player, metrics: { ...base.player.metrics, stability, treasury } },
});
describe("which stretch of the week moved order and money", () => {
    it("books each stretch's fall and rise apart, from the state it began on to the next one's", () => {
        const start = at(0.5, 1000);
        const decided = at(0.52, 900);
        const days = at(0.52, 900);
        const policy = at(0.52, 900);
        const congress = at(0.47, 950);
        const end = at(0.466, 950);
        const week = [
            { id: DAY_RESOLVERS, state: days },
            { id: "policyPhase", state: policy },
            { id: "congressPhase", state: congress },
        ];
        const ledger = attributeMetricWeek(openMetricAttribution(), start, decided, week, end);
        expect(ledger.stability[DECISIONS]).toEqual({ fell: 0, rose: expect.closeTo(0.02, 9) });
        expect(ledger.stability.policyPhase).toEqual({ fell: expect.closeTo(0.05, 9), rose: 0 });
        expect(ledger.stability.congressPhase).toEqual({ fell: expect.closeTo(0.004, 9), rose: 0 });
        expect(ledger.stability[DAY_RESOLVERS]).toBeUndefined();
        expect(ledger.treasury[DECISIONS]).toEqual({ fell: 100, rose: 0 });
        expect(ledger.treasury.policyPhase).toEqual({ fell: 0, rose: 50 });
    });
    it("keeps a drain visible in a week whose net movement is nothing", () => {
        const start = at(0.3, 1000);
        const drained = at(0.2, 1000);
        const restored = at(0.3, 1000);
        const ledger = attributeMetricWeek(openMetricAttribution(), start, start, [
            { id: "congressPhase", state: start },
            { id: "cabinetConsequencesPhase", state: drained },
        ], restored);
        expect(ledger.stability.congressPhase).toEqual({ fell: expect.closeTo(0.1, 9), rose: 0 });
        expect(ledger.stability.cabinetConsequencesPhase).toEqual({ fell: 0, rose: expect.closeTo(0.1, 9) });
    });
    it("reads shares across runs, the stretch that moved it furthest first", () => {
        const one = attributeMetricWeek(openMetricAttribution(), at(0.5, 0), at(0.5, 0), [{ id: "congressPhase", state: at(0.5, 0) }], at(0.2, 0));
        const two = attributeMetricWeek(openMetricAttribution(), at(0.5, 0), at(0.6, 0), [{ id: "conditionPhase", state: at(0.6, 0) }], at(0.5, 0));
        // The other two moved it equally far, so they read in name order.
        expect(metricShares([one, two], "stability")).toEqual([
            { id: "congressPhase", fell: 0.75, rose: 0 },
            { id: "conditionPhase", fell: 0.25, rose: 0 },
            { id: DECISIONS, fell: 0, rose: 1 },
        ]);
        expect(metricShares([], "treasury")).toEqual([]);
    });
});
// The seam a proof uses to strip a mark from every phase's packets. It is only
// worth anything if an identity wrapper changes nothing, if every phase passes
// through it in the order the app runs them, and if a wrapper that does change
// a phase's packets is actually walked rather than set aside.
describe("the harness's phase wrapper", () => {
    const WEEKS = 6;
    const run = (options = {}) => {
        let last;
        const outcome = playCampaign("balance-0", "prudent", WEEKS, "democrat", {}, { ...options, observeWeek: (state) => { last = state; } });
        return { outcome, last: JSON.stringify(last) };
    };
    it("leaves a run byte for byte as it was when the wrapper passes every phase through", () => {
        const seen = [];
        const plain = run();
        const wrapped = run({ wrapPhase: (id, phase) => { seen.push(id); return phase; } });
        expect(JSON.stringify(wrapped.outcome)).toBe(JSON.stringify(plain.outcome));
        expect(wrapped.last).toBe(plain.last);
        // The wrapper is built over both the flat week and the office-day cut of
        // the same week, so every phase passes through it twice, and the day cut
        // has to come out in the flat week's own order.
        const ids = campaignPhaseSequence(foundedForBalance("balance-0").charter).map((phase) => phase.id);
        expect(seen).toEqual([...ids, ...ids]);
    });
    it("walks the wrapped phase, so a wrapper that empties one changes the week", () => {
        const plain = run();
        const silenced = run({ wrapPhase: (id, phase) => (id === "macroDriftPhase" ? () => [] : phase) });
        expect(silenced.last).not.toBe(plain.last);
    });
});
