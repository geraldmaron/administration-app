import type { CourtCase, CourtProceeding, SolicitorGeneralEvent } from "./state-judiciary.js";
import { recordSolicitorGeneral } from "./solicitor-general.js";
import { currentEventId, type CausalId } from "./causality.js";
import { appendWithinCap } from "./feed-cap.js";
import { fileAtDesks } from "./press-filing.js";
import type {
  AccountCapRaise,
  Campaign,
  Commitment,
  FeedItem,
  FundingLapse,
  NationCondition,
  PendingRule,
  Pursuit,
} from "./state.js";
import type { DeclaredEmergency, ExternalThreatEmergency } from "./state-emergency.js";
import type { DecisionFraming } from "./press-framing.js";

// The multi-turn world records, and the one operation that writes all of them.
//
// Four handlers in effects.ts did the identical thing with a different register
// name — spread the record, key by `set.id` — and a fifth was about to be added
// for declared emergencies. They are one idea, so they are one function here,
// and effects.ts keeps the dispatch rather than five copies of the write.
//
// Split out of effects.ts beside it, the way state-effects.ts was, because that
// file sits at a recorded size ceiling and a new record must not push it past.

/**
 * What every one of these records carries so the causal graph can reach it.
 *
 * The four families here are the campaign's multi-turn memory: a condition
 * that runs for eleven weeks, an emergency that outlives the crisis that
 * declared it, a commitment paid every turn until it is not. They are exactly
 * the records whose later weeks were unattributable — the phase that worsens a
 * condition in June holds the record and nothing else, so it could never point
 * at the week the condition opened.
 */
export type CausedRecord = { readonly id: string; readonly causedBy?: CausalId };

/**
 * Replace one record whole, by its own id, keeping its place in the graph.
 *
 * Whole rather than patched, for the reason each of these types was given its
 * own comment when it was added separately: these are small records with a
 * status, and patching one field of one from two places is how a suspended
 * commitment ends up still being paid for.
 *
 * The one thing that is not replaced is `causedBy`. It is written once, when
 * the record first appears, from the event being folded — and every later
 * write of the same id inherits it, because a record does not get a new origin
 * story every week. A caller that supplies one explicitly wins, so a migration
 * or a test can pin it.
 */
function setById<T extends CausedRecord>(
  current: Readonly<Record<string, T>>,
  set: T,
): Readonly<Record<string, T>> {
  const existing = current[set.id];
  // Stamped only where the record is new. An existing record inherits what it
  // already had and nothing more — including nothing, which is what a record
  // written by an older build carries. Stamping one of those with the week it
  // next happened to change would claim the drought started in June because
  // June is when it got worse, which is a fabricated cause and worse than an
  // absent one.
  const inherited = set.causedBy ?? (existing ? existing.causedBy : currentEventId());
  const record = inherited === undefined || inherited === set.causedBy ? set : { ...set, causedBy: inherited };
  return { ...current, [set.id]: record };
}

export type CommitmentEffect = { readonly kind: "commitment"; readonly set: Commitment };
export type ConditionEffect = { readonly kind: "condition"; readonly set: NationCondition };
export type PursuitEffect = { readonly kind: "pursuit"; readonly set: Pursuit };
export type EmergencyEffect = { readonly kind: "emergency"; readonly set: DeclaredEmergency };
export type ExternalEmergencyEffect = { readonly kind: "externalEmergency"; readonly set: ExternalThreatEmergency };

export function applyCommitment(state: Campaign, effect: CommitmentEffect): Campaign {
  return { ...state, commitments: setById(state.commitments, effect.set) };
}

export function applyCondition(state: Campaign, effect: ConditionEffect): Campaign {
  return { ...state, conditions: setById(state.conditions, effect.set) };
}

export function applyPursuit(state: Campaign, effect: PursuitEffect): Campaign {
  return { ...state, pursuits: setById(state.pursuits, effect.set) };
}

