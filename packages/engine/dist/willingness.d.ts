import type { RngStreams } from "./rng.js";
/** Where a term came from, which is what a rendered reason is allowed to say. */
export type TermSource = "interest" | "obligation" | "trait" | "situation";
/**
 * Every decision this model answers. One member per standing question, because
 * a question's threshold, its term vocabulary and the phrase table that renders
 * it are all keyed by this.
 */
export type Question = 
/** A governor asked to consent to a federal action in their state. */
"governor-consent"
/** A minister deciding whether to offer their resignation. */
 | "minister-offer"
/** A minister deciding whether to put a proposal of their own to the President. */
 | "minister-proposal"
/** A minister deciding whether to break with the administration in public. */
 | "minister-break"
/** A member of Congress deciding whether a lobbying play moves them. */
 | "lobbied-member" | "issue-cooperation" | "cabinet-break-cooperation"
/** A foreign government's chosen move, adapted from the agent's own terms. */
 | "npc-act"
/** Whether a grievance becomes unrest this week. */
 | "unrest-onset"
/** A government deciding whether to fight beside one side of someone else's war. */
 | "join-war"
/** A treaty ally deciding whether to answer a call to arms. */
 | "answer-call"
/** A foreign government deciding whether to sign a treaty put to it. */
 | "accept-treaty"
/** A belligerent deciding whether to take the terms on the table. */
 | "accept-peace"
/** A member deciding how to vote in a body's own chamber. */
 | "org-vote"
/** A government that stays out of a war deciding whether to send aid to one side, or to a government struck by disaster. */
 | "send-aid"
/** A government deciding whether to act on a standing world-event template. */
 | "world-event"
/** A government deciding whether to receive a call, an envoy, a visit, a summit or a joint declaration. */
 | "receive-engagement"
/** A hazard, stamped when it fires: a coup attempt against a seated government. */
 | "coup-hazard"
/** A hazard, stamped when it fires: an armed operator acting from its host. */
 | "operator-hazard"
/** A hazard, stamped when it fires: a government missing a payment on its debt. */
 | "default-hazard"
/** The Attorney General deciding whether to clear an executive order for form and legality, or object to it in writing. */
 | "certify-order"
/** The chair who runs an act the President ordered deciding whether to carry it out at pace or drag it. */
 | "carry-out"
/** A minister who is leaking anyway deciding whether to aim the leak at a colleague they cannot work with. */
 | "aim-leak"
/** A minister deciding whether to bring the President an act of their own: an order, a posture change, an engagement. */
 | "minister-initiative"
/** A seated chair deciding whether to steer their department's contracts toward friends. */
 | "steer-contracts";
/**
 * Every term any question may weigh. Shared keys are deliberate: a minister's
 * ambition and a member's ambition are the same reading of the same field, and
 * a player reads one sentence for both.
 */
export type TermKey = "party-match" | "state-lean" | "reelection-year" | "term-limited" | "disaster-size" | "character" | "loyalty" | "ambition" | "integrity" | "principle" | "times-overruled" | "department-exposure" | "co-partisanship" | "overreach" | "refusal-record" | "statute" | "deference" | "policy-fit" | "boldness" | "colleague-enmity" | "budget-reach" | "oversight" | "disposition" | "standing-at-home" | "advocate" | "agenda-fit" | "intent-match" | "opportunity" | "escalation-fit" | "restraint" | "affordability" | "propensity" | "focus" | "salience" | "red-line" | "survival" | "driving-act" | "most-hurt-cohort" | "obligation" | "reliability" | "bond" | "enmity" | "stakes" | "defender-situation" | "aggressor-situation" | "regime-danger" | "wars-fought" | "appetite" | "isolationism" | "legalism" | "call-raised" | "trust-in-us" | "envoy" | "rapport" | "shared-warning" | "exhaustion" | "lost-support" | "losing" | "vengefulness" | "need" | "reach" | "regime-survival" | "sponsored" | "rivals-ambition" | "destabilized" | "host-pressure" | "debt-burden" | "dyad-kind" | "border" | "grievance";
/**
 * Which keys each question may weigh.
 *
 * This is the half that keeps the vocabulary honest. Without it the unions
 * would admit any key anywhere, and a question could quietly start weighing a
 * term nothing in its own domain can supply — which reads as a reason the
 * player cannot check.
 */
export declare const QUESTION_TERMS: Readonly<Record<Question, readonly TermKey[]>>;
/** One signed contribution, already weighted by the domain that built it. */
export type Term = {
    readonly key: TermKey;
    readonly source: TermSource;
    readonly value: number;
};
export type Willingness = {
    readonly question: Question;
    readonly terms: readonly Term[];
    readonly score: number;
    readonly threshold: number;
    readonly noiseBound: number;
    readonly noise: number;
    readonly acts: boolean;
    /** `score + noise - threshold`. Signed, so a refusal says how near it came. */
    readonly margin: number;
};
/** What a state-changing decision writes onto its packet, as the reason of record. */
export type DecisionStamp = {
    readonly question: Question;
    readonly actor: string;
    readonly subject?: string;
    readonly terms: readonly Term[];
    readonly score: number;
    readonly threshold: number;
    readonly acts: boolean;
    /** Inside the noise band: the terms alone would not have settled this. */
    readonly close: boolean;
    readonly visibility: "public" | "intelligence";
};
export type WillingnessForecast = "likely" | "unlikely" | "close";
export type WillingnessProjection = {
    readonly question: Question;
    readonly score: number;
    /** `score - threshold`: the margin with no draw in it, which is why it projects. */
    readonly margin: number;
    readonly forecast: WillingnessForecast;
    readonly threshold: number;
    readonly noiseBound: number;
    readonly leading: readonly TermKey[];
};
/**
 * A stream draw in [0, 1) mapped into ±`noiseBound`.
 *
 * Here rather than at each call site so every question's noise has the same
 * shape and the same centering, and so a caller cannot accidentally pass a raw
 * draw — which would be a term worth more than most of the real ones.
 */
export declare function noiseFrom(draw: number, noiseBound: number): number;
/**
 * The one draw a standing question is allowed, keyed by the question and
 * whatever names the actor and its subject, never the week.
 *
 * The only place the `"will"` stream is drawn from. A flat chance that decides
 * whether an actor acts would pass unnoticed if any module could wear this key,
 * so every decision reaches it through here and the willingness-route gate
 * refuses the key anywhere else.
 */
export declare function willDraw(streams: RngStreams, question: Question, ...subject: readonly (string | number)[]): number;
/** The decision: the weighted terms against the question's threshold, with the draw in. */
export declare function weigh(question: Question, terms: readonly Term[], options: {
    readonly threshold: number;
    readonly noiseBound: number;
    readonly noise: number;
}): Willingness;
/**
 * The same arithmetic with the draw left out, which is what makes it a
 * projection: no seed, no stream, the same answer on every render. Inside the
 * noise band it refuses to answer instead of guessing, because in that band the
 * draw is what decides and a forecast that named an outcome would be lying.
 */
export declare function projectWillingness(question: Question, terms: readonly Term[], options: {
    readonly threshold: number;
    readonly noiseBound: number;
}): WillingnessProjection;
/**
 * The reason of record for a decision that changed state.
 *
 * Visibility is the caller's to state and not derivable here: the same
 * arithmetic run for a governor is public and run for a foreign capital is an
 * intelligence read, and only the domain knows which of the two it is.
 */
export declare function stampOf(willingness: Willingness, actor: string, subject: string | undefined, visibility: DecisionStamp["visibility"]): DecisionStamp;
