import { describe, expect, it } from "vitest";
import { electoralSeeds, formatBalanceReport, runBalanceHarness, TERM_HORIZON_TURNS, } from "./balance-harness.js";
import { presidencyElections, TERM_LIMIT, TERM_TURNS } from "./elections.js";
import { CAMPAIGN_OPENING_DATE, turnOnDate } from "./clock.js";
// The term gate, and why it is a file of its own.
//
// `balance.test.ts` runs a year. The first midterm falls in November of the
// second year and the contest two years after it, so nothing in that gate has
// ever reached a fixed date — the
// seat swing, the incumbency edge and the constitutional record's drag were
// arithmetic no measured campaign had executed. This file runs both terms out.
// It costs about a minute, which is why it is separate rather than folded into
// the standing gate, and why its seed set is small and charter-filtered: six of
// the ten charters hold no elections at all.
//
// What it caught on the first run is the reason it exists. Vote share was
// approval rescaled, so a well-governed administration took 81 percent and a
// drifting one 29 — margins no republic has produced — and the midterm read its
// swing against the whole chamber and moved 77 House seats, larger than 1894,
// every single time. Both are corrected in `elections.ts`; the assertions below
// are what stops either from coming back.
const SEEDS = electoralSeeds(4);
/**
 * The party this file measures a term for.
 *
 * It measured a Democrat whatever the run asked for until the elections work
 * landed: `runBalanceHarness` took its default party, so the weekly run's
 * Republican and Independent passes reprinted the Democrat's numbers under
 * another heading, and the two contest bounds below had never been measured for
 * either of the other two. Read the same way `balance.test.ts` reads it, so one
 * environment variable moves every file that can move.
 */
