export type CampaignPaceId = "weekly" | "biweekly" | "monthly";
export type CampaignPace = {
    readonly id: CampaignPaceId;
    readonly daysPerTurn: number;
    /** daysPerTurn / 7. The multiplier every per-turn magnitude takes. */
    readonly paceFactor: number;
    readonly turnsPerYear: number;
};
export declare const PACE_LADDER: Readonly<Record<CampaignPaceId, CampaignPace>>;
export declare const DEFAULT_PACE: CampaignPaceId;
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
export declare function turnsFor(days: number, pace?: CampaignPace): number;
/**
 * How a count of days that is not a deadline reads as whole turns.
 *
 * `turnsFor` answers "by which turn is this due", which is why it never
 * returns zero. This answers "how many whole turns is this span": a report
 * six days overdue is zero weeks overdue (`floor`), a date nine days out is
 * two weeks away on a countdown (`ceil`), and a span quoted in round weeks is
 * the nearest (`round`). The rounding is named at the call site because it is
 * the one thing the three readings disagree on.
 */
export type WeekRounding = "floor" | "ceil" | "round";
export declare function weeksFor(days: number, rounding: WeekRounding, pace?: CampaignPace): number;
/** How many fiction-days a count of turns spans at the given pace. */
export declare function elapsedDays(turns: number, pace?: CampaignPace): number;
/**
 * Linear scaling for additive per-turn movement: a rate authored at the
 * weekly rung, realized as a per-turn amount at any pace. Scale before
 * clamping; the caller's clamp is the bound on state, not this function's.
 */
export declare function scaleRate(perWeek: number, pace: CampaignPace): number;
/**
 * Recompounds a per-week multiplicative rate (a decay or a Bernoulli
 * probability) to the equivalent per-turn rate at the given pace, so a
 * coarser turn applies the same rate the weekly game would have applied
 * across that many fictional weeks — never the unscaled weekly rate applied
 * once. Linear scaling here would overshoot and can drive a bounded value
 * negative at the coarsest rung.
 */
export declare function compoundRate(perWeek: number, pace: CampaignPace): number;
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
export declare const TURNS_PER_YEAR: number;
/**
 * `pace.daysPerTurn / 364`, at the pace the game is played at — the
 * `yearFraction`, the one conversion every stock identity and cumulative rate (`vitals.ts`'s `populationIdentity`, `macro-baseline.ts`'s
 * `costBaseline`) scales a per-turn movement by. Declared beside
 * `TURNS_PER_YEAR` rather than in either consumer, so the two modules cannot
 * quietly drift to two different fractions of the same year.
 */
export declare const WEEKLY_YEAR_FRACTION: number;