export function applyEmergency(state: Campaign, effect: EmergencyEffect): Campaign {
  return { ...state, emergencies: setById(state.emergencies, effect.set) };
}

export function applyExternalEmergency(state: Campaign, effect: ExternalEmergencyEffect): Campaign {
  return { ...state, externalEmergencies: setById(state.externalEmergencies ?? {}, effect.set) };
}

// --- The two records the campaign keeps as a list rather than a table -------
//
// Both are append-then-amend: a proceeding is opened once and rewritten as it
// finishes, and a ceiling is lifted once and then simply runs out. Kept in
// order rather than keyed because both are read as a sequence — what this
// administration set running, and what Congress has authorized it to spend —
// and a table would lose the order for nothing.

export type PendingRuleEffect = { readonly kind: "pendingRule"; readonly set: PendingRule };
export type CourtCaseEffect = { readonly kind: "courtCase"; readonly set: CourtCase };
export type CourtProceedingEffect = { readonly kind: "courtProceeding"; readonly set: CourtProceeding };
export type SolicitorGeneralEffect = { readonly kind: "solicitorGeneral"; readonly event: SolicitorGeneralEvent };
export type CapRaiseEffect = { readonly kind: "capRaise"; readonly set: AccountCapRaise };

function setInList<T extends { readonly id: string }>(list: readonly T[], set: T): readonly T[] {
  return list.some((entry) => entry.id === set.id)
    ? list.map((entry) => (entry.id === set.id ? set : entry))
    : [...list, set];
}

export function applyCourtCase(state: Campaign, effect: CourtCaseEffect): Campaign {
  return { ...state, judiciary: { ...state.judiciary, cases: setInList(state.judiciary.cases, effect.set) } };
}

export function applyCourtProceeding(state: Campaign, effect: CourtProceedingEffect): Campaign {
  return { ...state, judiciary: { ...state.judiciary, proceedings: setInList(state.judiciary.proceedings ?? [], effect.set) } };
}

export function applySolicitorGeneral(state: Campaign, effect: SolicitorGeneralEffect): Campaign {
  return { ...state, judiciary: { ...state.judiciary,
    solicitorGeneral: recordSolicitorGeneral(state.judiciary.solicitorGeneral, effect.event) } };
}

export function applyPendingRule(state: Campaign, effect: PendingRuleEffect): Campaign {
  return { ...state, pendingRules: setInList(state.pendingRules, effect.set) };
}

export function applyCapRaise(state: Campaign, effect: CapRaiseEffect): Campaign {
  return { ...state, capRaises: setInList(state.capRaises, effect.set) };
}

// --- How an act was explained ----------------------------------------------
//
// An amend of one field on an order already signed, matched on the record's own
// id, in the shape `orderReview` amends the court case. It is separate from the
// signature for the same reason: what the government did is settled the moment
// the pen leaves the page, and what it said about it afterwards is a later
// event that must not be able to rewrite the act.

export type OrderFramingEffect = {
  readonly kind: "orderFraming";
  readonly id: string;
  readonly framing: DecisionFraming;
};

export function applyOrderFraming(state: Campaign, effect: OrderFramingEffect): Campaign {
  const record = state.orders.find((entry) => entry.id === effect.id);
  if (!record) throw new Error(`no executive order ${effect.id} to frame`);
  if (record.framing) throw new Error(`executive order ${effect.id} has already been framed`);
  return {
    ...state,
    orders: state.orders.map((entry) => (entry.id === effect.id ? { ...entry, framing: effect.framing } : entry)),
  };
}

// --- The money running out, and the record that it did ----------------------

export type FundingLapseEffect = { readonly kind: "fundingLapse"; readonly set: FundingLapse };

