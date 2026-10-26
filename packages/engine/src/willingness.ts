// Whether an actor who is not the President is willing to do the thing it is
// being asked to do.
//
// Every such decision in the game is the same arithmetic: a handful of signed,
// already-weighted terms drawn from what the actor is and what the situation
// is, summed, and compared against the question's own threshold. Writing it
// once, here, is what makes the answer explainable — the record a decision
// leaves is the same list of terms the score was computed from, so nothing
// downstream has to reconstruct a reason or invent one alongside it.
//
// Three properties this module exists to guarantee:
//
//   Its one draw is `willDraw`. Noise is an argument: a caller draws once per
//   standing question with `willDraw(streams, question, actor, subject)` — no
//   turn in the key — so the same situation gives the same answer every week, and
//   the answer moves only when a term moves.
//
//   A projection is seed-independent. `projectWillingness` is the same sum
//   without the draw, so the forecast a player is shown and the decision the
//   world takes cannot disagree about anything but the noise, and the forecast
//   says "a close call" rather than guessing when the noise could decide it.
//
//   The vocabulary is closed. `Question` and `TermKey` are unions, and each
//   question declares the keys it may weigh, so a term invented at a call site
//   fails rather than reaching a player as an unphrased key.

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
  | "governor-consent"
  /** A minister deciding whether to offer their resignation. */
  | "minister-offer"
  /** A minister deciding whether to put a proposal of their own to the President. */
  | "minister-proposal"
  /** A minister deciding whether to break with the administration in public. */
  | "minister-break"
  /** A member of Congress deciding whether a lobbying play moves them. */
  | "lobbied-member"
  | "issue-cooperation"
  | "cabinet-break-cooperation"
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
export type TermKey =
  // governor-consent
  | "party-match"
  | "state-lean"
  | "reelection-year"
  | "term-limited"
  | "disaster-size"
  | "character"
  // the three minister questions
  | "loyalty"
  | "ambition"
  | "integrity"
  | "principle"
  | "times-overruled"
  | "department-exposure"
  | "co-partisanship"
  // certify-order, carry-out, aim-leak, minister-initiative and steer-contracts
  | "overreach"
  | "refusal-record"
  | "statute"
  | "deference"
  | "policy-fit"
  | "boldness"
  | "colleague-enmity"
  | "budget-reach"
  | "oversight"
  // lobbied-member
  | "disposition"
  | "standing-at-home"
  | "advocate"
  // npc-act, keyed to the agent's own score terms
  | "agenda-fit"
  | "intent-match"
  | "opportunity"
  | "escalation-fit"
  | "restraint"
  | "affordability"
  | "propensity"
  | "focus"
  | "salience"
  | "red-line"
  | "survival"
  | "response"
  // unrest-onset
  | "driving-act"
  | "most-hurt-cohort"
  // join-war, answer-call, org-vote and send-aid: a government's ties and its own character
  | "obligation"
  | "reliability"
  | "bond"
  | "enmity"
  | "stakes"
  | "defender-situation"
  | "aggressor-situation"
  | "regime-danger"
  | "wars-fought"
  | "appetite"
  | "isolationism"
  | "legalism"
  | "call-raised"
  // accept-treaty
  | "trust-in-us"
  // receive-engagement and accept-treaty: the people on either side of the table
  | "envoy"
  | "rapport"
  | "shared-warning"
  // accept-peace
  | "exhaustion"
  | "lost-support"
  | "losing"
  | "vengefulness"
  // send-aid
  | "need"
  | "reach"
  // the hazards
  | "regime-survival"
  | "sponsored"
  | "rivals-ambition"
  | "destabilized"
  | "host-pressure"
  | "debt-burden"
  // world-event
  | "dyad-kind"
  | "border"
  | "grievance";

/** What a government weighs before it enters a war, whether it came in on its own or was called. */
const WAR_TERMS: readonly TermKey[] = [
  "obligation",
  "reliability",
  "bond",
  "enmity",
  "stakes",
  "defender-situation",
  "aggressor-situation",
  "regime-danger",
  "wars-fought",
  "appetite",
  "isolationism",
  "legalism",
];

/**
 * Which keys each question may weigh.
 *
 * This is the half that keeps the vocabulary honest. Without it the unions
 * would admit any key anywhere, and a question could quietly start weighing a
 * term nothing in its own domain can supply — which reads as a reason the
 * player cannot check.
 */
