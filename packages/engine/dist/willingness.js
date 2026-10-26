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
/** What a government weighs before it enters a war, whether it came in on its own or was called. */
const WAR_TERMS = [
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
export const QUESTION_TERMS = {
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
/**
 * Four decimals, the same place the agent's own score settles at. Sums of a
 * dozen floats are not associative, and a figure that shifts in its twelfth
 * place breaks the byte-identical replay the whole engine is verified by.
 */
const PLACES = 10000;
/** How many terms a rendered reason may name before it stops being a reason. */
const LEADING_TERMS = 3;
const round = (value) => Math.round(value * PLACES) / PLACES;
function checkTerms(question, terms) {
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
function checkBound(noiseBound) {
    if (!(noiseBound >= 0) || !Number.isFinite(noiseBound)) {
        throw new Error(`willingness: noiseBound must be a finite, non-negative number (got ${noiseBound})`);
    }
}
/** The sum the score is, kept in one place so the projection cannot drift from it. */
function scoreOf(terms) {
    return round(terms.reduce((total, term) => total + term.value, 0));
}
/**
 * A stream draw in [0, 1) mapped into ±`noiseBound`.
 *
 * Here rather than at each call site so every question's noise has the same
 * shape and the same centering, and so a caller cannot accidentally pass a raw
 * draw — which would be a term worth more than most of the real ones.
 */
export function noiseFrom(draw, noiseBound) {
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
export function willDraw(streams, question, ...subject) {
    return streams.stream("will", question, ...subject).next();
}
/** The decision: the weighted terms against the question's threshold, with the draw in. */
export function weigh(question, terms, options) {
    const { threshold, noiseBound, noise } = options;
    checkTerms(question, terms);
    checkBound(noiseBound);
    if (!Number.isFinite(threshold))
        throw new Error(`willingness: "${question}" has no finite threshold`);
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
export function projectWillingness(question, terms, options) {
    const { threshold, noiseBound } = options;
    checkTerms(question, terms);
    checkBound(noiseBound);
    if (!Number.isFinite(threshold))
        throw new Error(`willingness: "${question}" has no finite threshold`);
    const score = scoreOf(terms);
    const margin = round(score - threshold);
    const forecast = Math.abs(margin) < noiseBound ? "close" : margin >= 0 ? "likely" : "unlikely";
    return { question, score, margin, forecast, threshold, noiseBound, leading: leadingTerms(terms) };
}
/**
 * The terms that actually moved this, largest pull first. Ties keep the order
 * the domain supplied them in, so the list is stable across replays.
 */
function leadingTerms(terms) {
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
export function stampOf(willingness, actor, subject, visibility) {
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
