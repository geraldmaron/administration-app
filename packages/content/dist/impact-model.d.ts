import { type Effect } from "@admin/engine";
import type { Nation, StateId } from "@admin/world";
import type { ScenarioImpact } from "./impact.js";
import { type CostPricing } from "./scenario-cost.js";
/**
 * Bumped whenever any table below changes. A pack records the version it was
 * balanced against, so an old pack meeting a rebalanced model is a fact the
 * loader can state rather than a silent re-costing nobody notices.
 */
export declare const IMPACT_MODEL_VERSION = 5;
/**
 * What each band means as a number of people, matching the words the prose
 * uses.
 *
 * These are absolute counts, not shares, and the distinction is load-bearing.
 * A scenario's beats say "nineteen dead" and go on saying it whichever nation
 * the board casts it onto — the writing is fixed, so the toll is. What varies
 * is what that toll *means*, and it varies by the size of the country it
 * happened to: nineteen dead is a national tragedy in a country of four million
 * and a local story in one of three hundred million.
 *
 * So the band is authored against the prose and normalized against the
 * population at resolve time. An earlier version of this table had it the other
 * way around — bands as population shares — which read plausibly and meant
 * "hundreds" denoted three hundred thousand people in a country the size of the
 * United States. The words have to mean what they say.
 *
 * The steps are order-of-magnitude because political response to a death toll
 * is: one to ten is a story, ten to a hundred a crisis, a hundred to a thousand
 * a different presidency.
 */
declare const TOLL_DEATHS: Readonly<Record<string, number>>;
/**
 * How much a decision that split the country adds to polarization.
 *
 * Small on purpose and one-directional. Polarization is the slowest-moving
 * quantity in the model and the only one a government cannot buy back, so a
 * single divisive week should be a nudge and a term of them should be a
 * different country.
 *
 * Pinned to the engine's `MAX_TURN_POLARIZE` rather than a number of its own.
 * A scenario decision resolves through `apply()` before `advanceTurn` runs, so
 * it lands the instant it applies rather than passing through the turn-loop
 * ceiling live — that ceiling only catches it when the week closes, by
 * reconstructing what the week opened at from the ledger. This is the
 * highest-volume polarization writer in the game, one for every scenario
 * flagged divisive, and a single decision reading as more divisive than the
 * worst uncapped turn of world drift would be is not a number this model can
 * defend. Importing the constant rather than copying it means the two cannot
 * quietly drift apart again the way they already had once.
 */
export declare const DIVISIVE_POLARIZATION = 0.012;
/**
 * How hard a named human toll lands as cohort strain, before agency and split.
 *
 * Kept beside the opinion scale (0.35 in opinionDeltas) so a rebalance that
 * moves one half of a toll cannot silently leave the other half at an old
 * magnitude. The opinion half still costs the country what it costs the
 * country; this half only records who bore it and cannot add approval mass.
 */
export declare const COHORT_TOLL_SCALE = 0.35;
/**
 * Strain weight when human.cohorts names who an act lands on without a death
 * toll (e.g. a shut catchment, a plant holiday). Split across the named list
 * the same way a toll is. Direct naming, not a second opinion channel.
 */
export declare const COHORT_NAMED_STRAIN = 0.5;
/**
 * Compile human.cohorts into one CohortEffect per named cohort.
 *
 * Opinion routing is unchanged — call resolveImpact for that. This is the
 * record half: valence always −1 (who bore harm), cause and reason supplied by
 * the cast (scenario class, or a domestic signature slug when one is present).
 * Without cohorts, returns nothing so one-group scenarios keep today's
 * behavior until they are backfilled.
 */
export declare function cohortEffects(impact: ScenarioImpact, nation: Nation, ctx: {
    readonly turn: number;
    readonly cause: string;
    readonly reason: string;
}): readonly Effect[];
/** Signed net strain weight (−1..1), optionally filtered by cause slug. */
export declare function cohortStrainReading(strains: readonly {
    readonly weight: number;
    readonly valence: 1 | -1;
    readonly cause: string;
}[], cause?: string): number;
/**
 * What committing forces costs the force.
 *
 * Small and real. A deployment is not free and its price is readiness — the
 * one metric that means "could you do this again next week" — so a government
 * that commits forces three weeks running finds it cannot back the fourth
 * threat. Before this, `forces-committed` moved a public judgment by two
 * hundredths and touched the actual military not at all, which made shipping
 * troops a reputational event rather than a material one.
 */
export declare const FORCES_COMMITTED_READINESS = -0.05;
/**
 * The effects a declared impact resolves to, against the nation that bore it.
 *
 * Opinion, treasury, the population that is actually smaller afterwards, and
 * the readiness a deployment spends. It does not touch stability or standing —
 * those are consequences of the *act*, priced where the act is, and an impact
 * that moved them too would bill the same decision twice.
 *
 * `abroad` is the nation a scenario was cast onto, and is only read when the
 * toll was declared as borne there. Omitted, a toll borne abroad moves no
 * population at all rather than silently killing the player's own citizens.
 */
export declare function resolveImpact(impact: ScenarioImpact, nation: Nation, abroad?: Nation, localPopulation?: number, homeState?: StateId, pricing?: CostPricing): readonly Effect[];
/**
 * The band a written toll belongs in, for the audit that checks a scenario's
 * prose against its declaration. Exported so the gate and the model cannot
 * drift: the rule that reads "nineteen dead" out of a beat and the table that
 * prices it are the same numbers.
 *
 * Population-free, unlike the pricing above, and deliberately: the audit is
 * checking the author's arithmetic against their own sentence, which is a claim
 * about the writing rather than about any nation the board may cast it onto.
 */
export declare function tollBandFor(deaths: number): keyof typeof TOLL_DEATHS;
export {};
