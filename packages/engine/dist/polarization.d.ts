import type { PublicMood } from "./state.js";
/**
 * Where a 2020s public sits. The bloc formula's constants are fitted with the
 * 2017-21 era read as exactly 1 (Gallup party approval, 17 readings), so the
 * founding public is that era.
 */
export declare const ERA_POLARIZATION = 1;
/** The most a run of divisive weeks can add above the anchor. Design judgment, labeled. */
export declare const POLARIZATION_DRIFT_MAX = 0.25;
/** The most a run of unifying weeks can take off it. Design judgment, labeled. */
export declare const POLARIZATION_DRIFT_MIN = -0.15;
/** How much of the remaining room one fully divisive week closes. Design judgment, labeled. */
export declare const POLARIZATION_STEP = 0.02;
/**
 * Two years for the drift to give back half of itself. A structural rise took
 * two decades in Pew's 1994-2014 series, so one quiet year should not undo what
 * a wedge term did; two years halves it.
 */
export declare const POLARIZATION_HALF_LIFE_WEEKS = 104;
/** What one week of the `polarize` input has to sum to before it counts as a fully divisive week. */
export declare const MAX_TURN_POLARIZE = 0.012;
/** This administration's part of the stock, held inside the range a term can reach. */
export declare function polarizationDrift(polarization: number): number;
/**
 * One divisive (x > 0) or unifying (x < 0) push, saturating toward the bound it
 * pushes at, so a stock near its ceiling barely moves and no run of weeks can
 * pass it.
 */
export declare function stepPolarization(polarization: number, x: number): number;
/** The most one week may raise the stock from where it opened. */
export declare function maxWeeklyRise(opening: number): number;
/** What a week gives back toward the anchor, as a distance. */
export declare function weeklyReversion(polarization: number): number;
/** The `polarize` input as a fraction of a fully divisive week. */
export declare function divisiveShare(amount: number): number;
export declare function polarize(mood: PublicMood, amount: number): PublicMood;
/**
 * Move the stock toward the anchor by a distance, from either side. Relative
 * and composable with `polarize`, so a packet that divides and reverts lands
 * the same figure whichever is read first, up to the saturation of the step.
 */
export declare function revertPolarization(mood: PublicMood, amount: number): PublicMood;