/**
 * More weeks of government at the numbers already in force.
 *
 * A patch of one field rather than a whole `Congress` write, which is the
 * distinction that makes it safe to emit from an enactment: a bill's packet
 * already carries a `congress` effect for the disposition, built from the
 * campaign as it stood before the fold began, and a second whole-object write
 * in the same packet would silently undo whichever of the two landed first.
 *
 * The date is computed here, against the turn the enactment actually folds in,
 * because that is the day the money starts running again.
 *
 * `onPriorYear` goes true. A stopgap continues last year's appropriation; it
 * does not enact this administration's, and a government living six weeks at a
 * time is still a government with no budget of its own. A stopgap can now pass
 * before the book it extends has run out, so it has to say so itself: left to
 * the weekly lapse check, a chain of stopgaps each passed ahead of its deadline
 * would never read as a government without a budget.
 */
export type AppropriationEffect =
  | { readonly kind: "appropriation"; readonly fundTurns: number }
  /** A fixed last turn rather than a span: the end of a fiscal year does not move with the week an act lands in. */
  | { readonly kind: "appropriation"; readonly throughTurn: number };

export function applyFundingLapse(state: Campaign, effect: FundingLapseEffect): Campaign {
  return { ...state, lapses: setInList(state.lapses, effect.set) };
}

export function applyAppropriation(state: Campaign, effect: AppropriationEffect): Campaign {
  const { appropriation } = state.congress;
  return {
    ...state,
    congress: {
      ...state.congress,
      appropriation: {
        ...appropriation,
        onPriorYear: true,
        priorYear: [],
        // Never shortens. A stopgap passed while the money has not yet run out
        // buys weeks the government already had, and taking them away would be
        // a continuing resolution that closed the government.
        throughTurn: Math.max(
          appropriation.throughTurn,
          "throughTurn" in effect ? effect.throughTurn : state.turn + effect.fundTurns,
        ),
      },
    },
  };
}

// --- The feed: what the player was told ------------------------------------

// The player-facing record of something that happened without them. Feed
// writes go through apply() like every other change, so what the player was
// told is state, replayable and diffable, rather than a UI side effect.
//
// The effect and its writer live here rather than in the mutation gate, beside
// the other durable-record writers: the gate stays one dispatch table, and a
// domain's rule lives with the domain. Not in state-feed.ts, although the item
// shape is there — that module is re-exported by the campaign-state barrel,
// which carries selectors, types and the diff and no mutation helper at all.
export type FeedEffect = {
  readonly kind: "feed";
  readonly items: readonly FeedItem[];
};

// The turn an item is filed under is written here and nowhere else. Producers
// used to stamp it themselves, and they disagreed: a phase writing `state.turn`
// filed its story a week before the ledger entry its own packet made, because
// the tick restamps the packet to the turn it closes and never looked inside
// it. A dispatch printed its date off the one and the Record off the other.
// Inside a fold the packet's turn is known — it is in the event id `apply()`
// stamps before any handler runs, the id its ledger entry carries — so every
// item takes that turn, whatever its producer guessed.
const EVENT_ID = /^ev-(\d+)-\d+$/;

function foldingTurn(): number | undefined {
  const eventId = currentEventId();
  if (eventId === undefined) return undefined;
  const match = EVENT_ID.exec(eventId);
  if (!match) throw new Error(`a feed item was filed inside event "${eventId}", which names no turn to file it under`);
  return Number(match[1]);
}

// The day, like the turn, is the filing's and not the producer's: an item is
// dated the day the campaign stood on when it was filed, whatever it carried.
//
// The append itself goes through the week's cap, so a producer cannot flood the
// wire and none has to know the rule. Stamping happens first, because the cap
// counts a week by the dates it is about to write.
export function applyFeed(state: Campaign, effect: FeedEffect): Campaign {
  const turn = foldingTurn();
  const date = state.calendar;
  // Filed at desks once the turn and day are stamped: the desk is chosen off the
  // item's own content and the week's load, and its stance is the corps's today.
  const items = fileAtDesks(state, effect.items.map((item) => ({ ...item, ...(turn === undefined ? {} : { turn }), date })));
  return appendWithinCap(state, items);
}