const PARTIES = ["democrat", "republican", "independent"];
const PARTY = PARTIES.find((party) => party === process.env.BALANCE_PARTY) ?? "democrat";
let cached;
function report() {
    cached ??= runBalanceHarness(SEEDS, TERM_HORIZON_TURNS, undefined, PARTY);
    return cached;
}
const TIMEOUT = 300_000;
describe("the arc of a full term", () => {
    it("reports the distribution it is asserting on", () => {
        console.info(formatBalanceReport(report()));
    }, TIMEOUT);
    it("actually reaches the dates it is measuring", () => {
        // The whole defect this file was opened for: at a 52-turn horizon this
        // count was zero and every assertion below was vacuous.
        const held = report().outcomes.flatMap((outcome) => outcome.elections);
        expect(held.filter((election) => election.kind === "midterm").length).toBeGreaterThan(0);
        expect(held.filter((election) => election.kind === "presidential" && election.won !== undefined).length).toBeGreaterThan(0);
        // Every result is held in the order the calendar holds them, in the week
        // federal Election Day falls in, and never on a turn counted from the oath.
        // The harness drives the day-by-day advance the app drives, so it files
        // each one under the turn the app files it under.
        const schedule = presidencyElections(CAMPAIGN_OPENING_DATE);
        for (const outcome of report().outcomes) {
            outcome.elections.forEach((election, index) => {
                const due = schedule[index];
                expect(`${election.kind}-election`, `${outcome.seed}/${outcome.skill} election ${index}`).toBe(due.kind);
                expect(election.turn, `${election.kind} filed on turn ${election.turn}`).toBe(turnOnDate(CAMPAIGN_OPENING_DATE, due.date));
            });
        }
    }, TIMEOUT);
    // The order a term leaves the country in, read at the last week it played:
    // a campaign defeated at its election stops there, near week 199, and reading
    // week 208 would read nothing. Careful and idle government both used to reach
    // the end of a term with the country's order at zero.
    it("leaves careful and idle government's country governable at the end of the term", () => {
        for (const skill of ["passive", "prudent"]) {
            const closing = report()
                .outcomes.filter((outcome) => outcome.skill === skill)
                .map((outcome) => outcome.metricSeries[Math.min(TERM_TURNS, outcome.metricSeries.length - 1)].stability)
                .sort((a, b) => a - b);
            const median = (closing[Math.floor((closing.length - 1) / 2)] + closing[Math.ceil((closing.length - 1) / 2)]) / 2;
            expect(median, `${skill} stability at the last week of the term`).toBeGreaterThanOrEqual(0.3);
        }
    }, TIMEOUT);
    // A sixteen-seat cabinet under a President who keeps their counsel leaks a
    // handful of times a term and loses a couple of its members, one way or the
    // other. Above the band the room is a sieve and its leaks alone empty the
    // country's standing; below it nobody ever walks out. The departures are the
    // first-term record's own range: from the 2001 cabinet's 2 to the 1989
    // cabinet's 8 heads of executive departments (Brookings' Cabinet turnover
    // tracker on brookings.edu, its Cabinet turnover by year of term, and its
    // Datawrapper series datawrapper.dwcdn.net/PXOek/2,
    // read 2026-09-28; the 2017 cabinet's 14 is the outlier the tracker was
    // opened for). The other two parties'
    // cabinets are read by `scripts/measure-cabinet-term.mjs` over these seeds.
    it("breaks the cabinet 6 to 15 times a term by leak and 2 to 8 times by departure, idle or careful", () => {
        for (const skill of ["passive", "prudent"]) {
            const { leak, challenge, resignation } = report().bySkill[skill].cabinetPerTerm;
            expect(leak, `${skill} leaks a term`).toBeGreaterThanOrEqual(6);
            expect(leak, `${skill} leaks a term`).toBeLessThanOrEqual(15);
            expect(challenge + resignation, `${skill} departures a term`).toBeGreaterThanOrEqual(2);
            expect(challenge + resignation, `${skill} departures a term`).toBeLessThanOrEqual(8);
        }
    }, TIMEOUT);
    it("counts a national vote as a country, not as an approval rating rescaled", () => {
        const shares = report()
            .outcomes.flatMap((outcome) => outcome.elections)
            .filter((election) => election.won !== undefined || election.kind === "midterm")
            .map((election) => election.voteShare);
        // Before the anchor, the same seeds produced 0.289 and 0.817. Nobody has
        // ever won a presidential election with 82 percent, and a president polling
        // in the twenties still holds their own party.
        for (const share of shares) {
            expect(share).toBeGreaterThan(0.3);
            expect(share).toBeLessThan(0.7);
        }
    }, TIMEOUT);
    it("moves a plausible number of seats at a midterm", () => {
        const midterms = report()
            .outcomes.flatMap((outcome) => outcome.elections)
            .filter((election) => election.kind === "midterm");
        for (const midterm of midterms) {
            // A wave is forty seats. Seventy-seven, which is what the first
            // measurement found in every direction, is larger than any midterm in the
            // history of the chamber.
            expect(Math.abs(midterm.houseSwing ?? 0), `house swing at turn ${midterm.turn}`).toBeLessThanOrEqual(45);
            expect(Math.abs(midterm.senateSwing ?? 0), `senate swing at turn ${midterm.turn}`).toBeLessThanOrEqual(12);
        }
        // A presidential year moves the chambers too, and it has to move fewer of
        // them: no structural penalty against the incumbency and a softer
        // sensitivity, so the coattail is a handful of seats rather than a wave.
        const generals = report()
            .outcomes.flatMap((outcome) => outcome.elections)
            .filter((election) => election.kind === "presidential" && election.won !== undefined);
        for (const general of generals) {
            expect(Math.abs(general.houseSwing ?? 0), `house coattail at turn ${general.turn}`).toBeLessThanOrEqual(45);
            expect(Math.abs(general.senateSwing ?? 0), `senate coattail at turn ${general.turn}`).toBeLessThanOrEqual(12);
        }
        // The structural penalty has to be visible in the aggregate, or the midterm
        // is a referendum a merely adequate presidency wins.
        const median = [...midterms.map((m) => m.houseSwing ?? 0)].sort((a, b) => a - b)[Math.floor(midterms.length / 2)];
        expect(median).toBeLessThan(0);
    }, TIMEOUT);
    // Governing badly ends a presidency inside a term for every party, including
    // one whose Senate is too friendly to convict in the first year.
    it("removes a reckless President within the term", () => {
        expect(report().bySkill.reckless.removalRate).toBeGreaterThan(0);
    }, TIMEOUT);
    // A government that never acts loses. The contest reads the record as well
    // as approval: a term with no law signed, and promises made on the platform
    // and never kept, is what carries a do-nothing term off the line.
    it("never re-elects a government that never acted", () => {
        expect(report().bySkill.passive.term.reelectionRate).toBe(0);
    }, TIMEOUT);
    // Careful play finishes well clear of doing nothing, for the same reason.
    it("puts careful play ten points clear of doing nothing", () => {
        const { passive, prudent } = report().bySkill;
        expect(prudent.term.medianContestShare).toBeGreaterThan(passive.term.medianContestShare + 0.1);
    }, TIMEOUT);
    it("decides the contest on how the country was governed", () => {
        const { passive, prudent } = report().bySkill;
        // Not a claim that careful play always wins — a claim that the record is
        // what the count reads. A government that never acts finishes below an even
        // split and loses; one that governs carefully finishes above it and mostly
        // does not.
        //
        // Careful play is a majority rather than a sweep, and that is the honest
        // reading of an electorate this engine deliberately keeps close. The vote
        // is anchored at an even split and approval is levered onto only about a
        // third of the distance from it, so a national result lives in the 0.43 to
        // 0.61 band by construction. Prudent's median contest share is 0.553-0.574
        // across the four blocks: the whole distribution sits within a few points
        // of the win line, so demanding every contest fall on the right side of it
        // is demanding zero variance from a statistic built to have some. Measured,
        // careful play won 16 of 16 contests on the US founding (15 of 16 before
        // it). The bound below is what survives the seed draw.
        expect(prudent.term.reelectionRate).toBeGreaterThan(0.5);
        expect(prudent.term.reelectionRate).toBeGreaterThan(passive.term.reelectionRate);
    }, TIMEOUT);
    it("lets a presidency end by being term-limited rather than only by losing", () => {
        const { prudent } = report().bySkill;
        // Two terms is what the charter allows, and the ending a two-term president
        // reaches has to be its own word: `defeated` and `term-limited` are not the
        // same sentence about a campaign.
        expect(prudent.term.endings["term-limited"]).toBeGreaterThan(0);
        // Serving out both terms has to be the normal end of careful government,
        // not the only one it can reach. Requiring zero defeats was the same
        // zero-variance demand the contest assertion above makes with a margin:
        // over four disjoint blocks careful play ended term-limited 15 times and
        // defeated once, so an equality on the defeat count fails one run in four
        // for reasons no engine change caused.
        expect(prudent.term.endings["term-limited"]).toBeGreaterThan(prudent.term.endings.defeated);
        const served = report().outcomes.filter((outcome) => outcome.ending === "term-limited");
        for (const outcome of served) {
            expect(outcome.elections.filter((e) => e.kind === "presidential").length).toBe(TERM_LIMIT);
            // The last one is the non-contest: nobody stood, so nobody won it.
            expect(outcome.elections.at(-1).won).toBeUndefined();
        }
    }, TIMEOUT);
    it("stops the campaign at the ending rather than playing weeks nobody governs", () => {
        for (const outcome of report().outcomes) {
            if (outcome.ending === "defeated") {
                expect(outcome.turnsPlayed, `${outcome.seed}/${outcome.skill}`).toBeLessThanOrEqual(TERM_TURNS * TERM_LIMIT);
            }
            if (outcome.ending === "removed")
                expect(outcome.removalTurn).toBeDefined();
        }
    }, TIMEOUT);
});