export const QUESTION_TERMS: Readonly<Record<Question, readonly TermKey[]>> = {
  "governor-consent": ["party-match", "state-lean", "reelection-year", "term-limited", "disaster-size", "character"],
  "minister-offer": [
    "loyalty",
    "ambition",
    "integrity",
    "principle",
    "times-overruled",
    "department-exposure",
    "co-partisanship",
  ],
  "minister-proposal": [
    "loyalty",
    "ambition",
    "integrity",
    "principle",
    "times-overruled",
    "department-exposure",
    "co-partisanship",
  ],
  "minister-break": [
    "loyalty",
    "ambition",
    "integrity",
    "principle",
    "times-overruled",
    "department-exposure",
    "co-partisanship",
  ],
  "cabinet-break-cooperation": ["loyalty", "ambition", "integrity", "co-partisanship", "bond"],
  "issue-cooperation": ["policy-fit", "bond", "rapport", "ambition"],
  "lobbied-member": ["disposition", "ambition", "integrity", "standing-at-home", "advocate"],
  // Rapport between two leaders reaches a foreign government's own move as part
  // of how it reads the other side, which `intent-match` already names. A term
  // of its own here would weigh the same reading twice in one score.
  "npc-act": [
    "agenda-fit",
    "intent-match",
    "opportunity",
    "escalation-fit",
    "restraint",
    "affordability",
    "propensity",
    "focus",
    "salience",
    "red-line",
    "survival",
    "response",
  ],
  "unrest-onset": ["most-hurt-cohort", "driving-act"],
  "join-war": [...WAR_TERMS],
  "answer-call": [...WAR_TERMS, "call-raised"],
  "accept-treaty": ["trust-in-us", "agenda-fit", "legalism", "reliability", "isolationism", "envoy", "rapport"],
  "accept-peace": ["exhaustion", "lost-support", "losing", "vengefulness", "appetite", "legalism"],
  "org-vote": ["obligation", "bond", "enmity", "stakes", "agenda-fit", "isolationism", "legalism"],
  "send-aid": ["need", "reach", "bond", "enmity", "stakes", "obligation", "isolationism", "appetite"],
  "world-event": ["dyad-kind", "border", "grievance", "enmity", "appetite", "isolationism", "legalism"],
  "receive-engagement": ["bond", "enmity", "stakes", "agenda-fit", "isolationism", "envoy", "rapport", "shared-warning"],
  "coup-hazard": ["regime-survival", "rivals-ambition", "destabilized", "sponsored"],
  "operator-hazard": ["host-pressure", "destabilized", "regime-survival"],
  "default-hazard": ["debt-burden", "destabilized", "regime-survival"],
  "certify-order": ["overreach", "principle", "deference", "refusal-record", "statute"],
  "carry-out": ["deference", "policy-fit", "times-overruled", "department-exposure", "boldness"],
  "aim-leak": ["colleague-enmity", "deference"],
  "minister-initiative": ["loyalty", "ambition", "times-overruled", "policy-fit", "co-partisanship"],
  "steer-contracts": ["principle", "ambition", "budget-reach", "oversight"],
};

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
 * Four decimals, the same place the agent's own score settles at. Sums of a
 * dozen floats are not associative, and a figure that shifts in its twelfth
 * place breaks the byte-identical replay the whole engine is verified by.
 */
const PLACES = 10000;

/** How many terms a rendered reason may name before it stops being a reason. */
const LEADING_TERMS = 3;

const round = (value: number): number => Math.round(value * PLACES) / PLACES;

function checkTerms(question: Question, terms: readonly Term[]): void {
  const allowed = QUESTION_TERMS[question];
  for (const term of terms) {
    if (!allowed.includes(term.key)) {
      throw new Error(`willingness: "${question}" cannot weigh the term "${term.key}"`);
    }
    if (!Number.isFinite(term.value)) {
      throw new Error(`willingness: term "${term.key}" on "${question}" is not a finite value`);
    }
  }
}

function checkBound(noiseBound: number): void {
  if (!(noiseBound >= 0) || !Number.isFinite(noiseBound)) {
    throw new Error(`willingness: noiseBound must be a finite, non-negative number (got ${noiseBound})`);
  }
}

