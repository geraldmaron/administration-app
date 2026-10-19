import { type CohortId, type StateId } from "@admin/world";
import { type CohortEffect, type CohortStrain } from "./demos.js";
import { type DomesticSignature } from "./domestic-signature.js";
import type { StateEffect } from "./effects.js";
import type { Campaign } from "./state.js";
/** Scales signature magnitude into cohort strain weight. */
export declare const COHORT_STRAIN_SCALE = 2;
/** A cohort barely touched emits nothing — same argument as the state floor. */
export declare const COHORT_STRAIN_FLOOR = 0.004;
/**
 * Place tilt for the urban signature term. Mirrors stateAffinity's
 * (urbanization − 0.5) × 2 at the three place cells; other axes contribute 0.
 */
export declare function placeTilt(cohort: CohortId): number;
/**
 * Affinity of one cohort for a signature. Pure, no roll.
 *
 * The `values` term is the direct case `stateAffinity`'s `stateValues` has to
 * derive a proxy for: every cohort already carries a real, authored
 * `IdeologyVector` (`COHORT_MOTIVATION[cohort].beliefs`), differentiated by
 * design: rural and urban sit on opposite sides of `authLibertarian` before
 * this function ever reads either of them. Nothing here is invented; the
 * vector already sits next to `exposure`.
 */
export declare function cohortAffinity(cohort: CohortId, signature: DomesticSignature): number;
/**
 * Where the act actually landed, and who lives there. Mass-weighted mean of
 * the cohort's state share, divided by the national share — so a uniform act
 * reads ~1, a steel act in industrial states reads above 1 for goods-producing
 * and below 1 for professional-technical.
 *
 * "Mass" is people times political displacement, and the population half is
 * what makes it a reading of whom an act moved. Displacement alone counts an
 * act that moved California and one that moved Wyoming by the same amount of
 * lean identically, which makes a national act's cohort reading a reading of
 * where the politics moved rather than of whom it moved. Weighting by the
 * product is what makes this
 * function's own doc comment true: a steel act reads above 1 for
 * goods-producing because most of the goods-producing population is in the
 * states it landed on, not merely because those states swung.
 *
 * Both terms are needed. Population alone would count a state the act never
 * touched; displacement alone counts a state nobody lives in. The product is
 * "how many people were reached, and how hard".
 */
export declare function cohortGeography(campaign: Campaign, cohort: CohortId, routed: readonly StateEffect[]): number;
/**
 * Where a routed act's strain on one cohort landed, state by state: the state's
 * share of the act's reach on the cohort (the same people-times-displacement
 * mass `cohortGeography` weighs) over its share of the cohort's people. The
 * people-weighted mean is one, so the strain's national weight is unchanged and
 * only its geography is kept. Undefined when the act moved no state.
 */
export declare function routedReach(campaign: Campaign, cohort: CohortId, routed: readonly StateEffect[]): Readonly<Partial<Record<StateId, number>>> | undefined;
/**
 * Compile a domestic signature into one CohortEffect per cohort that clears
 * the strain floor. Iteration is over COHORT_IDS in declaration order so the
 * effect list is byte-identical run to run. `routed` is routeDomestic's own
 * output, passed in rather than recomputed.
 */
export declare function routeCohorts(campaign: Campaign, signature: DomesticSignature, routed: readonly StateEffect[]): readonly CohortEffect[];
/**
 * A promise's reckoning, written to the cohorts it was made to.
 *
 * Routed acts find their cohorts through exposure and geography because an act
 * lands on places. A promise does not: it was made to named people, and they
 * are the ones who remember whether it was kept, wherever they live. So the
 * cohorts come from the promise itself, and each one's attention scales how
 * hard it lands, the same multiplier every routed strain carries.
 */
export declare function courtedStrains(courts: readonly CohortId[], memory: CohortStrain): readonly CohortEffect[];
