import { type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import { type OpinionDriver } from "./opinion-drivers.js";
export { COHORT_MOTIVATION, type CohortMotivation } from "./cohort-motivation.js";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export declare const LENS_TILT_FLOOR = 0.55;
export declare const LENS_TILT_CAP = 1.8;
export declare const COHORT_MIN_SPREAD = 0.35;
export declare const LENS_CENTERING_TOLERANCE = 0.02;
/** Floor/ceiling for authored baseTurnout. Magnitude bounds, not fiction-time. */
export declare const TURNOUT_FLOOR = 0.4;
export declare const TURNOUT_CEILING = 0.85;
/** The lens, derived. normalize(OPINION_WEIGHTS ⊙ tilt). Never authored directly. */
export declare function cohortLens(cohort: CohortId): Readonly<Record<OpinionDriver, number>>;
/** Exhaustive coverage check used by tests — every declared id has a row. */
export declare function motivationIds(): readonly CohortId[];
/**
 * Something a cohort remembers, for or against the administration. Same four
 * fields plus reason as Grudge and GrievanceMark — one decay rule and one
 * reading rule serve every memory in the game.
 */
export type CohortStrain = {
    readonly createdTurn: number;
    /** Machine-readable slug a scenario condition can name: "plant-closed", "omitted:relief". */
    readonly cause: string;
    readonly weight: number;
    readonly valence: 1 | -1;
    readonly decayRate: number;
    /** The player-facing sentence. A memory nobody can read is not a memory. */
    readonly reason: string;
    /**
     * Where the act landed on this group, by state: each routed state's share of
     * the act's reach on the group over its share of the group's people, so the
     * people-weighted mean is one. Absent when the memory has no geography (a
     * promise, an older save): it then lands on the group alike everywhere.
     */
    readonly where?: Readonly<Partial<Record<StateId, number>>>;
};
/**
 * Per-turn weight drop by valence. A harm outlives a favor, the one deliberate
 * departure from the single BASE_MARK_DECAY state marks use. The negative rate
 * matches that mark decay, so a harm fades the same whether a state or a people
 * remember it.
 */
export declare const STRAIN_DECAY: Readonly<Record<-1 | 1, number>>;
/** An omission fades slower still (~thirty-four weeks). Matches 0009's OMISSION_DECAY. */
export declare const OMISSION_DECAY = 0.03;
/**
 * Append or replace strains on one cohort. applyCohort is the only writer of
 * Campaign.cohorts; demosPhase and routeCohorts emit these.
 */
export type CohortEffect = {
    readonly kind: "cohort";
    readonly cohort: CohortId;
    readonly addStrain?: CohortStrain;
    /** Full replacement — the weekly decay pass recomputes every strain. */
    readonly replaceStrains?: readonly CohortStrain[];
    readonly reason: string;
};
/**
 * Peak polarization demosPhase may emit from cohort dispersion alone. Held
 * under the joint MAX_TURN_POLARIZE ceiling with every other writer — not a
 * separate allowance.
 */
export declare const COHORT_DISPERSION_POLARIZE = 0.04;
/** Save / glance bound: sixteen cohorts × six strains. Eviction is deterministic. */
export declare const MAX_COHORT_STRAINS = 6;
/**
 * How far centered strain may pull a cohort's support off its lens reading.
 * Magnitude bound, not fiction-time.
 */
export declare const STRAIN_SCALE = 0.15;
/** Every cohort opens with no memory — founding and the v26 migration both use this. */
export declare function openingCohorts(): Readonly<Record<CohortId, readonly CohortStrain[]>>;
/** Sole writer of Campaign.cohorts. Does not touch PublicMood or any other field. */
export declare function applyCohort(state: Campaign, effect: CohortEffect): Campaign;
/** Signed sum of live strain. Positive favors the administration; negative hurts it. */
export declare function netStrain(strains: readonly CohortStrain[]): number;
/**
 * Salience ⊙ tilt, renormalized. A war makes security louder for everyone, and
 * louder still for public-and-uniformed. Not the standing lens — that is
 * cohortLens (base weights only).
 */
export declare function cohortWeights(campaign: Campaign, cohort: CohortId): Readonly<Record<OpinionDriver, number>>;
/**
 * National cohort shares, derived never stored. Each state's authored mix is
 * weighted by its population, summed in STATE_IDS order, rounded to 4 dp per
 * axis. The age axis then drifts with demography.growthRate × elapsed fiction
 * years so a growing country reads younger without a second save field.
 *
 * The weight was `electoralVotes`, and its own comment called that what it was:
 * "the population proxy the dataset already carries". It was the only proxy
 * available while the states held distributions and no quantity, and it is a
 * poor one — every state carries an electoral floor of three, so Wyoming's
 * mix counted at roughly four times its share of the country and California's
 * at about four fifths of its own.
 *
 * It has to move in the same change as `cohortGeography`'s weighting, not
 * after it. The two are numerator and denominator of one ratio: weighting where
 * an act landed by people while still weighting the country it is compared
 * against by electoral votes reads every cohort concentrated in large states as
 * over-represented and every cohort concentrated in small ones as under-, which
 * is a bias in every strain figure the campaign produces rather than a
 * rounding difference.
 */
export declare function nationalCohortShares(campaign: Campaign): Readonly<Record<CohortId, number>>;
/** One cohort's national share from the derived table. */
export declare function nationalShare(campaign: Campaign, cohort: CohortId): number;
/**
 * Net strain minus the axis share-weighted mean. The quantity boundary law 2
 * centers inside the one reader that uses it.
 */
export declare function centeredStrain(campaign: Campaign, cohort: CohortId): number;
/**
 * Where each cohort stands before its memory: the five blocs, each reading the
 * record through this cohort's own lens, mixed in the proportions the cohort is
 * made of (`cohort-blocs.ts`). The cohort's measured partisan baseline is in
 * that mixture (DECISIONS 5.8), so no separate offset or calibration is added.
 * The headline never reads a cohort (DECISIONS 5.9).
 */
export declare function cohortStartingPoints(campaign: Campaign): Readonly<Record<CohortId, number>>;
/**
 * Cohort support: where the cohort starts (the blocs it is made of, reading the
 * record through its lens) plus a centered strain displacement. The strain
 * term sums to zero on every axis by construction.
 */
export declare function cohortSupport(campaign: Campaign, cohort: CohortId): number;
/**
 * Where one cell of the country stands, and why.
 *
 * The read side of the model, which until now had none: `cohortSupport`,
 * `centeredStrain` and `netStrain` were built, tested and called by nobody, so
 * a game that claims a country made of people could not tell a president who
 * they had hurt.
 *
 * Turnout is its own reading (`turnout.ts#selectCohortTurnout`), beside this
 * one rather than on it: participation is a separate fact about the same
 * people, and the vote reads it through one driver.
 */
export type CohortStanding = {
    readonly cohort: CohortId;
    readonly axis: CohortAxisId;
    readonly name: string;
    /** How much of the country this cell is, derived from state population. */
    readonly share: number;
    /** Where it stands, 0..1: the national mood through its own lens, plus its own memory. */
    readonly support: number;
    /** Signed live memory. Negative is harm it has not forgiven. */
    readonly strain: number;
    /** Its memory relative to the rest of its axis — the part that is about this cell rather than the country. */
    readonly displacement: number;
    /** The sentence for where it stands, absent only when the cell remembers nothing. */
    readonly reading?: string;
};
/**
 * How a cell says what it remembers.
 *
 * Never a figure, never a delta, never a slug: a cohort's memory is a thing
 * that happened to people, and the reason sentence it was written with is the
 * only part of it a player should ever have to read. Undefined when the cell
 * carries no strain at all, which is the honest first-week case rather than a
 * blank line.
 */
export declare function cohortReading(campaign: Campaign, cohort: CohortId): string | undefined;
/**
 * All sixteen cells, in declaration order.
 *
 * Declaration order rather than sorted, so the axis strips a surface draws stay
 * put week to week: a list that reordered itself as support moved would make
 * every reading a search.
 */
export declare function selectCohorts(campaign: Campaign): readonly CohortStanding[];
/**
 * The cell this administration has cost the most, or nothing when it has cost
 * none of them anything.
 *
 * Read off displacement rather than off support: support carries the national
 * mood, which is the same for every cell and says nothing about who was hurt.
 * What is this administration's doing is the part of a cell's memory that its
 * own axis does not share.
 */
export declare function weakestCohort(campaign: Campaign): CohortStanding | undefined;
/**
 * Cause-matched cancellation: a positive strain whose cause matches a live
 * negative retires that harm up to its own weight before any remainder stays,
 * slug-matched the way PendingClaim is. Positives walk append order;
 * negatives of the same cause are spent oldest-first.
 */
export declare function cancelMatchingStrains(strains: readonly CohortStrain[]): readonly CohortStrain[];
/** Drop each strain's weight by its own decayRate; zero-weight entries leave. */
export declare function decayCohortStrains(strains: readonly CohortStrain[]): readonly CohortStrain[];
/**
 * Cancel matching causes, then decay. Order is load-bearing: an act that
 * retires a grievance retires it in the week it lands, not a week later.
 */
export declare function reconcileCohortStrains(strains: readonly CohortStrain[]): readonly CohortStrain[];
/**
 * Cross-axis dispersion of centered strain: mean of each axis's share-weighted
 * RMS. Mean of centered strain is zero by construction, so RMS is the spread.
 */
export declare function cohortStrainDispersion(campaign: Campaign): number;
/** OpinionEffect.polarize amount from cohort dispersion, capped at MAX_TURN_POLARIZE. */
export declare function cohortDispersionPolarizeAmount(campaign: Campaign): number;
/**
 * Weekly demos pass: cause-matched cancellation, valence-split decay via
 * replaceStrains, and a polarization term from cross-axis strain dispersion.
 * Runs after opinionPhase and before removalPhase (ARCHITECTURE §3).
 */
export declare const demosPhase: TurnPhase;
