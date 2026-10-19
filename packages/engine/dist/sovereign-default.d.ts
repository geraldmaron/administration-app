import type { Campaign, NationRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type Willingness } from "./willingness.js";
/** The rating letters, safest first. */
type Letter = NationRuntime["stats"]["economy"]["sovereignRating"];
/**
 * Planning values: how far a government's real interest bill, as a share of
 * output, can climb past where it stood at the founding before it is under
 * stress, by its rating now. No opened source gives a stress line; these follow
 * the order of the ratings and nothing more. Measured against the government's
 * own opening bill, so no government opens under stress: a default is
 * something a term does to a country, not something the dataset hands it.
 */
export declare const STRESS_MARGIN: Readonly<Record<Letter, number>>;
/** Planning value: the share of the stock creditors write off in a default. */
export declare const DEFAULT_HAIRCUT = 0.3;
/** Planning value: the annual growth a default takes off its own economy while the shock stands. */
export declare const DEFAULT_GROWTH_HIT = -0.03;
/** Planning value: how long after a default a government cannot default again. */
export declare const DEFAULT_RESPITE_WEEKS = 208;
/**
 * Planning values: how long after a default the agencies re-rate a government
 * out of "D" once its restructuring is done, and the letter they give it. A
 * year for the exchange and the re-rating; the letter is the bottom of the
 * rated scale, because a government fresh out of a haircut is not an
 * investment-grade credit. Neither figure is sourced.
 */
export declare const DEFAULT_RERATE_WEEKS = 52;
export declare const RERATED_AFTER_DEFAULT: Letter;
/** Planning values: the weighing's threshold and the half-width of the week's noise. */
export declare const DEFAULT_THRESHOLD = 1;
export declare const DEFAULT_NOISE = 0.5;
/** The real interest bill as a share of output: the books' effective rate net of expected inflation, on the stock. */
export declare function realInterestShare(campaign: Campaign, runtime: NationRuntime): number;
/** How far a government's real interest bill runs past its opening one and its rating's margin; zero or less is no stress. */
export declare function debtStress(campaign: Campaign, runtime: NationRuntime): number;
/** This week's weighing for one government, or nothing where it is not under stress or has just defaulted. */
export declare function weighDefault(campaign: Campaign, runtime: NationRuntime): Willingness | undefined;
/** The week's defaults abroad: every government under stress weighed, each that tips over defaulting, and each restructured one re-rated. */
export declare const defaultPhase: TurnPhase;
export {};
