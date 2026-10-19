import { IDEOLOGY_AXES, type IdeologyVector } from "@admin/world";
import { EXECUTIVE_ORDERS } from "./orders.js";
import type { InstrumentId } from "./instrument-ids.js";
import type { ActionRecord, AlignmentVector, Campaign } from "./state.js";

// What a masthead makes of what the administration has actually done.
//
// The six press drivers are facts about the record that every desk reads the
// same way: an order the courts threw out is an order the courts threw out at
// the adversarial daily and at the sympathetic weekly alike. What they do not
// carry is the substance of the acts themselves, and substance is most of what
// a newsroom's opinion of a government is made of. A president who moves
// military construction money under an emergency has done something the paper
// that believes in executive authority approves of and the paper that covers
// Congress's purse exists to object to, and until this file there was no way
// for the two to move in opposite directions in the same week.
//
// The geometry is the one every other actor already uses: the three axes of
// IdeologyVector / PartyBeliefs / AlignmentVector, folded as a dot product
// exactly as `partyReading` folds a platform against a domestic signature and
// `cohortAffinity` folds a cohort's beliefs against a declared `values` pull.
// Nothing new is invented here — only pointed at a masthead.

/**
 * Where the pull comes from.
 *
 * Two sources, both already on the campaign.
 *
 * The catalogue is the first: `ExecutiveOrder.alignment` is authored beside the
 * order and is what `signOrder` accumulates into `player.alignments`. It was
 * once the only one, and that left the desks reading a seven-entry catalogue
 * while the presidency spent its term answering the scenarios that are the
 * game's actual week — an administration could sign nothing and be read as
 * having done nothing.
 *
 * The second is the ledger. Every decision the President takes is stamped
 * there with its week and its causal origin, and two of the things it records
 * are alignment-bearing on their face: which instrument was reached for, and
 * what the act spent of the government's own standing (`institutional`). Both
 * are catalogued or authored facts, never prose — see `decisionPull` for what
 * each is read as and what is deliberately left unread.
 */
export type ActPull = {
  /** Per-axis sum of what the window's acts said, each axis clamped to −1..1. */
  readonly pull: Partial<AlignmentVector>;
  /**
   * The most recent act that said anything, for a surface that has to name it.
   *
   * `kind` travels with it because the two do not go into a sentence the same
   * way: an order has a catalogue name a screen can drop into a clause, and a
   * decision's name is the sentence it is remembered by. A surface that phrased
   * both the same way would print a full stop in the middle of its own line.
   */
  readonly act?: { readonly name: string; readonly turn: number; readonly kind: PresidentialAct["kind"] };
};

/**
 * How far back a newsroom's argument with an administration runs.
 *
 * Sixteen weeks: long enough that a term's worth of orders is not read off the
 * last one signed, short enough that a paper is arguing with this month's
 * government rather than with the one that took office.
 */
export const PRESS_ACT_MEMORY_TURNS = 16;

/**
 * How far a desk's own reading of the substance can carry it off the shared
 * record. Larger than nothing and smaller than LEAN_WEIGHT (0.35): what a paper
 * was before this president still outweighs any one season of orders, but a
 * government that spends a term signing things one masthead hates is covered
 * accordingly.
 */
export const PRESS_BELIEF_WEIGHT = 0.4;

