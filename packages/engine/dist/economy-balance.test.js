import { debtToGdp } from "@admin/world";
import { describe, expect, it } from "vitest";
import { balanceSeeds, foundedForBalance, playCampaign } from "./balance-harness.js";
import { FISCAL_PROXY_PROFILES } from "./balance-proxies.js";
import { fiscalCrisisPressure } from "./condition-onset.js";
import { openConflict } from "./conflicts.js";
import { authorityCeiling, selectFiscalStatement } from "./fiscal.js";
import { selectConditions } from "./state.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
// The national books over a term, read the way a President meets them: the
// debt ratio and what interest takes of revenue, the rate new borrowing costs,
// the rating and its outlook, the debt limit, and the room the President's own
// borrowing costs; and, at the end, what borrowing does to the headline.
//
// A Democrat President throughout, the harness's default, so this file
// measures one party and says so. The one question asked of every party, R1.1,
// runs in the three `borrowing-<party>-balance.test.ts` files.
const SEEDS = balanceSeeds(4);
const HORIZON = 208;
const REVIEW = 26;
function snapshot(state) {
    const ratios = {};
    const letters = {};
    for (const [id, runtime] of Object.entries(state.nations)) {
        if (id === state.founding.nation)
            continue;
        ratios[id] = debtToGdp(runtime.stats);
        letters[id] = runtime.stats.economy.sovereignRating;
    }
    return { ratios, letters };
}
function reading(state, week) {
    const us = state.nations[state.founding.nation];
    const statement = selectFiscalStatement(state);
    const books = state.books[state.founding.nation];
    const limit = state.debtLimit;
    return {
        week,
        ratio: debtToGdp(us.stats),
        interestShare: statement.outlay.debtService / statement.revenueTotal,
        deficit: -statement.balance / statement.gdp,
        market: books.rates.market ?? books.rates.effective,
        score: books.rating.score,
        outlook: books.rating.outlook,
        growth: us.stats.economy.growth,
        unemployment: us.stats.economy.unemployment,
        prosperity: state.player.opinion.prosperity,
        authority: authorityCeiling(state),
        binding: limit.bindingSince !== undefined,
        xDate: limit.xDateTurn !== undefined,
        lifted: Object.keys(limit.lifts).length > 0,
        fiscal: state.player.policies.fiscal ?? "fiscal-continuity",
    };
}
const cache = new Map();
/** One run, read the week after the books are kept (the phase after `fiscalPhase` sees them). */
function run(seed, player, party = "democrat") {
    const key = `${party}:${seed}:${typeof player === "string" ? player : player.summary}`;
    const cached = cache.get(key);
    if (cached)
        return cached;
    const weeks = [];
    let first;
    let year;
    let last;
    const pressure = { JPN: [], ARG: [] };
    const schedule = typeof player === "string" ? undefined : player.schedule;
    const outcome = playCampaign(seed, player, HORIZON, party, undefined, {
        ...(schedule ? { schedule } : {}),
        observePhase: (id, state) => {
            if (id !== "inspectorGeneralPhase")
                return;
            first ??= state;
            weeks.push(reading(state, weeks.length + 1));
            if (weeks.length === 52)
                year = state;
            for (const nation of ["JPN", "ARG"])
                pressure[nation].push(fiscalCrisisPressure(state, state.nations[nation], true));
            last = state;
        },
    });
    const opening = first;
    const prone = Object.fromEntries(Object.entries(opening.nations)
        .filter(([id]) => id !== opening.founding.nation)
        .map(([id, runtime]) => [id, fiscalCrisisPressure(opening, runtime, true)]));
    const result = { weeks, opening: snapshot(opening), year: snapshot(year ?? opening), closing: snapshot(last), pressure, prone, last: last, outcome };
    cache.set(key, result);
    return result;
}
const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const at = (weeks, week) => weeks[Math.min(weeks.length, week) - 1];
const span = (weeks, from, to) => weeks.slice(from - 1, to);
const firstNegative = (weeks) => weeks.find((week) => week.outlook === "negative")?.week ?? Number.POSITIVE_INFINITY;
const round = (value, places = 4) => Math.round(value * 10 ** places) / 10 ** places;
const idle = (party = "democrat", seeds = SEEDS) => seeds.map((seed) => run(seed, "passive", party));
const profile = (name, party = "democrat", seeds = SEEDS) => seeds.map((seed) => run(seed, FISCAL_PROXY_PROFILES[name], party));
function paired(name, stance) {
    return SEEDS.flatMap((_, index) => {
        const program = profile(name)[index].weeks;
        const careful = profile("careful-without-fiscal")[index].weeks;
        const adopted = program.find((week) => week.fiscal === stance)?.week;
        if (adopted === undefined)
            return [];
        const length = Math.min(program.length, careful.length) - adopted + 1;
        return [{ program: program.slice(adopted - 1, adopted - 1 + length), careful: careful.slice(adopted - 1, adopted - 1 + length), from: adopted }];
    });
}
function summaryRow(label, runs) {
    const end = runs.map((entry) => entry.weeks.at(-1));
    const first = runs.map((entry) => entry.weeks[0]);
    return [
        label.padEnd(24),
        `ratio ${round(median(first.map((w) => w.ratio)), 3)}→${round(median(end.map((w) => w.ratio)), 3)}`,
        `interest ${round(median(first.map((w) => w.interestShare)) * 100, 1)}→${round(median(end.map((w) => w.interestShare)) * 100, 1)}%`,
        `deficit ${round(median(first.map((w) => w.deficit)) * 100, 2)}→${round(median(end.map((w) => w.deficit)) * 100, 2)}%`,
        `10y ${round(median(end.map((w) => w.market)) * 100, 2)}%`,
        `notch ${median(end.map((w) => w.score))} first-negative ${median(runs.map((entry) => firstNegative(entry.weeks)))}`,
        `authority ${Math.round(median(end.map((w) => w.authority)))}`,
        `limit ${runs.map((entry) => (entry.weeks.some((w) => w.xDate) ? "X" : entry.weeks.some((w) => w.lifted) ? "L" : entry.weeks.some((w) => w.binding) ? "B" : "-")).join("")}`,
    ].join(" | ");
}
describe("the national books over a term", () => {
    it("reports the distribution it is asserting on", () => {
        const rows = [summaryRow("passive (idle)", idle()), ...Object.keys(FISCAL_PROXY_PROFILES).map((name) => summaryRow(name, profile(name)))];
        console.info(rows.join("\n"));
    });
    describe("H1, the idle President", () => {
        // Was pinned through W3b: the recession fix left idle drift at about 1.37
        // against this floor. It holds again on the WL tree, so the pin is gone.
        it("drifts the ratio up 1.4 to 2.4 points a year", () => {
            const drift = median(idle().map((entry) => ((entry.weeks.at(-1).ratio - entry.weeks[0].ratio) / entry.weeks.length) * 52 * 100));
            console.info(`H1 idle ratio drift ${round(drift, 3)} points a year`);
            expect(drift).toBeGreaterThanOrEqual(1.4);
            expect(drift).toBeLessThanOrEqual(2.4);
        });
        // The ceiling is six points, not five. The ten-year opens at the Treasury
        // par curve's 5.11% on the world's as-of date (2026-09-23), not at the
        // budget office's 4.3% projection, and the coupon stock reprices from its
        // 3.41% average toward it. CBO's February 2026 path, at 4.3%, takes net
        // interest from about 18.8% of revenue in 2026 to 25.3% in 2036, some 2.6
        // points a term; rates about eighty basis points higher compound across a
        // four-year rollover to the five and a half points measured here. The
        // level is the market's, so the band set against the projection moved.
        it("raises interest's share of revenue by one to six points", () => {
            const rise = median(idle().map((entry) => (entry.weeks.at(-1).interestShare - entry.weeks[0].interestShare) * 100));
            console.info(`H1 idle interest share rise ${round(rise, 3)} points`);
            expect(rise).toBeGreaterThanOrEqual(1);
            expect(rise).toBeLessThanOrEqual(6);
        });
        it("draws no cut, and no negative outlook before the first year is out", () => {
            for (const entry of idle())
                expect(Math.min(...entry.weeks.map((week) => week.score))).toBe(entry.weeks[0].score);
            expect(median(idle().map((entry) => firstNegative(entry.weeks)))).toBeGreaterThanOrEqual(52);
        });
        it("reaches the debt limit between the first and second years, and says who ended it", () => {
            const binds = idle().map((entry) => entry.weeks.find((week) => week.binding)?.week ?? Number.POSITIVE_INFINITY);
            console.info(`idle limit: binds at ${binds.join(", ")}; ${idle().map((entry) => (entry.weeks.some((w) => w.xDate) ? "X-date" : entry.weeks.some((w) => w.lifted) ? "lifted" : "open")).join(", ")}`);
            expect(median(binds)).toBeGreaterThanOrEqual(52);
            expect(median(binds)).toBeLessThanOrEqual(104);
        });
    });
    describe("H2, borrowing to invest against careful play", () => {
        const pairs = () => paired("investment-only", "fiscal-investment");
        it("adopts the program in every seed, and says when", () => {
            console.info(`investment held from week ${pairs().map((pair) => pair.from).join(", ")}`);
            expect(pairs()).toHaveLength(SEEDS.length);
        });
        it("runs a deficit at least a point and a half of output wider", () => {
            expect(median(pairs().map(({ program, careful }) => mean(span(program, 13, program.length).map((w) => w.deficit)) - mean(span(careful, 13, careful.length).map((w) => w.deficit))))).toBeGreaterThanOrEqual(0.015);
        });
        it("spends at least two more points of revenue on interest by the end of the term", () => {
            expect(median(pairs().map(({ program, careful }) => program.at(-1).interestShare - careful.at(-1).interestShare))).toBeGreaterThanOrEqual(0.02);
        });
        it("raises the ten-year yield a quarter point within a quarter", () => {
            expect(median(pairs().map(({ program, careful }) => at(program, 13).market - at(careful, 13).market))).toBeGreaterThanOrEqual(0.0025);
        });
        it("buys growth in the first year that fades by the fourth", () => {
            const year = (weeks, from, to) => mean(span(weeks, from, to).map((w) => w.growth));
            const first = median(pairs().map(({ program, careful }) => (year(program, 1, 52) - year(careful, 1, 52)) * 100));
            const fourth = median(paired("investment-only", "fiscal-investment").map(({ program, careful }) => (year(program, program.length - 51, program.length) - year(careful, careful.length - 51, careful.length)) * 100));
            expect(first).toBeGreaterThanOrEqual(0.3);
            expect(first).toBeLessThanOrEqual(1.5);
            expect(Math.abs(fourth)).toBeLessThanOrEqual(0.5);
        });
        it("costs three to eight percent of the President's authority by the end of the term", () => {
            const loss = median(pairs().map(({ program, careful }) => 1 - program.at(-1).authority / careful.at(-1).authority));
            expect(loss).toBeGreaterThanOrEqual(0.03);
            expect(loss).toBeLessThanOrEqual(0.08);
        });
        it("turns the outlook at least a review earlier", () => {
            const lead = median(pairs().map(({ program, careful }) => firstNegative(careful) - firstNegative(program)));
            expect(lead).toBeGreaterThanOrEqual(REVIEW);
        });
    });
    // H9's investment half: what borrowing to build is worth to the public's
    // judgment of whether the government made them better off, against the same
    // play without the program. Read at its peak, since the program's growth
    // fades by the fourth year.
    describe("H9, what investment does to the prosperity judgment", () => {
        it("lifts it a hundredth to five hundredths above careful play at its peak", () => {
            const peaks = paired("investment-only", "fiscal-investment").map(({ program, careful }) => Math.max(...program.map((week, index) => week.prosperity - careful[index].prosperity)));
            console.info(`H9 investment: prosperity over careful at its peak ${peaks.map((peak) => round(peak, 4)).join(", ")}`);
            expect(median(peaks)).toBeGreaterThanOrEqual(0.01);
            expect(median(peaks)).toBeLessThanOrEqual(0.05);
        });
    });
    describe("H3, consolidation against careful play", () => {
        const pairs = () => paired("consolidation-only", "fiscal-austerity");
        it("adopts the program in every seed, and says when", () => {
            console.info(`consolidation held from week ${pairs().map((pair) => pair.from).join(", ")}`);
            expect(pairs()).toHaveLength(SEEDS.length);
        });
        it("costs half a point to a point and a half of growth in its first year", () => {
            const cost = median(pairs().map(({ program, careful }) => (mean(span(careful, 1, 52).map((w) => w.growth)) - mean(span(program, 1, 52).map((w) => w.growth))) * 100));
            expect(cost).toBeGreaterThanOrEqual(0.5);
            expect(cost).toBeLessThanOrEqual(1.5);
        });
        it("narrows the deficit by at least two and a half points of output", () => {
            expect(median(pairs().map(({ program, careful }) => mean(span(careful, 13, careful.length).map((w) => w.deficit)) - mean(span(program, 13, program.length).map((w) => w.deficit))))).toBeGreaterThanOrEqual(0.025);
        });
        it("spends less of revenue on interest by the end, and returns the President room as it does", () => {
            // Only where the program has run two years: room returns as interest saved
            // compounds, which a program Congress let through in the last months of a
            // term has not had time to do.
            const settled = pairs().filter(({ program }) => program.length >= 104);
            console.info(`consolidation ran two years or more in ${settled.length} of ${pairs().length} seeds`);
            expect(settled.length).toBeGreaterThan(0);
            for (const { program, careful } of settled)
                expect(program.at(-1).interestShare).toBeLessThan(careful.at(-1).interestShare);
            for (const { program } of settled)
                expect(program.at(-1).authority).toBeGreaterThan(at(program, 52).authority);
        });
    });
    describe("H4, the world at rest", () => {
        it("holds Argentina's ratio within a tenth of itself through the first year", () => {
            console.info(`H4 Argentina's first-year move: ${idle().map((entry) => round(entry.year.ratios.ARG / entry.opening.ratios.ARG - 1, 4)).join(", ")}`);
            for (const entry of idle())
                expect(Math.abs(entry.year.ratios.ARG / entry.opening.ratios.ARG - 1)).toBeLessThanOrEqual(0.1);
        });
        it("moves no more than a tenth of the world's letters, and puts no more than three newly in CCC", () => {
            const newlyCccOf = (entry) => Object.keys(entry.opening.letters).filter((id) => entry.closing.letters[id] === "CCC" && entry.opening.letters[id] !== "CCC");
            console.info(`H4 newly in CCC: ${idle().map((entry) => newlyCccOf(entry).join(" ") || "none").join("; ")}`);
            for (const entry of idle()) {
                const ids = Object.keys(entry.opening.letters);
                const moved = ids.filter((id) => entry.closing.letters[id] !== entry.opening.letters[id]);
                const newlyCcc = ids.filter((id) => entry.closing.letters[id] === "CCC" && entry.opening.letters[id] !== "CCC");
                expect(moved.length / ids.length).toBeLessThanOrEqual(0.1);
                expect(newlyCcc.length).toBeLessThanOrEqual(3);
            }
        });
        it("reads Japan as less prone to a debt crisis than Argentina", () => {
            for (const entry of idle())
                expect(mean(entry.pressure.JPN)).toBeLessThan(mean(entry.pressure.ARG));
        });
        it("spreads debt crises across the world and ends them within two years", () => {
            const spells = idle().flatMap((entry) => selectConditions(entry.last)
                .filter((condition) => condition.kind === "fiscal-crisis")
                .map((condition) => ({ nation: condition.nation, weeks: (condition.endedTurn ?? entry.last.turn) - condition.startedTurn })));
            const counts = new Map();
            for (const spell of spells)
                counts.set(spell.nation, (counts.get(spell.nation) ?? 0) + 1);
            console.info(`world debt crises at rest: ${spells.length} spells across ${counts.size} nations, median ${median(spells.map((s) => s.weeks))} weeks`);
            expect(Math.max(...counts.values()) / spells.length).toBeLessThanOrEqual(0.25);
            expect(median(spells.map((spell) => spell.weeks))).toBeLessThanOrEqual(104);
        });
        // A week has two open slots for a hundred and ninety-five governments. When
        // the slots went to whoever came first in the roster, debt crises opened in
        // Andorra and Denmark and never in Lebanon or Venezuela, and the spread
        // above passed because the alphabet did the spreading.
        it("gives debt crises to the governments most prone to one, wherever they fall in the roster", () => {
            let prone = 0;
            let proneLater = 0;
            let all = 0;
            for (const entry of idle()) {
                const roster = Object.keys(entry.prone).sort();
                const later = new Set(roster.slice(Math.ceil(roster.length / 2)));
                const cut = [...roster].sort((a, b) => entry.prone[b] - entry.prone[a])[Math.ceil(roster.length / 4) - 1];
                const crises = selectConditions(entry.last).filter((condition) => condition.kind === "fiscal-crisis" && condition.nation in entry.prone);
                const inTop = crises.filter((condition) => entry.prone[condition.nation] >= entry.prone[cut]);
                all += crises.length;
                prone += inTop.length;
                proneLater += inTop.filter((condition) => later.has(condition.nation)).length;
            }
            console.info(`debt crises at rest: ${prone} of ${all} in the most prone quarter, ${proneLater} of those in the second half of the roster`);
            expect(all).toBeGreaterThan(0);
            expect(prone / all).toBeGreaterThanOrEqual(0.5);
            expect(proneLater / prone).toBeGreaterThanOrEqual(0.3);
        });
        it("strikes every quarter of the roster, not the start of the alphabet", () => {
            const quarters = [0, 0, 0, 0];
            for (const entry of idle()) {
                const roster = Object.keys(entry.prone).sort();
                for (const condition of selectConditions(entry.last)) {
                    const index = roster.indexOf(condition.nation);
                    if (index >= 0)
                        quarters[Math.floor((index * 4) / roster.length)] += 1;
                }
            }
            const total = quarters.reduce((sum, count) => sum + count, 0);
            console.info(`foreign conditions at rest by quarter of the roster: ${quarters.join(", ")}`);
            for (const count of quarters)
                expect(count / total).toBeGreaterThanOrEqual(0.15);
        });
    });
    // What borrowing does to the headline. The per-party ceiling, R1.1 itself,
    // runs at thirty-six seeds in `borrowing-<party>-balance.test.ts`, one file
    // per party so the three run side by side; the fixture they share says why.
    // What stays here reads the Democrat over this file's own seeds.
    describe("R1.1, borrowing does not buy the country", () => {
        const closing = (entry) => entry.outcome.metricSeries[Math.min(HORIZON, entry.outcome.metricSeries.length - 1)].approval;
        const gaps = (name, against, read) => profile(name).flatMap((entry, index) => {
            const mine = read(entry);
            const theirs = read(against[index]);
            return mine === undefined || theirs === undefined ? [] : [mine - theirs];
        });
        it("reports a late program and an oscillating one against careful play", () => {
            const careful = profile("careful-without-fiscal");
            for (const name of ["switch-at-150", "oscillating"]) {
                console.info(`R1.1 ${name}: over careful ${gaps(name, careful, closing).map((g) => round(g, 3)).join(", ")}`);
            }
        });
        it("keeps consolidation within five points of careful play by the end of a term (H3's approval half)", () => {
            const overCareful = gaps("consolidation-only", profile("careful-without-fiscal"), closing);
            console.info(`H3 approval: consolidation over careful ${overCareful.map((g) => round(g, 3)).join(", ")}`);
            expect(Math.abs(median(overCareful))).toBeLessThanOrEqual(0.05);
        });
    });
    // H8's books half: a war the United States fights abroad is an outlay the
    // week forces, not a budget. A quarter held at intensity 0.7 against the same
    // seed at peace.
    describe("H8, a war's books", () => {
        const WEEKS = 13;
        const held = (war) => {
            const { campaign, charter } = foundedForBalance("h8-books");
            const phases = campaignTurnPhases(charter);
            const us = campaign.founding.nation;
            const front = { ...openConflict(us, "VEN", campaign.turn, "A war held for the books."), intensity: 0.7 };
            const states = [];
            let state = campaign;
            for (let week = 0; week < WEEKS; week += 1) {
                const holding = war ? { ...state, conflicts: { ...state.conflicts, [front.id]: { ...front, startedTurn: state.turn } } } : state;
                state = advanceTurn(holding, phases);
                states.push(war ? { ...state, conflicts: { ...state.conflicts, [front.id]: { ...front, startedTurn: state.turn } } } : state);
            }
            return states;
        };
        let atWar = [];
        let atPeace = [];
        const books = (state) => state.books[state.founding.nation];
        it("adds one to one point eight percent of output to outlays", () => {
            atWar = held(true);
            atPeace = held(false);
            const shares = atWar.map((state, index) => {
                const war = selectFiscalStatement(state);
                const peace = selectFiscalStatement(atPeace[index]);
                return war.outlayTotal / war.gdp - peace.outlayTotal / peace.gdp;
            });
            console.info(`H8 books: a war abroad at 0.7 adds ${round(mean(shares) * 100, 3)}% of output to outlays over ${WEEKS} weeks`);
            expect(mean(shares)).toBeGreaterThanOrEqual(0.01);
            expect(mean(shares)).toBeLessThanOrEqual(0.018);
        });
        it("adds nothing to the structural balance or the impulse", () => {
            const last = WEEKS - 1;
            console.info(`H8 books: structural ${round(books(atWar[last]).lastStructuralBalance, 6)} against ${round(books(atPeace[last]).lastStructuralBalance, 6)}; impulse ${round(books(atWar[last]).impulse, 6)} against ${round(books(atPeace[last]).impulse, 6)}`);
            for (let week = 0; week < WEEKS; week += 1) {
                expect(Math.abs(books(atWar[week]).lastStructuralBalance - books(atPeace[week]).lastStructuralBalance)).toBeLessThanOrEqual(0.0005);
                expect(Math.abs(books(atWar[week]).impulse - books(atPeace[week]).impulse)).toBeLessThanOrEqual(0.0005);
            }
        });
    });
    describe("H7, the stabilizers", () => {
        /** Same held-run shape as macro-balance's slump experiment: one change held before each week. */
        function heldWorld(seed, weeks, hold) {
            const { campaign, charter } = foundedForBalance(seed);
            const phases = campaignTurnPhases(charter);
            const states = [];
            let state = campaign;
            for (let week = 1; week <= weeks; week += 1) {
                state = advanceTurn(hold(state, week), phases);
                states.push(state);
            }
            return states;
        }
        it("widens the deficit 1.8 to 3 points of output within a year of unemployment rising three points", () => {
            // The mean contraction (amplitude 0.0225) never lifts unemployment three
            // points. This holds the same path one step deeper, still inside the
            // cycle's amplitude range, until the rise crosses three points.
            const seed = "h7-stabilizers";
            const us = foundedForBalance(seed).campaign.founding.nation;
            const flat = (state, week) => ({
                ...state,
                cycles: { ...state.cycles, [us]: { phase: "expansion", enteredTurn: state.turn - week, amplitude: 0 } },
            });
            const holdFrom = 20;
            const slump = (state, week) => week >= holdFrom && week < holdFrom + 46
                ? { ...state, cycles: { ...state.cycles, [us]: { phase: "contraction", enteredTurn: state.turn - (week - holdFrom), amplitude: 0.029 } } }
                : flat(state, week);
            const states = heldWorld(seed, 104, slump);
            const base = states[0].nations[us].stats.economy.unemployment;
            const start = states.findIndex((state) => state.nations[us].stats.economy.unemployment - base >= 0.03);
            expect(start).toBeGreaterThan(0);
            const deficitOf = (state) => {
                const statement = selectFiscalStatement(state);
                return -statement.balance / statement.gdp;
            };
            // The rise lags the hold. A year back from the crossing is already inside
            // the slump, so the response is read from the week before the hold.
            const opened = states[holdFrom - 2];
            const after = states[start];
            const widening = deficitOf(after) - deficitOf(opened);
            console.info(`H7 forced: unemployment +${round((after.nations[us].stats.economy.unemployment - base) * 100, 2)} at week ${start + 1}; widening ${round(widening * 100, 2)} points of output`);
            expect(widening).toBeGreaterThanOrEqual(0.018);
            expect(widening).toBeLessThanOrEqual(0.03);
        });
    });
});
