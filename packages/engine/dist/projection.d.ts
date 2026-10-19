import type { Campaign } from "./state.js";
import type { OrderProjection } from "./orders.js";
import type { PolicyStanceProjection } from "./policy-draft.js";
import type { PeaceProjection } from "./peace.js";
import type { AuthorizationProjection } from "./force-authorization.js";
import type { ConfirmationProjection } from "./congress.js";
import type { AppropriationProjection } from "./appropriation.js";
import type { LobbyProjection } from "./lobbying.js";
import type { WillingnessProjection } from "./willingness.js";
import type { MetricDeltas } from "./effect-types.js";
export type ImpactDirection = "up" | "down";
/**
 * A band, not a decimal. The projections themselves are precise because they
 * are rolled against; a cross-instrument summary reprinting three decimal
 * places would be claiming a precision the comparison does not have.
 */
export type MagnitudeBand = "slight" | "moderate" | "major";
export type ImpactConfidence = "modeled" | "estimated" | "not-modeled";
/**
 * Only horizons something in the engine actually computes: an effect that
 * lands when the packet applies, a clock the instrument itself carries, or a
 * standing position held for the rest of the term. No "medium term" — nothing
 * computes one.
 */
export type ImpactHorizon = "next-turn" | "authored-clock" | "term";
export type ProjectionImpact = {
    /** A metric key, a nation-stat path, or an institutional surface ("congress"). */
    readonly domain: string;
    readonly direction: ImpactDirection;
    readonly band: MagnitudeBand;
    readonly horizon: ImpactHorizon;
    readonly confidence: ImpactConfidence;
};
export type ProjectionOdds = {
    /** What the roll decides, in the words a screen prints beside the figure. */
    readonly label: string;
    /** 0..1, and exactly the chance the act will roll against — never restated. */
    readonly chance: number;
};
/**
 * What can take the act back. "Judicially" is its own class because it is the
 * asymmetry the unilateral track turns on: the courts can undo what an order
 * did and cannot return what it cost.
 */
export type ReversibilityClass = "reversible" | "judicially-reversible" | "irreversible";
export type ProjectionInstrument = "executive-order" | "policy-stance" | "treaty-ratification" | "peace" | "force-authorization" | "confirmation" | "appropriation" | "lobbying";
export type ProjectionRisk = "war" | "removal";
export type ProjectionBundle = {
    readonly instrument: ProjectionInstrument;
    readonly title: string;
    readonly impacts: readonly ProjectionImpact[];
    /** Passed through from the source projection, never rescaled. */
    readonly cost: MetricDeltas;
    /** Present only where the act actually rolls; a counted vote has no odds. */
    readonly odds?: ProjectionOdds;
    /**
     * Present only where the act is an ask: somebody other than the President has
     * to be willing, and the desk should say how willing before the President
     * commits. Seed-independent, like the rest of the bundle.
     */
    readonly counterpart?: ProjectionCounterpart;
    readonly reversibility: ReversibilityClass;
    /** Ids only — nations, people, posts. Prose names stay in the projections. */
    readonly affected: readonly string[];
    /** The source projection's own reasoning, as prose lines. */
    readonly assumptions: readonly string[];
    /** What this instrument's model honestly does not simulate. */
    readonly notModeled: readonly string[];
    /** The authored clock, in turns, where the instrument carries one. */
    readonly clockTurns?: number;
    readonly risks: readonly ProjectionRisk[];
};
/** Who is being asked, and what the ask looks like from their side. */
export type ProjectionCounterpart = {
    /** An id — a person, a post, a capital. Prose names stay in the projections. */
    readonly id: string;
    readonly willingness: WillingnessProjection;
};
export declare function metricImpact(domain: string, delta: number, horizon: ImpactHorizon, treasury: number, confidence: ImpactConfidence): ProjectionImpact;
/**
 * An order's costs and stat effects land the week it is signed; the review
 * clock is real but is a ruling window on a challenge, not an expiration the
 * instrument runs on, so it appears as an assumption line rather than a clock.
 */
export declare function bundleOrder(campaign: Campaign, projection: OrderProjection): ProjectionBundle;
/** A stance is the one act priced twice: once at signing, then every week held. */
export declare function bundlePolicyStance(campaign: Campaign, projection: PolicyStanceProjection): ProjectionBundle;
/** Settlement is deterministic against willingness; the projection is the whole model. */
export declare function bundlePeace(projection: PeaceProjection): ProjectionBundle;
/** The count is deterministic; the clock is the authorization's own term. */
export declare function bundleForceAuthorization(projection: AuthorizationProjection): ProjectionBundle;
export declare function bundleConfirmation(projection: ConfirmationProjection): ProjectionBundle;
/** The vote is disposition and nothing else; the allocation is the budget draft's. */
export declare function bundleAppropriation(projection: AppropriationProjection): ProjectionBundle;
/**
 * The one instrument here whose whole effect is a disposition it already states.
 *
 * Lobbying is also the first ask on the board — the member has to be willing —
 * so the counterpart rides through as an argument rather than being read off the
 * projection: the projection's own module owns what it weighs, and until it
 * weighs the member there is nothing to pass and the bundle says nothing.
 */
export declare function bundleLobbying(campaign: Campaign, projection: LobbyProjection, counterpart?: ProjectionCounterpart): ProjectionBundle;
export type MaterialDecision = {
    readonly material: boolean;
    /** Which thresholds tripped, in the words a screen could print. */
    readonly reasons: readonly string[];
};
/**
 * Whether a decision deserves the full workbench before it is taken.
 * Deterministic: the same bundle against the same treasury always answers the
 * same, because a gate that flickered would train the player to ignore it.
 */
export declare function materialDecisionGate(bundle: ProjectionBundle, treasury: number): MaterialDecision;