/** The sum the score is, kept in one place so the projection cannot drift from it. */
function scoreOf(terms: readonly Term[]): number {
  return round(terms.reduce((total, term) => total + term.value, 0));
}

/**
 * A stream draw in [0, 1) mapped into ±`noiseBound`.
 *
 * Here rather than at each call site so every question's noise has the same
 * shape and the same centering, and so a caller cannot accidentally pass a raw
 * draw — which would be a term worth more than most of the real ones.
 */
export function noiseFrom(draw: number, noiseBound: number): number {
  checkBound(noiseBound);
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new Error(`willingness: a stream draw must be in [0, 1) (got ${draw})`);
  }
  return round((draw - 0.5) * 2 * noiseBound);
}

/**
 * The one draw a standing question is allowed, keyed by the question and
 * whatever names the actor and its subject, never the week.
 *
 * The only place the `"will"` stream is drawn from. A flat chance that decides
 * whether an actor acts would pass unnoticed if any module could wear this key,
 * so every decision reaches it through here and the willingness-route gate
 * refuses the key anywhere else.
 */
export function willDraw(streams: RngStreams, question: Question, ...subject: readonly (string | number)[]): number {
  return streams.stream("will", question, ...subject).next();
}

/** The decision: the weighted terms against the question's threshold, with the draw in. */
export function weigh(
  question: Question,
  terms: readonly Term[],
  options: { readonly threshold: number; readonly noiseBound: number; readonly noise: number },
): Willingness {
  const { threshold, noiseBound, noise } = options;
  checkTerms(question, terms);
  checkBound(noiseBound);
  if (!Number.isFinite(threshold)) throw new Error(`willingness: "${question}" has no finite threshold`);
  if (!Number.isFinite(noise) || Math.abs(noise) > noiseBound) {
    throw new Error(`willingness: noise ${noise} on "${question}" is outside ±${noiseBound}; map the draw with noiseFrom`);
  }
  const score = scoreOf(terms);
  const margin = round(score + noise - threshold);
  return {
    question,
    terms: [...terms],
    score,
    threshold,
    noiseBound,
    noise,
    acts: margin >= 0,
    margin,
  };
}

/**
 * The same arithmetic with the draw left out, which is what makes it a
 * projection: no seed, no stream, the same answer on every render. Inside the
 * noise band it refuses to answer instead of guessing, because in that band the
 * draw is what decides and a forecast that named an outcome would be lying.
 */
export function projectWillingness(
  question: Question,
  terms: readonly Term[],
  options: { readonly threshold: number; readonly noiseBound: number },
): WillingnessProjection {
  const { threshold, noiseBound } = options;
  checkTerms(question, terms);
  checkBound(noiseBound);
  if (!Number.isFinite(threshold)) throw new Error(`willingness: "${question}" has no finite threshold`);
  const score = scoreOf(terms);
  const margin = round(score - threshold);
  const forecast: WillingnessForecast = Math.abs(margin) < noiseBound ? "close" : margin >= 0 ? "likely" : "unlikely";
  return { question, score, margin, forecast, threshold, noiseBound, leading: leadingTerms(terms) };
}

/**
 * The terms that actually moved this, largest pull first. Ties keep the order
 * the domain supplied them in, so the list is stable across replays.
 */
function leadingTerms(terms: readonly Term[]): readonly TermKey[] {
  return terms
    .map((term, index) => ({ term, index }))
    .filter(({ term }) => term.value !== 0)
    .sort((a, b) => Math.abs(b.term.value) - Math.abs(a.term.value) || a.index - b.index)
    .slice(0, LEADING_TERMS)
    .map(({ term }) => term.key);
}

/**
 * The reason of record for a decision that changed state.
 *
 * Visibility is the caller's to state and not derivable here: the same
 * arithmetic run for a governor is public and run for a foreign capital is an
 * intelligence read, and only the domain knows which of the two it is.
 */
export function stampOf(
  willingness: Willingness,
  actor: string,
  subject: string | undefined,
  visibility: DecisionStamp["visibility"],
): DecisionStamp {
  return {
    question: willingness.question,
    actor,
    ...(subject === undefined ? {} : { subject }),
    terms: willingness.terms,
    score: willingness.score,
    threshold: willingness.threshold,
    acts: willingness.acts,
    close: Math.abs(willingness.margin) < willingness.noiseBound,
    visibility,
  };
}
