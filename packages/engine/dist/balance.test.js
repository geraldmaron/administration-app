import { describe, expect, it } from "vitest";
import { balanceSeeds, formatBalanceReport, playCampaign, runBalanceHarness } from "./balance-harness.js";
import { POLICY_TURN_SHARE, POLICY_STANCES, movementToDeltas, policyStance } from "./policy.js";
import { TERM_TURNS } from "./elections.js";
// The balance gate. Every assertion here corresponds to a defect the harness
// actually measured on the pre-tuning engine, so each one fails if that defect
// comes back — which is the only reason to have the numbers written down.
//
// These figures are harness-measured, not playtested. No human has played
// these campaigns; what is being defended is the shape of the distribution,
// not a claim about how it feels.
const SEEDS = balanceSeeds(12);
/**
 * The party the full gate below is run for. The weekly workflow runs it once
 * per party (BALANCE_PARTY), so every band is defended for a Democrat, a
 * Republican and an Independent President alike; a run by hand defaults to the
 * Democrat the gate was first measured on.
 */
const PARTIES = ["democrat", "republican", "independent"];
const PARTY = PARTIES.find((party) => party === process.env.BALANCE_PARTY) ?? "democrat";
let cached;
function report() {
    cached ??= runBalanceHarness(SEEDS, undefined, undefined, PARTY);
    return cached;
}
const SKILLS = ["passive", "prudent", "reckless"];
/** How far over idle one program held alone may lift a term's approval. */
const FREE_LUNCH_MARGIN = 0.03;
/** How far the headline went, plus where it ended up. */
function travelOf(skill) {
    const { approvalRange, approvalDrift } = report().bySkill[skill];
    return Math.round((approvalRange + Math.abs(approvalDrift)) * 1000) / 1000;
}
/** The other two parties, at half the seeds, so every run measures all three. */
const OTHER_SEEDS = balanceSeeds(6);
const others = {};
function reportFor(party) {
    if (party === PARTY)
        return report();
    others[party] ??= runBalanceHarness(OTHER_SEEDS, undefined, undefined, party);
    return others[party];
}
describe("the balance of a campaign", () => {
    it("reports the distribution it is asserting on", () => {
        console.info(formatBalanceReport(report()));
    });
    // A reckless year puts a presidency on the removal arc for every party; the
    // removal itself is asked of the whole term (term-balance, "removes a
    // reckless President within the term"). A President whose party holds about
    // half the Senate is impeached in a bad first year but not convicted: on
    // February 13, 2021, at about a third approval, seven of fifty broke and the
    // count failed 57-43 (Senate roll call 117-1-59). Measured on the W4 tree the
    // Democrat's reckless year ends at 0.33 approval with 45 to 50 of its own
    // senators seated, which is that count.
    it("can actually be brought to the removal arc", () => {
        const { passive, reckless } = report().bySkill;
        expect(reckless.beatRate).toBeGreaterThan(passive.beatRate);
        expect(reckless.beatRate).toBeGreaterThanOrEqual(0.5);
    });
    it("is lost only by governing badly", () => {
        const { passive, prudent } = report().bySkill;
        expect(prudent.removalRate).toBe(0);
        expect(passive.removalRate).toBe(0);
    });
    // Removal votes are counted by caucus. The opposition votes on the room's
    // mood, but the President's own members break only on a grave charge with
    // approval under the break line, which is what has decided every real
    // trial: no Senate has convicted a President whose party held a third of it.
    // The ceiling defends the arc as an outcome rather than a schedule.
    it("does not remove even the most reckless President on a schedule", () => {
        const { reckless } = report().bySkill;
        expect(reckless.removalRate).toBeLessThanOrEqual(0.95);
    });
    it("opens the removal arc as a warning rather than as a greeting", () => {
        const { passive, reckless } = report().bySkill;
        // A first beat cheap enough to fire in 35 of 36 campaigns, including every
        // campaign that never took an action, makes the story's opening move mean
        // nothing. A government that does nothing provocative should not routinely
        // be told its own assembly is turning on it.
        //
        // Not zero, because a passive government can be handed a nationwide
        // disaster it did not cause, and a first beat is the correct reading of a
        // country coming apart under one. What the bound defends is that this stays
        // the minority case rather than the opening move.
        expect(passive.beatRate).toBeLessThanOrEqual(0.25);
        expect(reckless.beatRate).toBeGreaterThanOrEqual(0.75);
    });
    it("rewards governing over not governing", () => {
        const { passive, prudent, reckless } = report().bySkill;
        // The sharpest pre-tuning defect: doing nothing finished on a higher
        // approval (0.421) than playing carefully (0.412), because a turn of
        // fiscal policy moved the treasury by more than the whole instrument
        // ladder could and every action was a pure debit.
        //
        // Playing badly still has to finish below not playing at all, and that
        // comparison has a real margin: reckless lands 0.25-0.30 against passive's
        // 0.56-0.58 across four disjoint twelve-seed blocks.
        expect(passive.medianFinalApproval).toBeGreaterThan(reckless.medianFinalApproval);
        // Careful play against passivity is deliberately NOT asserted as a strict
        // inequality on approval at this horizon, and the reason is a measurement
        // rather than a concession. Over four disjoint twelve-seed blocks the
        // prudent-minus-passive approval delta ran -0.013, +0.035, -0.009, +0.070:
        // it changes sign with the seed set, so any strict inequality on it is a
        // coin flip dressed as a gate. The cause is structural. A year of careful
        // government buys standing and spends stability, passivity does the
        // reverse, and the approval weights price those two moves closely enough
        // that the composite cancels. What is defended here instead is the defect
        // itself: not governing must not finish MATERIALLY ahead. The band is
        // wider than the measured seed noise of about +/-0.04 so a passing run
        // means the wash held, not that the dice fell well.
        expect(prudent.medianFinalApproval).toBeGreaterThan(passive.medianFinalApproval - 0.1);
        // And the effect the composite hides is asserted where it is unambiguous.
        // Prudent finishes standing saturated at 1.000 in every block measured.
        // Passive decays to 0.62-0.69 on the US founding (Democrat 0.662,
        // Republican 0.624, Independent 0.692 at twelve seeds), a gap of 0.31 to
        // 0.38. Before the cabinet's break rate was calibrated a leak roughly every
        // week took passive standing to 0.004 and the gap read as 0.99, which was
        // the leaks talking rather than the governing; the Independent's 0.31 now
        // sits close to the bound. Governing is rewarded; the one-year headline
        // score simply is not the place that shows it. The strong composite claim
        // lives at the term horizon, in term-balance.test.ts.
        expect(prudent.medianFinalStanding).toBeGreaterThan(passive.medianFinalStanding + 0.3);
    });
    it("keeps the accounts a constraint rather than a tide", () => {
        for (const skill of ["passive", "prudent", "reckless"]) {
            const ratio = report().bySkill[skill].medianTreasuryRatio;
            // Mispriced, the same lever ends reckless play 2.70x richer than it
            // started and careful play insolvent at -0.03x. The floor is 0.1, the
            // same bound population-balance.test.ts holds the wider population to,
            // so the two files agree on what "still a constraint, not a wipeout"
            // means for the same metric.
            //
            // A player who takes the heaviest act every week with no reserve, and
            // survives the year, runs its budget authority to zero. The floor
            // defends every player who keeps one.
            if (skill !== "reckless")
                expect(ratio, `${skill} treasury ratio ${ratio}`).toBeGreaterThan(0.1);
            expect(ratio, `${skill} treasury ratio ${ratio}`).toBeLessThan(1.5);
        }
        // Spending has to cost more than not spending, or the accounts are decoration.
        expect(report().bySkill.reckless.medianTreasuryRatio).toBeLessThan(report().bySkill.passive.medianTreasuryRatio);
    });
    it("moves the headline score enough to be worth watching", () => {
        // This used to gate on the approval *range* alone at a floor of 0.05, and
        // the range is the wrong instrument for the question. A range cannot tell a
        // headline that never moved from one that rose and fell back, and — the
        // case that actually broke it — two real movements running against each
        // other read as a flat campaign. A polarized country healing over a year
        // pushes approval up while an unstaffed executive branch drags it down; the
        // two nearly cancel, and the gate reported a government whose delivery had
        // halved as a government nothing had happened to.
        //
        // What the claim was always reaching for is that the headline answers what
        // the player does. That is stated here as *travel* — how far the number
        // went, plus where it ended up — and as the gap between playing badly and
        // not playing at all, both measured across four disjoint twelve-seed
        // blocks with the delivery wire in:
        //
        //   range    passive 0.057-0.070    reckless 0.113-0.127
        //   drift    passive -0.059--0.033  reckless -0.114--0.090
        //   travel   passive 0.095-0.129    reckless 0.209-0.240
        //
        // Every floor below sits outside the measured band on both sides, so a
        // passing run means the effect held rather than that the seeds fell well.
        // The travel floor is 0.025 against a measured minimum of 0.095. The
        // passive proxy's own travel is asserted separately below, since it does
        // not clear this floor for every party.
        for (const skill of ["prudent", "reckless"]) {
            expect(travelOf(skill), `${skill} approval travel ${travelOf(skill)}`).toBeGreaterThanOrEqual(0.025);
        }
        const { passive, reckless } = report().bySkill;
        // And playing badly has to be visibly worse than not playing, in both the
        // swing and where it ends. Within a block the gaps run 0.046-0.060 on the
        // swing and 0.031-0.075 on the drift; taken across blocks — pairing the
        // weakest reckless with the strongest passive, which no single run can
        // actually produce — the worst cases are 0.043 and 0.031. The bounds are
        // set under those cross-block figures rather than under the per-block ones,
        // so the gate cannot fail on a pairing the measurement never sees.
        expect(reckless.approvalRange).toBeGreaterThan(passive.approvalRange + 0.03);
        expect(reckless.approvalDrift).toBeLessThan(passive.approvalDrift - 0.02);
    });
    // A passive year has to move the headline enough to be worth watching, for
    // every party. The Republican passive year used to fall just short, starting
    // closer to its own resting order than the other two. Measured 2026-09-28
    // with every proxy founded on a platform, it clears the floor.
    it("moves the headline score enough to be worth watching, on a passive year", () => {
        expect(travelOf("passive"), `passive approval travel ${travelOf("passive")}`).toBeGreaterThanOrEqual(0.025);
    });
    // A year of doing nothing does not leave the country thinking better of the
    // administration. It used to: the headline drifted up while fifty-odd
    // agencies sat unled, because nothing downstream of the institution graph
    // reached the public at all. An Independent's passive year ended at +0.010
    // until the country's order settled toward where its institutions hold it:
    // a do-nothing government no longer rides an opening reading of order it
    // did nothing to keep, and the year ends level.
    it("does not reward a year of doing nothing", () => {
        const { passive } = report().bySkill;
        expect(passive.approvalDrift, `passive drift ${passive.approvalDrift}`).toBeLessThan(0.01);
    });
    it("leaves a readable ledger of what the country lived through", () => {
        // A balance claim about a condition kind is a claim about how often it
        // opens and how long it stays, and no per-turn metric carries either: the
        // metric series records what the country felt, not what was happening to
        // it. Asserted on the shape rather than on a rate, because what a year of
        // United States weather looks like is not a figure this gate defends.
        const spells = report().outcomes.flatMap((outcome) => outcome.conditions);
        expect(spells.length).toBeGreaterThan(0);
        for (const spell of spells) {
            expect(spell.dwellTurns, spell.kind).toBeGreaterThanOrEqual(0);
            expect(spell.dwellTurns, spell.kind).toBeLessThanOrEqual(52);
            expect(spell.startedTurn, spell.kind).toBeGreaterThan(0);
        }
    });
    // Reported, not bounded, per judgment: which judgments move approval is for
    // the owner to set ceilings on once it has been read across the players.
    // What is bounded is that the report can see the President's own hand. A
    // decision moves where the public is heading and the weekly revision carries
    // the mood there, so a report that credited the revision read a year of the
    // heaviest act every week as moving approval not at all.
    it("reports which judgments moved approval, and sees the President's own hand in it", () => {
        for (const skill of SKILLS) {
            const { byDriver, byPath } = report().bySkill[skill].approvalDrivers;
            expect(Object.values(byDriver).reduce((sum, share) => sum + share, 0), skill).toBeCloseTo(1, 1);
            expect(Object.values(byPath).reduce((sum, share) => sum + share, 0), skill).toBeCloseTo(1, 1);
        }
        const decisions = (skill) => report().bySkill[skill].approvalDrivers.byPath.decisions;
        expect(decisions("reckless")).toBeGreaterThan(0.25);
        expect(decisions("passive")).toBeLessThan(0.05);
    });
    it("never hands the player a turn of free wins", () => {
        // A free win is high odds, a negligible price, and nobody who objects.
        // The North Star's tradeoff gate says no option should be all three.
        for (const skill of ["passive", "prudent", "reckless"]) {
            expect(report().bySkill[skill].freeWinShare, skill).toBe(0);
        }
    });
});
describe("the fiscal lever against the instrument ladder", () => {
    it("puts one turn of program in the same order as one turn of statecraft", () => {
        // The direct guard on POLICY_TURN_SHARE, held against the mid-power
        // reference economy the instrument ladder was originally priced on so
        // the bound stays a share-of-GDP guard rather than moving with the
        // playable nation. Unbounded, the heaviest per-turn fiscal movement in the
        // catalogue is worth 5,616 a turn against this economy, where the most
        // expensive action on the whole instrument ladder costs a few hundred. A
        // turn of program may outweigh a turn of statecraft, since governing should
        // matter more than gesturing, but not by two orders of magnitude.
        const REFERENCE_GDP = 468_000;
        const heaviest = Math.max(...POLICY_STANCES.map((stance) => Math.abs(movementToDeltas(stance.perTurn, REFERENCE_GDP, 1).treasury ?? 0)));
        expect(heaviest).toBeGreaterThan(0);
        expect(heaviest).toBeLessThan(2_000);
    });
    it("keeps an enactment a lump sum rather than a week of one", () => {
        // Enactment is the one-off price of putting a program in place, so it is
        // deliberately not prorated — the asymmetry is the point and a regression
        // that prorated both would make changing policy nearly free.
        const stance = POLICY_STANCES.find((s) => (s.enactment.treasuryOfGdp ?? 0) !== 0);
        const perTurnScale = movementToDeltas(stance.enactment, 468_000, 1).treasury;
        const lumpScale = movementToDeltas(stance.enactment, 468_000, 1, 1).treasury;
        expect(Math.abs(lumpScale)).toBeGreaterThan(Math.abs(perTurnScale) * 10);
        expect(POLICY_TURN_SHARE).toBeLessThan(0.05);
    });
});
describe("the balance across parties", () => {
    it("reports every party's distribution", () => {
        for (const party of PARTIES)
            console.info(formatBalanceReport(reportFor(party)));
    });
    // The bands that make the game a game, asked of all three Presidents. The
    // finer bands above are defended for whichever party the run is for; these
    // are the ones a party must never be able to buy its way out of.
    // Removal itself is asked over the term, in each party's own term-balance
    // run: see "can actually be brought to the removal arc".
    for (const party of PARTIES) {
        it(`is brought to the removal arc by governing badly, as a ${party}`, () => {
            const { passive, reckless } = reportFor(party).bySkill;
            expect(reckless.beatRate, `${party} reckless`).toBeGreaterThan(passive.beatRate);
        });
        it(`is not lost by governing, as a ${party}`, () => {
            const { passive, prudent } = reportFor(party).bySkill;
            expect(prudent.removalRate, `${party} prudent removal`).toBe(0);
            expect(passive.removalRate, `${party} passive removal`).toBe(0);
        });
        it(`rewards governing over not governing, as a ${party}`, () => {
            const { passive, prudent, reckless } = reportFor(party).bySkill;
            expect(passive.medianFinalApproval, party).toBeGreaterThan(reckless.medianFinalApproval);
            expect(prudent.medianFinalStanding, party).toBeGreaterThan(passive.medianFinalStanding + 0.3);
        });
        // Careful government used to end every year with the country's order at
        // zero, and doing nothing near it by the end of a term: a program's weekly
        // cost and a season of continuing resolutions summed with nothing pulling
        // back. Neither way of governing should leave the country ungovernable.
        it(`keeps careful and idle government off the floor of the country's order, as a ${party}`, () => {
            const { passive, prudent } = reportFor(party).bySkill;
            expect(prudent.medianFinalStability, `${party} prudent stability`).toBeGreaterThanOrEqual(0.3);
            expect(passive.medianFinalStability, `${party} passive stability`).toBeGreaterThanOrEqual(0.3);
        });
    }
});
// Every stance held alone from the oath for a term: what one program is worth
// to the headline, to the country's order and to the security judgment, with
// nothing else governed. Read at the combined engine run rather than on every
// balance run, because it plays nineteen programs through a whole term:
//
//   HELD_ALONE=1 pnpm --filter @admin/engine exec vitest run --config vitest.balance.config.ts src/balance.test.ts -t "held alone"
//
// A stance that holds the country's order at the ceiling on its own is the
// finding this exists to surface: no program should win on a gift of order,
// and no fiscal program should buy order at all, since what a budget does is
// its books.
describe.runIf(process.env.HELD_ALONE === "1")("every stance held alone for a term", () => {
    const HELD_SEEDS = balanceSeeds(4);
    const TIMEOUT = 14_400_000;
    const YEAR = 52;
    const adopted = (stance) => (state, step) => stance && step === 0
        ? [{ source: "action", actor: "player", turn: state.turn, narration: { summary: `The President adopts ${stance.name.toLowerCase()}.` }, effects: [{ kind: "policy", domain: stance.domain, stance: stance.id }] }]
        : [];
    const median = (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;
    };
    const held = POLICY_STANCES.filter((stance) => !stance.inherited);
    let cachedRows;
    const heldRows = () => {
        cachedRows ??= [undefined, ...held].map((stance) => {
            const closing = [];
            const outcomes = HELD_SEEDS.map((seed) => {
                let last;
                const outcome = playCampaign(seed, "passive", TERM_TURNS, "democrat", undefined, { decide: adopted(stance), observeWeek: (state) => { last = state; } });
                closing.push(last);
                return outcome;
            });
            const at = (week) => (outcome) => outcome.metricSeries[Math.min(week, outcome.metricSeries.length - 1)];
            return {
                id: stance?.id ?? "none",
                approval: median(outcomes.map((o) => at(TERM_TURNS)(o).approval)),
                order: median(outcomes.map((o) => at(TERM_TURNS)(o).stability)),
                orderAtYear: median(outcomes.map((o) => at(YEAR)(o).stability)),
                security: median(closing.map((state) => state.player.opinion.security)),
            };
        });
        return cachedRows;
    };
    const idle = () => heldRows().find((row) => row.id === "none");
    const stanceRows = () => heldRows().filter((row) => row.id !== "none");
    it("reports approval, order and the security judgment for each stance and for none", () => {
        const rows = heldRows().map((row) => `[held alone] ${(row.id === "none" ? "none (idle)" : row.id).padEnd(26)} approval ${row.approval.toFixed(3)} stability ${row.order.toFixed(3)} ` +
            `security ${row.security.toFixed(3)} | over idle ${(row.approval - idle().approval).toFixed(3)} | order at week ${YEAR} ${row.orderAtYear.toFixed(3)}`);
        // Within half a hundredth of the line below, a stance passes on the seeds
        // rather than on its price, so it is named for the next change to watch.
        const fragile = stanceRows().filter((row) => row.approval - idle().approval > FREE_LUNCH_MARGIN - 0.005);
        console.info([...rows, `[held alone] fragile against the free-lunch line: ${fragile.map((row) => row.id).join(", ") || "none"}`].join("\n"));
        expect(rows).toHaveLength(held.length + 1);
    }, TIMEOUT);
    it("lets no program buy order", () => {
        for (const row of stanceRows()) {
            expect(row.order, `${row.id} order`).toBeLessThan(0.9);
            if (policyStance(row.id)?.domain === "fiscal")
                expect(row.order, `${row.id} order against idle ${idle().order}`).toBeLessThanOrEqual(idle().order + 0.05);
        }
    }, TIMEOUT);
    // No program is a free lunch. Stances with nothing in them scatter about a
    // hundredth either side of idle, and careful play (four programs and its
    // acts) clears doing nothing by about a tenth over a term, so one program
    // worth more than three hundredths on its own is the pick every player
    // should make and nobody would weigh.
    it("gives no stance held alone a term's approval more than three hundredths over idle", () => {
        for (const row of stanceRows()) {
            expect(row.approval - idle().approval, `${row.id} approval ${row.approval} against idle ${idle().approval}`).toBeLessThanOrEqual(FREE_LUNCH_MARGIN);
        }
    }, TIMEOUT);
    // The line careful and idle government already hold for each party, asked
    // of every program on its own at the end of its first year.
    it("leaves the country's order at 0.3 or more a year into any program held alone", () => {
        for (const row of stanceRows()) {
            expect(row.orderAtYear, `${row.id} order at week ${YEAR}`).toBeGreaterThanOrEqual(0.3);
        }
    }, TIMEOUT);
});
