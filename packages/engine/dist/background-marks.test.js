import { describe, expect, it } from "vitest";
import { advanceUntilAttention } from "./advance.js";
import { foundedForBalance, playCampaign } from "./balance-harness.js";
import { DAYS_PER_TURN } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
// ECO-23 byte-neutrality proof. Seven weekly phases mark their plumbing packets
// `background: true` (budget, capacity, orderSettling, fiscal accrual and
// apportionment, macro drift, opinion) so the Record can hide machinery that
// is not an act anyone took. The mark must change nothing the simulation
// computes: no metric, no causal id, no balance figure. Whole-state identity
// also covers `measure-npc-world.mjs`, which reads campaign state only and
// never inspects `ActionRecord.background`, so any mark that moved the world
// would show up here before it could hide behind a filtered Record.
const IDLE_SEEDS = ["balance-0", "balance-1"];
const IDLE_WEEKS = 104;
const PRUDENT_WEEKS = 52;
const PRUDENT_SEED = "balance-0";
function stripPacket(packet) {
    if (!packet.background)
        return packet;
    const { background: _mark, ...rest } = packet;
    return rest;
}
function stripPhase(run) {
    return (state) => run(state).map(stripPacket);
}
function stripTurnPhases(phases) {
    const runs = typeof phases.simulate === "function" ? [phases.simulate] : phases.simulate;
    return { ...phases, simulate: runs.map(stripPhase) };
}
function clearBackgroundMarks(value) {
    if (Array.isArray(value))
        return value.map(clearBackgroundMarks);
    if (value && typeof value === "object") {
        const record = value;
        const next = {};
        for (const [key, val] of Object.entries(record)) {
            if (key === "background")
                continue;
            next[key] = clearBackgroundMarks(val);
        }
        return next;
    }
    return value;
}
function firstDivergence(a, b, path = "$") {
    if (Object.is(a, b))
        return undefined;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
        return `${path}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`;
    }
    if (Array.isArray(a) !== Array.isArray(b))
        return `${path}: an array against an object`;
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const key of keys) {
        const found = firstDivergence(a[key], b[key], `${path}.${key}`);
        if (found)
            return found;
    }
    return JSON.stringify(a) === JSON.stringify(b) ? undefined : `${path}: key order`;
}
function causalEventIds(campaign) {
    return campaign.ledger
        .filter((entry) => entry.causal !== undefined)
        .map((entry) => entry.causal.eventId);
}
function runIdleCampaign(seed, strip) {
    const { campaign, charter } = foundedForBalance(seed);
    const phases = strip ? stripTurnPhases(campaignTurnPhases(charter)) : campaignTurnPhases(charter);
    let working = campaign;
    for (let week = 0; week < IDLE_WEEKS; week++) {
        const result = advanceUntilAttention(working, { phases, horizonDays: DAYS_PER_TURN });
        working = result.campaign;
        if (result.stopReason === "ended")
            break;
    }
    return working;
}
function runPrudentCampaign(seed, strip) {
    let campaign = foundedForBalance(seed).campaign;
    const options = strip ? { wrapPhase: (_id, run) => stripPhase(run) } : {};
    const outcome = playCampaign(seed, "prudent", PRUDENT_WEEKS, "democrat", {}, { ...options, observeWeek: (state) => { campaign = state; } });
    return { campaign, outcome };
}
function expectMarkedMatchesStripped(label, marked, stripped) {
    expect(causalEventIds(marked), `${label}: causal ids`).toEqual(causalEventIds(stripped));
    const divergence = firstDivergence(clearBackgroundMarks(marked), clearBackgroundMarks(stripped));
    expect(divergence, `${label}: campaign`).toBeUndefined();
}
describe("ECO-23: background marks are byte-neutral", () => {
    it.each(IDLE_SEEDS)("idle %s for 104 weeks through advanceUntilAttention", (seed) => {
        expectMarkedMatchesStripped(seed, runIdleCampaign(seed, false), runIdleCampaign(seed, true));
    });
    it("prudent proxy for 52 weeks through playCampaign's wrapPhase seam", () => {
        const marked = runPrudentCampaign(PRUDENT_SEED, false);
        const stripped = runPrudentCampaign(PRUDENT_SEED, true);
        expectMarkedMatchesStripped(PRUDENT_SEED, marked.campaign, stripped.campaign);
        const reportGap = firstDivergence(clearBackgroundMarks(marked.outcome), clearBackgroundMarks(stripped.outcome));
        expect(reportGap, `${PRUDENT_SEED}: balance outcome`).toBeUndefined();
    });
}, 120_000);
