import { cycleOffset, NO_CYCLE } from "./business-cycle.js";
import { campaignDay } from "./clock.js";
import { WEEKLY_YEAR_FRACTION, weeksFor } from "./pace.js";
// Where a country rests when nothing is happening to it.
//
// In its own module because two very different callers need it and neither
// should have to import the other: `macro.ts` reverts the live rates toward
// these figures, and `conditions.ts` asks whether a country is far enough from
// them to still be in a crisis. Putting the resting point beside the evolution
// law would have made the condition system import the drift phase and the
// drift phase import the conditions, so the two would have had to be one file.
/** The rates' own precision (`macro.ts`), so a rest authored to six places is not moved by rounding it. */
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
/**
 * How a country's wealth and order shape its economy: a rich, stable one grows
 * slowly with low prices and joblessness, a poor or unstable one worse.
 *
 * Only ever read as a difference. It used to be the resting point itself, and
 * every economy on earth converged on it inside a year: Argentina's inflation
 * from ninety percent to eight, South Africa's unemployment from a third to a
 * tenth, the United States' from 3.8% to 5.0%, all with nobody governing. A
 * two-variable formula cannot know that a country's prices run hot, so it is
 * kept for the one thing it can say: how much worse an economy gets when its
 * order slips from where the country was found.
 */
function orderShape(wealth, stability) {
    return {
        // Poorer economies grow faster from a lower base; unstable ones do not.
        growth: (0.045 - 0.025 * wealth) * (0.4 + 0.6 * stability),
        inflation: 0.02 + 0.06 * (1 - wealth) + 0.04 * (1 - stability),
        unemployment: 0.04 + 0.06 * (1 - wealth) + 0.04 * (1 - stability),
    };
}
/**
 * Where an economy sits when nothing is happening to it, plus where the
 * business cycle currently pulls its growth.
 *
 * The nation's own authored rates, which the dataset holds to a published
 * figure for each (`MACRO_ANCHORS`), moved by how far its order has slipped
 * from where it was found and, on growth only, by the cycle. At the order the
 * country was authored with, the rest is the authored figure exactly, so a
 * campaign opens on an economy already at rest and nothing drifts that nobody
 * moved. The cycle reaches jobs and prices only through the gap it opens.
 *
 * `cycle` is a required argument, not a default, because a caller wanting the
 * true rest state — no crisis, no cyclical swing — has to say so: pass
 * `NO_CYCLE` rather than relying on an implicit zero that a later change could
 * quietly stop being zero.
 */