const clamp11 = (value: number) => Math.max(-1, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/**
 * How far a single decision can carry a masthead's reading, against an order's
 * authored alignment (0.1 to 0.35 across the catalogue).
 *
 * Smaller than the smallest order on purpose. A signature is a government
 * committing itself in writing; answering the week is what a government does
 * every week, and a term of consistent answers should add up to an argument
 * without any one of them reading as an executive order.
 */
export const DECISION_ACT_WEIGHT = 0.08;

/**
 * What reaching for each instrument says, at the top rung, before the weight
 * above.
 *
 * The ladder already ranks its five instruments by how coercive they are, on
 * the same 0..1 scale a nation's hostility is read on, and that ranking
 * centered on the middle of the scale *is* the nationalist/globalist reading of
 * a foreign act. A state that arrives with relief crates is doing the thing the
 * globalist masthead exists to approve of; a state that arrives with its army
 * is doing the thing the nationalist one does.
 *
 * Restated here rather than imported from `instruments.ts`. This module sits
 * inside that file's value-import cycle, and a second edge into it is exactly
 * the initialization failure its header warns about. The two are one fact and
 * are held to it by `press-beliefs.test.ts`, which imports both and fails if
 * the ordering ever disagrees.
 *
 * `economicLeftRight` is deliberately unread here. Sanctioning a capital says
 * nothing about what a government believes at home, and a newsroom that scored
 * it as though it did would be reading a foreign act as a domestic platform.
 * That axis reaches the desks through the order catalogue and through a reply's
 * own authored `pull`, which are the two places it is actually declared.
 */
const INSTRUMENT_STANCE: Readonly<Record<InstrumentId, Partial<AlignmentVector>>> = {
  assistance: { nationalistGlobalist: -0.9 },
  diplomatic: { nationalistGlobalist: -0.5 },
  economic: { nationalistGlobalist: 0 },
  // The two a president reaches for when they do not want to ask anyone first.
  // That is an authority claim whoever it is pointed at, and it is the one
  // domestic reading a foreign act honestly carries.
  covert: { nationalistGlobalist: 0.5, authLibertarian: 0.6 },
  military: { nationalistGlobalist: 1, authLibertarian: 0.3 },
};

/**
 * What each institutional cost says, before the weight above.
 *
 * The content layer's own vocabulary for what an act spent of the government's
 * capacity, declared on the reply and written straight onto the ledger entry.
 * Only the entries with an unambiguous reading are here: a strained civil
 * service or a spent legislative majority is a price, not a position, and
 * scoring one as a position would be the inference from prose this module
 * refuses.
 */
const INSTITUTIONAL_PULL: Readonly<Record<string, Partial<AlignmentVector>>> = {
  "emergency-powers-invoked": { authLibertarian: 1 },
  "legal-authority-spent": { authLibertarian: 0.6 },
  "intelligence-source-burned": { authLibertarian: 0.3 },
  "forces-committed": { nationalistGlobalist: 0.5 },
  "alliance-credit-earned": { nationalistGlobalist: -0.8 },
  "alliance-credit-spent": { nationalistGlobalist: 0.5 },
};

function addPull(into: Record<string, number>, pull: Partial<AlignmentVector>, scale = 1): void {
  for (const axis of IDEOLOGY_AXES) {
    const value = pull[axis];
    if (value === undefined || value === 0) continue;
    into[axis] = (into[axis] ?? 0) + value * scale;
  }
}

/**
 * What one decision on the record said, in the space the outlets think in.
 *
 * A rung scales the instrument's reading because the ladder's rungs are
 * magnitudes of the same act: a demarche and a blockade are both economic
 * statecraft and only one of them is an argument about how a country should
 * stand in the world.
 */
function decisionPull(entry: ActionRecord): Partial<AlignmentVector> {
  const totals: Record<string, number> = {};
  if (entry.commitment) {
    const stance = INSTRUMENT_STANCE[entry.commitment.instrument];
    addPull(totals, stance, (entry.commitment.rung / 5) * DECISION_ACT_WEIGHT);
  }
  for (const cost of entry.institutional ?? []) {
    addPull(totals, INSTITUTIONAL_PULL[cost] ?? {}, DECISION_ACT_WEIGHT);
  }
  return Object.fromEntries(Object.entries(totals).map(([axis, total]) => [axis, round3(total)]));
}

/**
 * One thing this administration did, as a desk would file it.
 *
 * `kind` is kept because the two are not the same act to a newsroom: an order
 * is a government committing itself in writing and a decision is a government
 * answering the week, and a surface that names the most recent one should be
 * able to say which it is looking at.
 */
export type PresidentialAct = {
  readonly turn: number;
  /** What the country would call it: the order's name, or the sentence the decision is remembered by. */
  readonly name: string;
  readonly kind: "order" | "decision";
  readonly pull: Partial<AlignmentVector>;
};

function orderActs(campaign: Campaign): readonly PresidentialAct[] {
  return campaign.orders.flatMap((record) => {
    if (campaign.turn - record.turn > PRESS_ACT_MEMORY_TURNS) return [];
    const order = EXECUTIVE_ORDERS.find((entry) => entry.id === record.order);
    if (!order) return [];
    const totals: Record<string, number> = {};
    addPull(totals, order.alignment);
    return [{ turn: record.turn, name: order.name, kind: "order" as const, pull: totals }];
  });
}

/**
 * The decisions in the window, off the one record that holds them.
 *
 * `causal.origin === "decision"` rather than `actor === "player"` alone: the
 * ledger's player half also carries what an agency executed on the
 * administration's behalf and what the calendar reached, and a masthead
 * arguing with a government is arguing with what the government chose.
 */
function decisionActs(campaign: Campaign): readonly PresidentialAct[] {
  return campaign.ledger.flatMap((entry) => {
    if (entry.actor !== "player" || entry.causal?.origin !== "decision") return [];
    if (campaign.turn - entry.turn > PRESS_ACT_MEMORY_TURNS) return [];
    return [{ turn: entry.turn, name: entry.description, kind: "decision" as const, pull: decisionPull(entry) }];
  });
}

/**
 * Everything this administration has done inside the press's memory, oldest
 * first, whether or not it said anything a masthead can read.
 *
 * Exported whole because the podium and the Desk's own wire need the record
 * itself rather than the fold of it — a president explaining the week has to
 * name the act, and an act with no alignment is still an act they took.
 */
export function presidentialActs(campaign: Campaign): readonly PresidentialAct[] {
  return [...orderActs(campaign), ...decisionActs(campaign)].sort((a, b) => a.turn - b.turn);
}

/**
 * What this administration has been doing, in the space the outlets think in.
 *
 * Struck-down orders still count: the paper is reading what the government
 * tried to do, and a court undoing it is separately one of the six shared
 * drivers. Counting it twice in the same direction is the only way to get this
 * wrong, and the two terms are about different things.
 */
export function recentActPull(campaign: Campaign): ActPull {
  const totals: Record<string, number> = {};
  let act: ActPull["act"];
  for (const entry of presidentialActs(campaign)) {
    // An act that said nothing is not named. A government that has only ever
    // done things with no reading still reads as silent rather than as
    // neutral, which is the distinction this whole module turns on.
    if (IDEOLOGY_AXES.every((axis) => (entry.pull[axis] ?? 0) === 0)) continue;
    addPull(totals, entry.pull);
    if (!act || entry.turn >= act.turn) act = { name: entry.name, turn: entry.turn, kind: entry.kind };
  }
  const pull: Partial<AlignmentVector> = Object.fromEntries(
    Object.entries(totals).map(([axis, total]) => [axis, clamp11(total)]),
  );
  return act ? { pull, act } : { pull };
}

/**
 * How one masthead reads that pull. Signed: positive is "this is what we are
 * for", negative is "this is the thing we were founded to be against".
 *
 * The same fold `partyReading` uses, divided by the axis count for the reason
 * `alignmentAffinity` divides by its shared-axis count: it keeps the result in
 * −1..1 without a clamp ever having to bite, which is what lets the four
 * readings still sum to zero across the roster.
 */
export function outletReading(beliefs: IdeologyVector, pull: Partial<AlignmentVector>): number {
  const total = IDEOLOGY_AXES.reduce((sum, axis) => sum + beliefs[axis] * (pull[axis] ?? 0), 0);
  return clamp11(total / IDEOLOGY_AXES.length);
}

/** The same reading, rounded, for anything that prints or stores it. */
export function outletActReading(beliefs: IdeologyVector, pull: Partial<AlignmentVector>): number {
  return round3(outletReading(beliefs, pull));
}
