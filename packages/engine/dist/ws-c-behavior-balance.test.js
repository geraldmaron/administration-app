import { describe, expect, it } from "vitest";
import { balanceSeeds, foundedForBalance, playCampaign } from "./balance-harness.js";
import { RIVAL_LEAK_SYSTEM } from "./cabinet-alignment.js";
import { cabinetPerTerm } from "./cast-breaks.js";
import { instinctFor } from "./counsel.js";
import { fragilityTerms, selectCabinetSplit } from "./fragility.js";
import { hashFraction } from "./rng.js";
// Rivalries in the cabinet, measured over whole campaigns.
//
// The harness never answers a conversation, so on its own it writes no room to
// the ledger and the record term of a tie never moves. The staged runs add one
// decision a week with four Secretaries on record, each taking the side their
// own instinct takes on a course of a drawn coerciveness, which is the reading
// the room itself starts from. The plain runs are the harness as it stands, for
// the cabinet's existing leak and departure bands.
//
// All three parties: a party President's cabinet and an independent's
// cross-party one found differently split, and every row is read per party.
// Four seeds and two years a run keep the file to about six minutes.
const SEEDS = balanceSeeds(4);
const WEEKS = 104;
const PARTIES = ["democrat", "republican", "independent"];
const ROOM_SIZE = 4;
const TIMEOUT = 900_000;
/** A stance off an instinct, with the room's own dead zone for a hedge. */
function stanceOf(instinct) {
    return instinct > 0.2 ? "for" : instinct < -0.2 ? "against" : "wary";
}
/** One decision with four seated Secretaries on record, chosen and argued deterministically from the week. */
function roomDecision(state, step) {
    const seats = Object.entries(state.player.cabinet).filter(([role, id]) => role !== state.founding.leadRole && state.people[id]?.alive === true);
    if (seats.length === 0)
        return [];
    const coercion = hashFraction(`${state.seed}::ws-c-course::${step}`);
    const room = [...seats]
        .sort((a, b) => hashFraction(`${state.seed}::ws-c-seat::${step}::${a[0]}`) - hashFraction(`${state.seed}::ws-c-seat::${step}::${b[0]}`))
        .slice(0, ROOM_SIZE)
        .map(([role, person]) => ({ role, person, stance: stanceOf(instinctFor(state.people[person].base, "instrument", coercion)) }));
    return [
        {
            source: "action",
            actor: "player",
            turn: state.turn,
            narration: { summary: "The President decides with the room on record." },
            effects: [],
            counsel: { ...room[0], room },
        },
    ];
}
function play(seed, party, staged) {
    let founding;
    let last;
    const outcome = playCampaign(seed, "passive", WEEKS, party, undefined, {
        observeWeek: (state) => {
            founding ??= state;
            last = state;
        },
        ...(staged ? { decide: roomDecision } : {}),
    });
    return { outcome, founding: founding, last: last };
}
const leakEntries = (campaign) => campaign.ledger.filter((entry) => entry.actor === "world" && entry.causal?.systems?.includes("cabinet") && entry.causal.systems.includes("leak"));
const aimedEntries = (campaign) => leakEntries(campaign).filter((entry) => entry.causal?.systems?.includes(RIVAL_LEAK_SYSTEM));
const runs = new Map();
function runsFor(party, staged) {
    const key = `${party}:${staged}`;
    const cached = runs.get(key) ?? SEEDS.map((seed) => play(seed, party, staged));
    runs.set(key, cached);
    return cached;
}
const round3 = (value) => Math.round(value * 1000) / 1000;
describe("rivalries in the cabinet, over whole campaigns", () => {
    it("reports what the rows below assert on", () => {
        const lines = PARTIES.flatMap((party) => [false, true].map((staged) => {
            const set = runsFor(party, staged);
            const leaks = set.reduce((sum, run) => sum + leakEntries(run.last).length, 0);
            const aimed = set.reduce((sum, run) => sum + aimedEntries(run.last).length, 0);
            const opposed = set.map((run) => `${round3(selectCabinetSplit(run.founding).opposedShare)}→${round3(selectCabinetSplit(run.last).opposedShare)}`);
            const perTerm = cabinetPerTerm(set.map((run) => run.outcome));
            return `[${party} ${staged ? "staged room" : "plain"}] leaks ${leaks}, aimed ${aimed}, opposed share ${opposed.join(" ")}, per term ${JSON.stringify(perTerm)}`;
        }));
        console.info(lines.join("\n"));
    }, TIMEOUT);
    it("counts every leak the ledger holds exactly once, aimed or not", () => {
        for (const party of PARTIES) {
            for (const run of runsFor(party, true)) {
                expect(leakEntries(run.last).length, `${party} ${run.outcome.seed}`).toBe(run.outcome.cabinetBreaks.leak);
            }
        }
    }, TIMEOUT);
    // Read on the staged runs only. A leak is aimed only at a colleague the
    // leaker has fought in the room, and the plain harness writes no room, so a
    // President who never puts a question to the cabinet creates no losers and
    // its leaks are never aimed.
    it("aims a tenth to two fifths of the cabinet's leaks at a colleague, once the room has argued", () => {
        for (const party of PARTIES) {
            const set = runsFor(party, true);
            const leaks = set.reduce((sum, run) => sum + leakEntries(run.last).length, 0);
            const aimed = set.reduce((sum, run) => sum + aimedEntries(run.last).length, 0);
            const share = leaks === 0 ? 0 : aimed / leaks;
            expect(share, `${party}: ${aimed} of ${leaks} leaks aimed`).toBeGreaterThanOrEqual(0.1);
            expect(share, `${party}: ${aimed} of ${leaks} leaks aimed`).toBeLessThanOrEqual(0.4);
        }
    }, TIMEOUT);
    it("ends two years of argument with at most twice the opposed share the cabinet founded with", () => {
        for (const party of PARTIES) {
            const set = runsFor(party, true);
            const mean = (pick) => set.reduce((sum, run) => sum + selectCabinetSplit(pick(run)).opposedShare, 0) / set.length;
            expect(mean((run) => run.last), party).toBeLessThanOrEqual(2 * mean((run) => run.founding) + 1e-9);
        }
    }, TIMEOUT);
    it("keeps the cabinet's existing leak and departure bands, idle", () => {
        for (const party of PARTIES) {
            const { leak, challenge, resignation } = cabinetPerTerm(runsFor(party, false).map((run) => run.outcome));
            expect(leak, `${party} leaks a term`).toBeGreaterThanOrEqual(6);
            expect(leak, `${party} leaks a term`).toBeLessThanOrEqual(15);
            expect(challenge + resignation, `${party} departures a term`).toBeGreaterThanOrEqual(2);
            expect(challenge + resignation, `${party} departures a term`).toBeLessThanOrEqual(8);
        }
    }, TIMEOUT);
    // Seating both parties at one table costs some unity from the first week,
    // which is realism; a party President's cabinet reads close to its loyalty.
    it("founds a party cabinet within five points of its loyalty, and an independent's no more than ten below", () => {
        const spans = [];
        for (const party of PARTIES) {
            const gaps = [];
            for (const seed of balanceSeeds(12)) {
                const { campaign } = foundedForBalance(seed, party);
                const loyalties = Object.entries(campaign.player.cabinet)
                    .filter(([role, id]) => role !== campaign.founding.leadRole && campaign.people[id]?.alive === true)
                    .map(([, id]) => campaign.people[id].base.loyalty);
                const mean = loyalties.reduce((sum, value) => sum + value, 0) / loyalties.length;
                const gap = fragilityTerms(campaign).cabinetCohesion - mean;
                const label = `${party} ${seed}: cohesion ${round3(mean + gap)} against loyalty ${round3(mean)}`;
                expect(gap, label).toBeLessThanOrEqual(0.05);
                expect(gap, label).toBeGreaterThanOrEqual(party === "independent" ? -0.1 : -0.05);
                gaps.push(gap);
            }
            spans.push(`[${party}] founding cohesion minus loyalty ${round3(Math.min(...gaps))} to ${round3(Math.max(...gaps))}`);
        }
        console.info(spans.join("\n"));
    }, TIMEOUT);
});
