import { describe, it, expect } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { ECONOMY_HISTORY_WINDOW, METRIC_HISTORY_WINDOW, advanceTurn } from "./turn-loop.js";
import { MAX_TURN_POLARIZE, approvalFor, opinionPhase, recomputeApproval } from "./opinion.js";
import { maxWeeklyRise, stepPolarization, weeklyReversion } from "./polarization.js";
import { flagMarker } from "./marked-flags.js";
import { scandalLegsFlag, selectLiveScandals } from "./press-scandal.js";
import { selectMetricDelta, selectMetricSeries, selectRemovalPressureDelta, selectRemovalPressureSeries } from "./state.js";
import { foundedForBalance } from "./balance-harness.js";
import { campaignTurnPhases } from "./turn-phases.js";
describe("advanceTurn", () => {
    it("advances the turn counter and calendar with no-op phases", () => {
        const state = buildCampaign();
        const next = advanceTurn(state);
        expect(next.turn).toBe(state.turn + 1);
        expect(next.calendar).toEqual({ year: 2029, month: 1, day: 27 });
    });
    it("settles approval for the new turn even when no phase emits a packet", () => {
        const next = advanceTurn(buildCampaign());
        expect(next.player.metrics.approval).toBe(approvalFor(next));
    });
    it("settles approval after a live scandal changes intensity at the turn boundary", () => {
        const flag = "scandal:the-donors";
        const state = buildCampaign();
        const marked = recomputeApproval({
            ...state,
            turn: 30,
            player: {
                ...state.player,
                opinion: { ...state.player.opinion, integrity: 0.2 },
                flags: {
                    ...state.player.flags,
                    [flag]: true,
                    [flagMarker(flag, 30)]: true,
                    [scandalLegsFlag(`scandal:flag:${flag}`)]: true,
                },
            },
        });
        const next = advanceTurn(marked);
        expect(selectLiveScandals(next)[0]?.intensity).toBeGreaterThan(selectLiveScandals(marked)[0].intensity);
        expect(approvalFor(next)).toBeLessThan(marked.player.metrics.approval);
        expect(next.player.metrics.approval).toBe(approvalFor(next));
    });
    it("has no wall-clock dependency — same input always produces the same output", () => {
        const state = buildCampaign();
        expect(advanceTurn(state)).toEqual(advanceTurn(state));
    });
    it("runs simulate before select, in that fixed order", () => {
        const order = [];
        const phases = {
            simulate: (state) => {
                order.push("simulate");
                return [{ source: "simulate", actor: "world", turn: state.turn, narration: { summary: "world ticks" }, effects: [] }];
            },
            select: (state) => {
                order.push("select");
                return [{ source: "conversation", actor: "player", turn: state.turn, narration: { summary: "content selected" }, effects: [] }];
            },
        };
        const next = advanceTurn(buildCampaign(), phases);
        expect(order).toEqual(["simulate", "select"]);
        expect(next.ledger.slice(-2).map((entry) => entry.description)).toEqual(["world ticks", "content selected"]);
    });
    it("applies effects produced by phases through the mutation gate", () => {
        const state = buildCampaign();
        const phases = {
            simulate: () => [
                { source: "simulate", actor: "world", turn: 0, narration: { summary: "Treasury dips" }, effects: [{ kind: "metric", deltas: { treasury: -900 } }] },
            ],
            select: () => [],
        };
        const next = advanceTurn(state, phases);
        expect(next.player.metrics.treasury).toBe(state.player.metrics.treasury - 900);
    });
    it("tags phase-produced packets with the turn being entered, not the caller's turn field", () => {
        const state = buildCampaign();
        const phases = {
            simulate: () => [{ source: "simulate", actor: "world", turn: 999, narration: { summary: "tick" }, effects: [] }],
            select: () => [],
        };
        const next = advanceTurn(state, phases);
        expect(next.ledger.at(-1)).toEqual({
            turn: state.turn + 1,
            actor: "world",
            description: "tick",
            // Stamped by apply(): a simulate packet is the world moving, and the id
            // counts off the ledger the entry is being appended to.
            causal: { origin: "world", eventId: `ev-${state.turn + 1}-${state.ledger.length}`, createdDate: state.calendar },
        });
    });
    describe("metric history", () => {
        it("records the reading the player ended the turn on, not the world's reply to it", () => {
            const state = buildCampaign();
            const phases = {
                simulate: () => [
                    { source: "simulate", actor: "world", turn: 0, narration: { summary: "Treasury dips" }, effects: [{ kind: "metric", deltas: { treasury: -900 } }] },
                ],
                select: () => [],
            };
            const next = advanceTurn(state, phases);
            // The snapshot is the closing reading; the drop belongs to the turn that
            // followed it and shows up as the live figure instead.
            expect(next.player.metricHistory).toEqual([state.player.metrics]);
            expect(next.player.metrics.treasury).toBe(state.player.metrics.treasury - 900);
        });
        it("grows one entry per turn, oldest first", () => {
            const state = buildCampaign();
            const third = advanceTurn(advanceTurn(advanceTurn(state)));
            expect(third.player.metricHistory).toHaveLength(3);
            expect(third.player.metricHistory[0]).toEqual(state.player.metrics);
        });
        it("stops at the window rather than growing with the campaign", () => {
            let campaign = buildCampaign();
            for (let turn = 0; turn < METRIC_HISTORY_WINDOW + 10; turn += 1)
                campaign = advanceTurn(campaign);
            expect(campaign.player.metricHistory).toHaveLength(METRIC_HISTORY_WINDOW);
        });
    });
    describe("the United States economy's weekly record", () => {
        it("records the economy each week closed on, numbered by the week it closes", () => {
            const state = { ...buildCampaign(), economyHistory: [] };
            const next = advanceTurn(state);
            const { growth, inflation, unemployment, costOfLiving } = next.nations[next.founding.nation].stats.economy;
            expect(next.economyHistory).toEqual([{ turn: next.turn, growth, inflation, unemployment, costOfLiving }]);
        });
        it("keeps two years and no more", () => {
            let campaign = { ...buildCampaign(), economyHistory: [] };
            for (let turn = 0; turn < ECONOMY_HISTORY_WINDOW + 10; turn += 1)
                campaign = advanceTurn(campaign);
            expect(ECONOMY_HISTORY_WINDOW).toBe(104);
            expect(campaign.economyHistory).toHaveLength(ECONOMY_HISTORY_WINDOW);
            expect(campaign.economyHistory[0].turn).toBe(campaign.turn - ECONOMY_HISTORY_WINDOW + 1);
        });
    });
    describe("removal pressure history", () => {
        it("records the reading the player ended the turn on, the same way metricHistory does", () => {
            const state = buildCampaign();
            const next = advanceTurn(state);
            expect(next.removal.pressureHistory).toEqual([state.removal.pressure]);
        });
        it("grows one entry per turn, oldest first", () => {
            const state = buildCampaign();
            const third = advanceTurn(advanceTurn(advanceTurn(state)));
            expect(third.removal.pressureHistory).toHaveLength(3);
            expect(third.removal.pressureHistory[0]).toEqual(state.removal.pressure);
        });
        it("stops at the window rather than growing with the campaign", () => {
            let campaign = buildCampaign();
            for (let turn = 0; turn < METRIC_HISTORY_WINDOW + 10; turn += 1)
                campaign = advanceTurn(campaign);
            expect(campaign.removal.pressureHistory).toHaveLength(METRIC_HISTORY_WINDOW);
        });
    });
    describe("selectors over the series", () => {
        it("ends the series on the live turn, so the last point is where the metric stands now", () => {
            const state = advanceTurn(buildCampaign());
            const series = selectMetricSeries(state, "treasury");
            expect(series.at(-1)).toBe(state.player.metrics.treasury);
            expect(series).toHaveLength(state.player.metricHistory.length + 1);
        });
        it("reports no delta on the opening turn rather than inventing a zero", () => {
            // "It has not moved" and "there is nothing to compare against" are
            // different statements, and a surface must be able to tell them apart.
            expect(selectMetricDelta(buildCampaign(), "treasury")).toBeUndefined();
        });
        it("measures the delta against the last closed turn", () => {
            const state = buildCampaign();
            const phases = {
                simulate: () => [
                    { source: "simulate", actor: "world", turn: 0, narration: { summary: "Treasury dips" }, effects: [{ kind: "metric", deltas: { treasury: -900 } }] },
                ],
                select: () => [],
            };
            expect(selectMetricDelta(advanceTurn(state, phases), "treasury")).toBe(-900);
        });
        it("gives removal pressure the same series and delta shape as a metric", () => {
            const opening = buildCampaign();
            expect(selectRemovalPressureDelta(opening)).toBeUndefined();
            const next = advanceTurn(opening);
            const series = selectRemovalPressureSeries(next);
            expect(series.at(-1)).toBe(next.removal.pressure);
            expect(series).toHaveLength(next.removal.pressureHistory.length + 1);
        });
    });
});
// Replay equality is a shipped property: a save is a seed plus a decision
// script, so the same seed run twice has to reach the same campaign, down to
// every one of the ~1,990 directed pairs the simulate phase rewrites each
// week. These run the real seeded world rather than the fixture because the
// fixture holds a single relationship and would not notice a graph-wide fault.
describe("advanceTurn — replay equality on the real seeded world", () => {
    const SEED = "turn-loop-replay-seed";
    const TURNS = 12;
    function run(turns) {
        const { campaign, charter } = foundedForBalance(SEED);
        const phases = campaignTurnPhases(charter);
        let working = campaign;
        for (let i = 0; i < turns; i++)
            working = advanceTurn(working, phases);
        return working;
    }
    it("reaches the same campaign twice from the same seed", () => {
        expect(run(TURNS)).toEqual(run(TURNS));
    });
    it("never writes back into the campaign the caller handed it", () => {
        const { campaign, charter } = foundedForBalance(SEED);
        const phases = campaignTurnPhases(charter);
        let working = campaign;
        for (let i = 0; i < TURNS; i++) {
            const before = JSON.stringify(working.relationships);
            const graph = working.relationships;
            working = advanceTurn(working, phases);
            expect(JSON.stringify(graph)).toBe(before);
            expect(working.relationships).not.toBe(graph);
        }
    });
});
describe("the week's division", () => {
    const dividedAt = (polarization) => {
        const campaign = buildCampaign();
        return { ...campaign, player: { ...campaign.player, opinion: { ...campaign.player.opinion, polarization } } };
    };
    const divisive = (turn, amount) => ({
        source: "simulate",
        actor: "world",
        turn,
        narration: { summary: "a week half the country would not forgive" },
        effects: [{ kind: "opinion", deltas: {}, polarize: amount }],
    });
    it("holds three writers in one turn to the joint ceiling", () => {
        const state = dividedAt(1.05);
        const phases = {
            simulate: (current) => [divisive(current.turn, 0.05), divisive(current.turn, 0.05), divisive(current.turn, 0.05)],
            select: () => [],
        };
        const next = advanceTurn(state, phases);
        expect(next.player.opinion.polarization).toBeCloseTo(1.05 + maxWeeklyRise(1.05), 6);
    });
    it("keeps a division raised through the opinion phase that reverts it", () => {
        // The opinion phase sees the rise an earlier step wrote this week, and the
        // rise survives: the reversion is a relative move toward the anchor, not a
        // settled figure, so it composes with the push.
        const state = dividedAt(1.05);
        const phases = {
            simulate: [(current) => [divisive(current.turn, MAX_TURN_POLARIZE / 2)], opinionPhase],
            select: () => [],
        };
        const next = advanceTurn(state, phases);
        const pushed = stepPolarization(1.05, 0.5);
        expect(next.player.opinion.polarization).toBeCloseTo(pushed - weeklyReversion(pushed), 6);
        expect(next.player.opinion.polarization).toBeGreaterThan(1.05);
    });
    // A scenario decision commits through apply() before advanceTurn is ever
    // called, so its rise is on both the mood and the ledger — tagged with the
    // live turn — by the time advanceTurn runs. These leave that behind by hand
    // rather than by calling apply(), the same way `dividedAt` leaves a mood
    // behind without a decision that produced it.
    const midWeekDecision = (rise) => {
        const campaign = buildCampaign();
        return {
            ...campaign,
            ledger: [
                ...campaign.ledger,
                { turn: campaign.turn, actor: "player", description: "A divisive order is signed.", mood: { polarization: rise } },
            ],
            player: {
                ...campaign.player,
                opinion: { ...campaign.player.opinion, polarization: campaign.player.opinion.polarization + rise },
            },
        };
    };
    it("counts a mid-week decision against the same ceiling the week's own phases draw on", () => {
        const opening = buildCampaign().player.opinion.polarization;
        const state = midWeekDecision(0.003);
        const phases = {
            simulate: (current) => [divisive(current.turn, MAX_TURN_POLARIZE)],
            select: () => [],
        };
        const next = advanceTurn(state, phases);
        // The decision's rise plus the phase's full divisive week is more than one
        // week's worth; the joint ceiling holds it to one, not two.
        expect(next.player.opinion.polarization).toBeCloseTo(opening + maxWeeklyRise(opening), 6);
    });
    it("caps a week whose whole rise was already spent before advanceTurn ran", () => {
        const opening = buildCampaign().player.opinion.polarization;
        const state = midWeekDecision(maxWeeklyRise(opening) * 2);
        const next = advanceTurn(state);
        // Two divisive decisions committed back to back, no turn-loop phase
        // involved at all — the previous snapshot-at-call-time ceiling never saw
        // either of them, because both commit through apply() outside advanceTurn.
        expect(next.player.opinion.polarization).toBeCloseTo(opening + maxWeeklyRise(opening), 6);
    });
});
// The property every phase order rests on. A list is not a sequence unless a
// later step is planned against what an earlier step wrote: run the phases
// against one snapshot and none of section 3's read-after-write orderings can
// be honored by anything that reads state at plan time.
describe("advanceTurn — a phase list runs sequentially", () => {
    const spend = (amount) => ({
        source: "simulate",
        actor: "world",
        turn: 0,
        narration: { summary: `Treasury moves by ${amount}` },
        effects: [{ kind: "metric", deltas: { treasury: amount } }],
    });
    it("plans each step against the state the step before it produced", () => {
        const state = buildCampaign();
        const observed = [];
        const phases = {
            simulate: [
                () => [spend(-100)],
                (current) => {
                    observed.push(current.player.metrics.treasury);
                    return [spend(-50)];
                },
                (current) => {
                    observed.push(current.player.metrics.treasury);
                    return [];
                },
            ],
            select: () => [],
        };
        const opening = state.player.metrics.treasury;
        const next = advanceTurn(state, phases);
        expect(observed).toEqual([opening - 100, opening - 150]);
        expect(next.player.metrics.treasury).toBe(opening - 150);
    });
    it("still reaches apply() in list order, so the ledger reads the same way", () => {
        const line = (summary) => (current) => [
            { source: "simulate", actor: "world", turn: current.turn, narration: { summary }, effects: [] },
        ];
        const next = advanceTurn(buildCampaign(), { simulate: [line("first"), line("second"), line("third")], select: () => [] });
        expect(next.ledger.slice(-3).map((entry) => entry.description)).toEqual(["first", "second", "third"]);
    });
    it("treats a single function as the one-step case of the same list", () => {
        const state = buildCampaign();
        const one = () => [spend(-100), spend(-50)];
        expect(advanceTurn(state, { simulate: one, select: () => [] })).toEqual(advanceTurn(state, { simulate: [one], select: () => [] }));
    });
    it("runs the whole simulate list before any of select", () => {
        const order = [];
        const step = (name) => () => {
            order.push(name);
            return [];
        };
        advanceTurn(buildCampaign(), {
            simulate: [step("simulate-1"), step("simulate-2")],
            select: [step("select-1"), step("select-2")],
        });
        expect(order).toEqual(["simulate-1", "simulate-2", "select-1", "select-2"]);
    });
});
