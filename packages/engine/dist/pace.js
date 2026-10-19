// A campaign is fixed at founding to one turn granularity. The calendar, not
// the turn, carries the fiction's dates: an election falls on federal Election
// Day and a term runs from one Inauguration Day to the next, whatever the turn
// length, so nothing here promises that a date lands on a turn boundary.
// Nothing here reads or writes a Campaign — call sites thread a
// `CampaignPace` themselves, the same way they thread an `RngStreams` — so
// this file has no dependency on where a campaign stores its chosen pace.
//
// This is also the one place a count of days becomes a count of turns, or the
// other way round. Every clock that did that arithmetic privately rounded its
// own way, and six days left and two days left read as the same week on one
// screen and as different weeks on the next.
// 364 rather than the calendar's 365: a year of whole turns at every rung, so a
// per-year rate divided into turns is never fractional. It is a cadence, not a
// date: the dates themselves come from the civil calendar in clock.ts.
const YEAR_DAYS = 364;
const WEEK_DAYS = 7;
function paceFor(id, daysPerTurn) {
    return {
        id,
        daysPerTurn,
        paceFactor: daysPerTurn / WEEK_DAYS,
        turnsPerYear: YEAR_DAYS / daysPerTurn,
    };
}
export const PACE_LADDER = {
    weekly: paceFor("weekly", 7),
    biweekly: paceFor("biweekly", 14),
    monthly: paceFor("monthly", 28),
};
// weekly is exactly today's game, so every existing save and every call
// site that has not yet threaded a founded pace keeps its current behavior.
export const DEFAULT_PACE = "weekly";
/**
 * Converts a fiction-time duration in days to a turn count at the given
 * pace. `max(1, ceil(...))` so a duration shorter than one turn still gates
 * on the very next turn rather than on the current one or never.
 *
 * This is the only days-to-turns conversion in the engine, which is why the
 * pace defaults: a clock written as "thirty days' notice" or "half a fictional
 * year" should not have to know what a turn is to say so, and every clock that
 * reimplemented the arithmetic privately was a clock that could round a
 * different way from its neighbors.
 */
export function turnsFor(days, pace = PACE_LADDER[DEFAULT_PACE]) {
    return Math.max(1, Math.ceil(days / pace.daysPerTurn));
}
export function weeksFor(days, rounding, pace = PACE_LADDER[DEFAULT_PACE]) {
    const turns = days / pace.daysPerTurn;
    const whole = rounding === "floor" ? Math.floor(turns) : rounding === "ceil" ? Math.ceil(turns) : Math.round(turns);
    return whole + 0;
}
/** How many fiction-days a count of turns spans at the given pace. */
export function elapsedDays(turns, pace = PACE_LADDER[DEFAULT_PACE]) {
    return turns * pace.daysPerTurn;
}
/**
 * Linear scaling for additive per-turn movement: a rate authored at the
 * weekly rung, realized as a per-turn amount at any pace. Scale before
 * clamping; the caller's clamp is the bound on state, not this function's.
 */
export function scaleRate(perWeek, pace) {
    return perWeek * pace.paceFactor;
}
/**
 * Recompounds a per-week multiplicative rate (a decay or a Bernoulli
 * probability) to the equivalent per-turn rate at the given pace, so a
 * coarser turn applies the same rate the weekly game would have applied
 * across that many fictional weeks — never the unscaled weekly rate applied
 * once. Linear scaling here would overshoot and can drive a bounded value
 * negative at the coarsest rung.
 */
export function compoundRate(perWeek, pace) {
    return 1 - Math.pow(1 - perWeek, pace.paceFactor);
}
/**
 * How many turns a year is, at the pace the game is played at.
 *
 * It lives here rather than in `budget.ts` because this module imports nothing,
 * and a constant is only as initialization-safe as the module it is declared
 * in. Declared in `budget.ts` it read the ladder correctly and still handed
 * every importer `budget.ts`'s place in the graph: once `policy` reached the
 * cohorts and the press corps reached the orders, `budget -> ... ->
 * legislative-acts -> budget` closed, and `legislative-acts` evaluated this at
 * module scope before `budget` had initialized. That is a temporal dead zone,
 * and it threw on import for every consumer of the built package while every
 * test kept passing, because vitest resolves the graph differently.
 */
export const TURNS_PER_YEAR = PACE_LADDER[DEFAULT_PACE].turnsPerYear;
/**
 * `pace.daysPerTurn / 364`, at the pace the game is played at — the
 * `yearFraction`, the one conversion every stock identity and cumulative rate (`vitals.ts`'s `populationIdentity`, `macro-baseline.ts`'s
 * `costBaseline`) scales a per-turn movement by. Declared beside
 * `TURNS_PER_YEAR` rather than in either consumer, so the two modules cannot
 * quietly drift to two different fractions of the same year.
 */
export const WEEKLY_YEAR_FRACTION = 1 / TURNS_PER_YEAR;