export function macroBaseline(runtime, cycle) {
    const wealth = runtime.base.bands.wealthTier / 5;
    const authored = runtime.base.stats;
    const now = orderShape(wealth, runtime.stats.politics.regimeStability);
    const found = orderShape(wealth, authored.politics.regimeStability);
    return {
        growth: round6(authored.economy.growth + now.growth - found.growth + cycleOffset(cycle)),
        inflation: round6(authored.economy.inflation + now.inflation - found.inflation),
        unemployment: round6(authored.economy.unemployment + now.unemployment - found.unemployment),
    };
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/**
 * The part of a country's crime that hardship and the state's grip explain:
 * joblessness above the country's own rate or five percent, whichever is
 * higher; prices above where the country's own inflation would have put them
 * (`normalPrice`, from `normalPriceLevel`); corruption; and an open border.
 * Only ever read as a change since the oath.
 */
function crimePressure(economy, security, joblessFloor, normalPrice) {
    return (0.55 * Math.max(0, economy.unemployment - joblessFloor) +
        0.2 * Math.max(0, economy.costOfLiving / normalPrice - 1) +
        0.35 * security.corruptionIndex -
        0.25 * security.borderControl);
}
/**
 * Where `security.crimeIndex` rests: the figure the country was authored with,
 * moved by how far hardship and the state's grip have moved since the oath.
 * Reads this turn's STARTING unemployment and cost of living — the values
 * before this same turn's `nextEconomy` moves them — which is what gives the
 * crime edge its lag: a week's joblessness or price pressure shows up in next
 * week's reading, never the same week's.
 *
 * Anchored the way `macroBaseline` is, and for the same reason. Built from the
 * formula alone, every country's crime walked to what the formula thought a
 * country of its wealth should have, with nobody governing: a country the
 * dataset authored as safe drifted up and a violent one drifted down, which is
 * news nobody made. Only the change is the formula's to say.
 *
 * Hardship is read against the country's own normal rather than against a
 * fixed line: a country that has always run prices hot is not losing order to
 * them every week.
 *
 * No `macroPressure` term: a standing condition reaches crime only through the
 * unemployment and cost-of-living channels it already has, never a second
 * time as a direct crime pressure.
 */
export function crimeBaseline(runtime, normalPrice = runtime.base.stats.economy.costOfLiving) {
    const authored = runtime.base.stats;
    const joblessFloor = Math.max(0.05, authored.economy.unemployment);
    const now = crimePressure(runtime.stats.economy, runtime.stats.security, joblessFloor, normalPrice);
    const found = crimePressure(authored.economy, authored.security, joblessFloor, authored.economy.costOfLiving);
    return round6(clamp01(authored.security.crimeIndex + now - found));
}
/** Whole weeks the current day belongs to, counted through the week's close. */
export function weeksInOffice(campaign) {
    return Math.max(0, weeksFor(campaignDay(campaign), "ceil"));
}
/**
 * Where a country's price index would stand after `weeks` at the inflation it
 * was authored with: the path an ordinary year of its own prices takes, which
 * is what every reading of price hardship is measured against.
 */
export function normalPriceLevel(runtime, weeks) {
    const start = runtime.base.stats.economy;
    return start.costOfLiving * (1 + start.inflation) ** (weeks * WEEKLY_YEAR_FRACTION * COST_PASSTHROUGH);
}
/**
 * The share of inflation that reaches the shelf: all of it. The index is the
 * price level, so a year at an inflation rate raises it by exactly that rate;
 * a pass-through below one was a second, quieter inflation figure that no
 * reading could name.
 */
export const COST_PASSTHROUGH = 1;
/**
 * Where `economy.costOfLiving` rests — the one rate in the lattice whose
 * baseline moves with its own previous value, because an index is cumulative
 * by construction. Compounded exactly, `(1 + inflation)^yearFraction`: a year
 * of weekly steps at a rate lands on that rate, where simple weekly steps
 * compounded past it, and did so by more the hotter prices ran.
 *
 * `inflation` is this turn's own freshly computed reading, so a week's price
 * move reaches the shelf the same week it happens rather than a turn late.
 */
export function costBaseline(costOfLiving, inflation, yearFraction) {
    return costOfLiving * (1 + inflation) ** (yearFraction * COST_PASSTHROUGH);
}
/**
 * Where a country's politics sit when nothing is happening to it: the figures
 * it was authored with.
 *
 * Not derived from anything, unlike the economy, because there is nothing
 * upstream of them to derive from — a state's ordinary temperature IS the
 * authored record, and a country whose streets run hot runs hot as a fact
 * about that country rather than as a crisis it is having.
 *
 * The three chosen are the three with no restoring force anywhere else in the
 * engine. Every writer of `regimeStability` lowers it and every writer of
 * `protestPressure` that runs weekly raises it, so before this they were
 * ratchets: a two-hundred-turn world arrived at half the order it opened with
 * whatever anybody did, which then lowered `macroBaseline` under it and left
 * the economic rates chasing a target walking away from them.
 */
export function politicalBaseline(runtime) {
    const authored = runtime.base.stats.politics;
    return {
        regimeStability: authored.regimeStability,
        legitimacy: authored.legitimacy,
        protestPressure: authored.protestPressure,
    };
}
/**
 * The same nation with its rates at their resting values.
 *
 * What it is for: a reading that says "this country is in trouble" has to be
 * able to say "and now it is not", and the only honest comparison is against
 * where that country sits normally. An absolute threshold cannot do it: the
 * countries whose published economies run hot, a third of a workforce out of
 * work or prices doubling in a year, would be in a crisis for being themselves
 * and no recovery could ever clear it.
 */
export function restingRuntime(runtime) {
    const macro = macroBaseline(runtime, NO_CYCLE);
    const politics = politicalBaseline(runtime);
    return {
        ...runtime,
        stats: {
            ...runtime.stats,
            economy: { ...runtime.stats.economy, ...macro },
            politics: { ...runtime.stats.politics, ...politics },
        },
    };
}
