import type { PublicMood } from "./state.js";

// How divided the country is, as one structural stock: the era's anchor plus
// what this administration has added or healed. The stock is what the five
// partisan blocs read (`electorate.ts`): it sets how far apart the parties
// start and how little the identifiers move on the record.
//
// It replaced a 0..1 figure that decayed toward zero on its own, so a quiet
// term drained the country to no division at all by about week 155, which is
// no country anyone has governed. Division here reverts to where the era holds
// it, and a President can move it a little and not reverse it: a wedge every
// week for eight years saturates about a fifth above the anchor.

/**
 * Where a 2020s public sits. The bloc formula's constants are fitted with the
 * 2017-21 era read as exactly 1 (Gallup party approval, 17 readings), so the
 * founding public is that era.
 */
export const ERA_POLARIZATION = 1;

/** The most a run of divisive weeks can add above the anchor. Design judgment, labeled. */
export const POLARIZATION_DRIFT_MAX = 0.25;

/** The most a run of unifying weeks can take off it. Design judgment, labeled. */
export const POLARIZATION_DRIFT_MIN = -0.15;

/** How much of the remaining room one fully divisive week closes. Design judgment, labeled. */
export const POLARIZATION_STEP = 0.02;

/**
 * Two years for the drift to give back half of itself. A structural rise took
 * two decades in Pew's 1994-2014 series, so one quiet year should not undo what
 * a wedge term did; two years halves it.
 */
export const POLARIZATION_HALF_LIFE_WEEKS = 104;

/** What one week of the `polarize` input has to sum to before it counts as a fully divisive week. */
export const MAX_TURN_POLARIZE = 0.012;

const round6 = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

/** This administration's part of the stock, held inside the range a term can reach. */
export function polarizationDrift(polarization: number): number {
  const drift = polarization - ERA_POLARIZATION;
  return Math.max(POLARIZATION_DRIFT_MIN, Math.min(POLARIZATION_DRIFT_MAX, drift));
}

/**
 * One divisive (x > 0) or unifying (x < 0) push, saturating toward the bound it
 * pushes at, so a stock near its ceiling barely moves and no run of weeks can
 * pass it.
 */
export function stepPolarization(polarization: number, x: number): number {
  const drift = polarizationDrift(polarization);
  const push = Math.max(-1, Math.min(1, x));
  const room = push > 0 ? POLARIZATION_DRIFT_MAX - drift : drift - POLARIZATION_DRIFT_MIN;
  return round6(ERA_POLARIZATION + drift + POLARIZATION_STEP * push * room);
}

/** The most one week may raise the stock from where it opened. */
export function maxWeeklyRise(opening: number): number {
  return stepPolarization(opening, 1) - opening;
}

/** What a week gives back toward the anchor, as a distance. */
export function weeklyReversion(polarization: number): number {
  return round6(Math.abs(polarizationDrift(polarization)) * (Math.LN2 / POLARIZATION_HALF_LIFE_WEEKS));
}

/** The `polarize` input as a fraction of a fully divisive week. */
export function divisiveShare(amount: number): number {
  return Math.max(0, amount) / MAX_TURN_POLARIZE;
}

export function polarize(mood: PublicMood, amount: number): PublicMood {
  if (amount <= 0) return mood;
  return { ...mood, polarization: stepPolarization(mood.polarization, divisiveShare(amount)) };
}

/**
 * Move the stock toward the anchor by a distance, from either side. Relative
 * and composable with `polarize`, so a packet that divides and reverts lands
 * the same figure whichever is read first, up to the saturation of the step.
 */
export function revertPolarization(mood: PublicMood, amount: number): PublicMood {
  const drift = polarizationDrift(mood.polarization);
  if (amount <= 0 || drift === 0) return mood;
  const toward = Math.sign(drift) * Math.min(Math.abs(drift), amount);
  return { ...mood, polarization: round6(ERA_POLARIZATION + drift - toward) };
}
