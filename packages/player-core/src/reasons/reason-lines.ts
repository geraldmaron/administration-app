import { hasIntelOnNation, type Campaign, type DecisionStamp, type Question, type Term, type TermKey } from "@admin/engine";
import type { NationId } from "@admin/world";

// Why somebody decided what they decided, in the words a player reads.
//
// The engine weighs a decision out of named terms and stamps the weighing on
// the event it produced, which means the answer to "why did the governor
// refuse" exists as data rather than as a guess. Rendering it is a presentation
// question — which terms are worth naming, in what order, and in whose voice —
// so it lives here rather than in the engine.
//
// Three rules bind every line this produces. A reason about a foreign
// government renders only where the player's services can actually read that
// government (`hasIntelOnNation`), because a reason is knowledge and the fog is
// the whole point of holding it. A reason drawn from a government's temperament
// renders only for a government the dataset knows in full, because a thin
// record's temperament is its region's, and naming it as the cause would give
// the country a personality it was never authored with. And a line never states
// a hidden figure: it names the term, not the number behind it.

/** One reason, already a sentence, with the term it came from kept for ordering and tests. */
export type ReasonLine = {
  readonly key: string;
  readonly text: string;
};

/**
 * What a term is, said both ways: `up` is the term pulling toward acting, and
 * `down` is the same term pulling against it. Each is a noun phrase, so a line
 * can say "because of" or "despite" in front of it as the outcome requires.
 */
type Phrase = { readonly up: string; readonly down: string };

// A Record over the whole union, so a term key with no phrase fails the
// typecheck instead of reaching a player as a debug string.
const PHRASES: Readonly<Record<TermKey, Phrase>> = {
  "party-match": { up: "a shared party", down: "the party line between you" },
  "state-lean": { up: "a state that leans your way", down: "a state that leans against you" },
  "reelection-year": { up: "an election that rewards it", down: "a tough election at home" },
  "term-limited": { up: "a last term with nothing left to lose", down: "more elections still ahead" },
  "disaster-size": { up: "the size of the disaster", down: "a disaster too small to need it" },
  character: { up: "their own character", down: "their own character" },
  loyalty: { up: "loyalty to you", down: "little loyalty to you" },
  ambition: { up: "ambition of their own", down: "ambition of their own" },
  integrity: { up: "their own integrity", down: "their own integrity" },
  principle: { up: "a matter of principle", down: "a matter of principle" },
  // These two terms are sized by a quantity that is never negative (how often
  // the minister was overruled, how exposed the department is), and their sign
  // is the question's weight, not more or less of the thing: overruling pushes
  // a minister toward resigning but away from proposing or carrying out. So the
  // words name the quantity whichever way it pulls.
  "times-overruled": { up: "being overruled before", down: "being overruled before" },
  "department-exposure": { up: "how exposed the department is", down: "how exposed the department is" },
  "co-partisanship": { up: "a shared party", down: "the party line between you" },
  overreach: { up: "an order well inside your powers", down: "how far the order goes beyond your powers" },
  "refusal-record": { up: "a clean record on your orders", down: "earlier orders of yours that went too far legally" },
  statute: { up: "a law that already allows it", down: "no law that allows it" },
  deference: { up: "a habit of deferring to you", down: "a habit of going their own way" },
  "policy-fit": { up: "a policy they believe in", down: "a policy they don't believe in" },
  boldness: { up: "a taste for moving fast", down: "a habit of moving slowly" },
  "colleague-enmity": { up: "a feud with another Cabinet member", down: "no feud worth settling" },
  "budget-reach": { up: "a large budget to steer", down: "a small budget to steer" },
  oversight: { up: "nobody checking the department's books", down: "people checking the department's books" },
  disposition: { up: "warm feelings toward you", down: "cool feelings toward you" },
  "standing-at-home": { up: "how you stand with their voters", down: "how you stand with their voters" },
  advocate: { up: "a Secretary who made the case well", down: "a weak case from your Secretary" },
  "agenda-fit": { up: "what it wants abroad", down: "goals this move doesn't help" },
  "intent-match": { up: "how it sees the other side", down: "a view of the other side that called for less" },
  opportunity: { up: "good odds of it working", down: "poor odds of it working" },
  "escalation-fit": { up: "a step it was ready to take", down: "a reluctance to go this far" },
  restraint: { up: "nothing to hold it back", down: "its own restraint" },
  affordability: { up: "money to spare", down: "what it costs" },
  propensity: { up: "a habit of reaching for this", down: "a habit of leaving this alone" },
  focus: { up: "a campaign it is already running", down: "no campaign under way" },
  salience: { up: "how much the other side matters to it", down: "how little the other side matters to it" },
  "red-line": { up: "a line it promised to defend", down: "a line it never drew" },
  survival: { up: "a government fighting to keep power", down: "trouble at home" },
  "driving-act": { up: "the action behind it", down: "no action behind it" },
  "most-hurt-cohort": { up: "a group that was hurt and remembers it", down: "no group carrying a grievance" },
  obligation: { up: "a promise it made to defend", down: "no promise binding it" },
  reliability: { up: "a habit of keeping its word", down: "a habit of breaking its word" },
  bond: { up: "close ties to that side", down: "thin ties to that side" },
  enmity: { up: "an old quarrel with the other side", down: "no quarrel with the other side" },
  stakes: { up: "what it stands to lose", down: "how little it has at stake" },
  "defender-situation": { up: "how the defense is faring", down: "how the defense is faring" },
  "aggressor-situation": { up: "how the attack is faring", down: "how the attack is faring" },
  "regime-danger": { up: "a threat to its own government", down: "a government secure at home" },
  "wars-fought": { up: "the wars it has already fought", down: "the wars it is already fighting" },
  appetite: { up: "an appetite for risk", down: "a caution about risk" },
  isolationism: { up: "a readiness to act abroad", down: "a wish to stay out of others' affairs" },
  legalism: { up: "respect for what the law says", down: "respect for what the law says" },
  "call-raised": { up: "the call it was sent", down: "no call it was sent" },
  "trust-in-us": { up: "its trust in the United States", down: "its distrust of the United States" },
  envoy: { up: "the skill of your Secretary of State", down: "a Secretary of State who isn't very skilled" },
  rapport: { up: "a good personal relationship between the leaders", down: "bad blood between the leaders" },
  "shared-warning": { up: "a warning you gave them about pressure aimed at them", down: "no relevant warning shared" },
  exhaustion: { up: "a war that has worn it down", down: "a war it can still fight" },
  "lost-support": { up: "support at home that has fallen away", down: "support at home that has held" },
  losing: { up: "a war it is losing", down: "a war it is winning" },
  vengefulness: { up: "a memory of what was done to it", down: "a memory of what was done to it" },
  need: { up: "how badly that side needs help", down: "a side that needs little help" },
  reach: { up: "the means to get help there", down: "no way to get help there" },
  "regime-survival": { up: "a government fighting to survive", down: "a government secure in power" },
  "rivals-ambition": { up: "rivals with ambitions of their own", down: "rivals who wait their turn" },
  sponsored: { up: "a foreign government backing the plotters", down: "no foreign government backing a move against it" },
  destabilized: { up: "a country already shaken", down: "a country holding steady" },
  "host-pressure": { up: "a host that does little to stop it", down: "a host that presses it hard" },
  "debt-burden": { up: "a debt it cannot carry", down: "a debt it can still carry" },
  "dyad-kind": { up: "the kind of rivalry between them", down: "the kind of ties between them" },
  border: { up: "a border they share", down: "the distance between them" },
  grievance: { up: "a grievance it holds", down: "no grievance to settle" },
};

