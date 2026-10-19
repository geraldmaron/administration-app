import type { NationId } from "@admin/world";
import type { Effect } from "./effects.js";
import { type Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export * from "./business-cycle.js";
export * from "./macro-baseline.js";
/** How fast a stat closes the gap to its baseline each turn. */
export declare const REVERSION_RATE = 0.04;
/**
 * The same, for the political figures.
 *
 * Slower on purpose, and this is the one number here chosen rather than
 * measured: at a quarter of the economic rate a country is half way back from
 * a shock to its order after about eight months, which is long enough that a
 * president lives with what they did and short enough that a term is not
 * decided by a bad fortnight in its first year.
 */
export declare const POLITICAL_REVERSION_RATE = 0.01;
/** The share of a reversion step that variance may add or remove, on the political rates. */
export declare const MACRO_JITTER = 0.4;
/**
 * The most one week's news can move each economic rate on its own, in the
 * rate's own units, drawn evenly either way.
 *
 * Added to the step rather than multiplied into it. A share of the reversion
 * step is a share of nothing once an economy reaches its resting point, so a
 * settled economy stopped moving and every seed converged on the same one.
 * Against a reversion of four percent a week these settle into a spread of
 * about four tenths of a point of growth, three of inflation and a sixth of a
 * point of unemployment around the resting point: enough that no two campaigns
 * read the same economy, far short of the gap a crisis opens on.
 */
export declare const MACRO_SHOCK: {
    readonly growth: 0.0019;
    readonly inflation: 0.0015;
    readonly unemployment: 0.00075;
};
/**
 * `costOfLiving` is not a mean-reverting equilibrium the way growth,
 * inflation, unemployment and crime are — it is a cumulative index whose own
 * baseline is computed from its own previous value (`costBaseline`). At the
 * ordinary `REVERSION_RATE` the index would compound at roughly a
 * twenty-fifth of its intended rate. Set to 1 so the index simply adopts its
 * computed next value each turn, which is what "cumulative by construction"
 * means in practice. No jitter on this call for the same reason: the
 * randomness is already in `inflation`, and costOfLiving derives from it
 * rather than drawing its own.
 */
export declare const COST_REVERSION_RATE = 1;
/**
 * Bounds, held to the dataset schema's own ranges. The price index's ceiling
 * sits where no campaign can reach it: two terms at the highest inflation the
 * bound allows multiply prices by 3^8, about 6,561, so a country that runs
 * prices hot is never pinned to a ceiling and read as stable.
 */
export declare const MACRO_BOUNDS: {
    readonly growth: {
        readonly min: -0.3;
        readonly max: 0.3;
    };
    readonly inflation: {
        readonly min: -0.1;
        readonly max: 2;
    };
    readonly unemployment: {
        readonly min: 0;
        readonly max: 1;
    };
    readonly costOfLiving: {
        readonly min: 0.1;
        readonly max: 100000;
    };
};
export declare function macroEffectsFor(campaign: Campaign, nation: NationId): Effect[];
/**
 * Runs immediately before `conditionPhase`: this week's economy is what this
 * week's conditions read, so the reading has to settle before the conditions
 * that gate on it are drawn.
 *
 * Every nation, in id order, so which economies move is a function of the seed
 * and the turn rather than of object iteration order. One packet, not one per
 * nation: this is the world's background hum, and fifty feed-less packets a
 * week would be fifty entries in a ledger that is supposed to record decisions.
 */
export declare const macroDriftPhase: TurnPhase;