/** How many terms a rendered reason names before it stops being a reason. */
const LEADING = 3;

/** The foreign government a stamp speaks for, when it speaks for one. */
function foreignActor(stamp: DecisionStamp, campaign: Campaign): NationId | undefined {
  const id = stamp.actor as NationId;
  return id !== campaign.founding.nation && campaign.nations[id] !== undefined ? id : undefined;
}

/** The terms a line may name for this stamp, heaviest first; ties keep the order the domain gave them. */
function namedTerms(stamp: DecisionStamp, campaign: Campaign, nation: NationId | undefined): readonly Term[] {
  const thin = nation !== undefined && (campaign.nations[nation]?.base.fidelity ?? "full") !== "full";
  return stamp.terms
    .map((term, index) => ({ term, index }))
    .filter(({ term }) => term.value !== 0 && !(thin && term.source === "trait"))
    .sort((a, b) => Math.abs(b.term.value) - Math.abs(a.term.value) || a.index - b.index)
    .slice(0, LEADING)
    .map(({ term }) => term);
}

/**
 * Where one question reads a shared key the other way round. The Attorney
 * General's review weighs principle negatively, so a positive term there is a
 * loose reading of the rules rather than a principled one.
 */
const QUESTION_PHRASES: Partial<Record<Question, Partial<Record<TermKey, Phrase>>>> = {
  "certify-order": { principle: { up: "a loose reading of the rules", down: "a matter of principle" } },
};

function lineFor(term: Term, acts: boolean, question: Question): ReasonLine {
  const phrase = QUESTION_PHRASES[question]?.[term.key] ?? PHRASES[term.key];
  const pulledToward = term.value > 0;
  const words = pulledToward ? phrase.up : phrase.down;
  return { key: term.key, text: `${pulledToward === acts ? "Because of" : "Despite"} ${words}.` };
}

/**
 * The reasons behind one stamped decision, heaviest first: each term that
 * pulled the way the decision went reads "Because of", and each that pulled
 * against it reads "Despite". Empty where the fog or the record forbids a
 * reason at all.
 */
export function reasonLines(stamp: DecisionStamp, campaign: Campaign): readonly ReasonLine[] {
  const nation = foreignActor(stamp, campaign);
  if (nation !== undefined && !hasIntelOnNation(campaign, nation)) return [];
  return namedTerms(stamp, campaign, nation).map((term) => lineFor(term, stamp.acts, stamp.question));
}
