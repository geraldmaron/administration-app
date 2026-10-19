import { settleScenarioAccounting } from "./scenario-accounting.js";
import { temporaryImportSuspension } from "./trade-effects.js";
import type { CivilianRisk } from "./strike-outcomes.js";
import { issueAction } from "./instrument-issued.js";
import type { TaskingRequest } from "./intelligence.js";
import type { ActionTiming } from "./action-timing.js";
import { worldDataset, type NationId, type PersonId, type RoleId } from "@admin/world";
import { signOrder, type OrderSubject } from "./orders.js";
import { takeLocaleAct } from "./locale-acts.js";
import { billTextAction, collectionAction, directiveAction, judicialNominationAction, localeProjection, orderRescissionAction, orderReviewAction, quotedPositionCost, reliefProjection, tariffAction, tariffLiftAction, transmissionAction } from "./conversation-report-actions.js";
import {
  selectRelationship,
  type ActionCounsel,
  type AlignmentVector,
  type Campaign,
  type Conflict,
  type ConflictSide,
  type MetricSet,
} from "./state.js";
import type { Effect, EffectPacket, RelationshipScalars } from "./effects.js";
import { resolveSpeaker } from "./conversation-speaker.js";
import { decisionProvenance, stampedDecision } from "./conversation-provenance.js";
import type { ConversationScript } from "./conversation-script.js";
import { conflictMoveEffects } from "./conversation-conflict.js";
import { roomCounselOnReply, type CabinetCounsel } from "./counsel.js";
import { projectPositionExposure, type PositionExposure } from "./position-exposure.js";
import { chargedQuote } from "./charged-quote.js";
import { assessPosition, realizePositionCost, type PositionAssessment } from "./position-assessment.js";
import type { RngStreams } from "./rng.js";
import type { CapacityCost, Consultee, InstrumentId, RungLevel } from "./instruments.js";
import type { Contest } from "./contest.js";
import type { ForceCostBasis } from "./force-costs.js";
import {
  selectConflictsInvolving,
  sideOf,
  type ConflictConsequence,
  type ConflictMove,
  type DeterrenceAssessment,
} from "./conflicts.js";
import { joinConflict, joinCost, projectJoin } from "./war-entry.js";
import {
  projectAction,
  type ActionProjection,
  type MetricCost,
  type ResolutionExtras,
  type Ripple,
  type RippleVisibility,
  type RiskBranch,
} from "./resolution.js";
import type { StagedResolution } from "./resolution-sequence.js";

// A conversation is how a decision reaches the player: a thread of beats, then
// a set of replies. It owns no arithmetic of its own — a reply that commits to
// something resolves through resolution.ts, so the cost, odds and ripples the
// player reads in the thread are the same figures that resolve the attempt.
// Every player-facing sentence here is authored content; nothing in this module
// composes prose.

export type ConversationTone = "conciliatory" | "firm" | "principled" | "evasive" | "coercive";

// Who speaks. A cabinet beat names a role, never a person: the campaign's own
// cabinet decides who holds it, so the right minister answers even after a
// reshuffle, and an empty chair reads as an empty chair.
export type SpeakerRef =
  | { readonly kind: "cabinet"; readonly role: RoleId }
  | { readonly kind: "player" }
  | { readonly kind: "counterpart" }
  | { readonly kind: "narrator" };

export type ScriptedBeat = {
  readonly speaker: SpeakerRef;
  readonly text: string;
};

/**
 * How far one spoken answer may move a relationship.
 *
 * A position is words, and words that could move trust as far as an act of
 * state would make the coercive ladder decorative: the cheapest rung of the
 * ladder moves a relationship by about this much, and it costs a roll, a
 * capability check and a public act to do it. A reply may reach the world; it
 * may not out-punch the instruments.
 */
export const POSITION_RELATIONSHIP_LIMIT = 0.15;

/**
 * The fields a spoken answer may move. Trade dependence and alignment are
 * absent on purpose: neither is a thing a government can say into being — one
 * is what the ports actually carry and the other is what the two states
 * actually want.
 */
export type PositionRelationshipDeltas = Partial<Pick<RelationshipScalars, "trust" | "tension" | "militaryThreat">>;

// What choosing a reply commits the player to. An instrument reply goes down
// the ladder through the resolver. A position is words — no dice — but words
// still cost standing at home, are remembered abroad, and can carry a bounded
// reach into the world they are about: the terms a government accepts at a
// table are the terms the front then stops on.
export type ReplyCommitment =
  | {
      readonly kind: "instrument";
      readonly instrument: InstrumentId;
      readonly rung: RungLevel;
      /**
       * Effects content already resolved for this answer (e.g. a domestic
       * signature routed at cast). Spliced onto the instrument packet after
       * resolveAction, the same way a position's `resolved` rides beside cost.
       */
      readonly resolved?: readonly Effect[];
      /**
       * The room answering the order at the moment it is given, before the
       * dice. An instrument's outcome already has a voice — the resolver's
       * narration, a drawn card, a staged sequence — but the order itself used
       * to land in silence, and a real room does not go quiet when the
       * president commits: somebody acknowledges, names the first friction,
       * puts a dissent on the record. Spoken before the aftermath, and written
       * blind to it — the line must be true whichever branch resolves.
       */
      readonly rejoinder?: ScriptedBeat;
    }
  | {
      readonly kind: "position";
      readonly importSuspensionDays?: number;
      readonly cost: MetricCost;
      readonly pull?: Partial<AlignmentVector>;
      readonly remembered: string; // the line the counterpart keeps in its history
      readonly relationship?: PositionRelationshipDeltas;
      // Only meaningful while the player and the counterpart are actually at
      // war; a move made after the front has ended is words with nothing left
      // to move.
      readonly conflictMove?: ConflictMove;
      readonly collection?: { readonly action: "close"; readonly tasking: string } |
        { readonly action: "task"; readonly request: TaskingRequest };
      readonly relief?: Extract<OrderSubject, { kind: "state" }>;
      /** Authored relief reply remains visible but disabled when its report has no lawful allocation. */
      readonly reliefRefusal?: string;
      readonly locale?: { readonly act: "relief" | "review"; readonly state: import("@admin/world").StateId; readonly cause: import("./condition-kinds.js").ConditionKind };
      readonly transmit?: string;
      readonly billText?: { readonly id: string; readonly act: string; readonly title: string;
        readonly introducedTurn: number; readonly stage: "markup" | "conference";
        readonly text?: import("./state.js").Bill["text"] } & (
        | { readonly action: "propose" }
        | { readonly action: "recommend"; readonly choice: import("./state.js").BillText }
      );
      readonly judicialNomination?: { readonly institution: import("./institutions.js").InstitutionId;
        readonly office: import("./institutions.js").OfficeId; readonly title: string; readonly vacancyOpenedDay: number;
        readonly nominee: import("@admin/world").PersonId; readonly nomineeName: string };
      readonly orderRescission?: { readonly proceedingId: string; readonly recordId: string;
        readonly orderId: string; readonly filedTurn: number; readonly stage: import("./state-judiciary.js").CourtStage;
        readonly orderName: string; readonly question: string };
      readonly orderReview?: { readonly proceedingId: string; readonly recordId: string;
        readonly orderId: string; readonly filedTurn: number; readonly orderName: string;
        readonly question: string; readonly ruleState: "unimplemented" | "operative";
        readonly choice: "accept" | "seek" | "seek-with-stay" };
      // A tariff on the counterpart's goods. `answering` and its source fields
      // are present together when the tariff answers a pinned retaliation, and
      // the answer is refused once that retaliation has ended.
      readonly tariff?: { readonly target: NationId; readonly sector: import("./trade-sectors.js").TradeSectorId; readonly rate: number; readonly answering?: string; readonly sourceSector?: string; readonly sourceRate?: number; readonly sourceTurn?: number };
      readonly tariffLift?: {
        readonly ours: { readonly measure: import("./trade.js").TradeMeasureId; readonly sector: string; readonly rate: number; readonly imposedTurn: number };
        readonly theirs?: { readonly measure: import("./trade.js").TradeMeasureId; readonly sector: string; readonly rate: number; readonly imposedTurn: number };
      };
      readonly directive?: { readonly matterId: string; readonly institution: import("./institutions.js").InstitutionId; readonly openedTurn: number; readonly matterSubject: string } & (
        | { readonly kind: "investigation" | "enforcement-posture"; readonly subject: string }
        | { readonly kind: "inspector-removal-notice"; readonly reason: string }
      );
      // What comes back once the answer is given. An instrument reply earns an
      // aftermath from the resolver — a branch, a drawn card — and a position
      // never had one, so nine answers in ten resolved into a narrator
      // restating the sentence the player had just picked. This is the beat
      // that answers instead of echoing. Authored, because a position has no
      // uncertain outcome for a generic pool to narrate.
      readonly rejoinder?: ScriptedBeat;
      /**
       * Effects the content layer has already resolved for this answer, applied
       * alongside the priced cost above.
       *
       * This is how a declared impact — what the decision did to people and to
       * money — reaches the board. The resolution itself belongs to content
       * (`@admin/content`'s impact model), because it reads bands the engine has
       * no vocabulary for and prices them against the dataset; the engine's part
       * is to apply what it is handed, which is the only direction the
       * dependency rule permits.
       *
       * Bounded by that same rule rather than by a type: content may only ever
       * produce effects it is already allowed to produce, and the impact model
       * emits opinion and treasury movement alone.
       */
      readonly resolved?: readonly Effect[];
      /**
       * What the answer commits of the government's own capacity to act next,
       * in the content layer's own words.
       *
       * The half of a declared impact that prices nothing, and so reached the
       * board through no effect at all: a president who committed forces or
       * burned a source was shown it before choosing and had no record of it
       * afterwards. Carried opaquely and written straight onto the packet, so
       * the vocabulary stays where it is authored.
       */
      readonly institutional?: readonly string[];
    }
  // Entering a war the counterpart is already fighting. "beside" joins their
  // side, "against" enters opposite them; the resolver reads the counterpart's
  // own side off the board rather than trusting the reply to name it, so a
  // scenario cannot enlist the player onto a side its cast is not on.
  | {
      readonly kind: "join";
      readonly side: "beside" | "against";
      // Same commit-time voice an instrument gets: entering somebody else's
      // war is the loudest sentence a room can hear, and it should not be the
      // only one answered by a narrator alone.
      readonly rejoinder?: ScriptedBeat;
    };

export type ReplyOption = {
  readonly id: string;
  readonly tone: ConversationTone;
  readonly text: string;
  readonly commitment: ReplyCommitment;
};

// The script's shape lives beside this module, which is at its size budget.
export type { ConversationScript } from "./conversation-script.js";

export type ResolvedSpeaker =
  | { readonly kind: "official"; readonly role: RoleId; readonly person: PersonId; readonly name: string }
  | { readonly kind: "player"; readonly name: string; readonly title: string }
  | { readonly kind: "vacant"; readonly role: RoleId }
  // `person` is the same living national `/nation`, `/ops` and `/person`
  // already name as the government's head of government; absent only for a
  // nation this campaign seated nobody eligible in.
  | { readonly kind: "counterpart"; readonly nation: NationId; readonly name: string; readonly person?: PersonId }
  | { readonly kind: "narrator" };

export type ConversationBeat = {
  readonly speaker: ResolvedSpeaker;
  readonly text: string;
};

// One shape whether or not there is anything to roll, so a surface renders
// every reply's trade-off through the same path and cannot quietly omit one.
// `successChance` is absent only for a reply with no attempt in it.
//
// The optional half below is the resolver's full projection reaching the room
// where the decision is actually taken. It used to stop at the nine fields a
// scenario reply had always carried, so a president ordering a strike from the
// meeting room was shown a price, one worst-case sentence and three countries
// that would notice — while the identical order taken from Operations also told
// them both governments hold arsenals, that congressional leadership has to be
// informed first, and that the force would be locked out of the top of the
// ladder for a month.
export type ReplyProjection = {
  readonly timing?: ActionTiming;
  readonly civilianRisk?: CivilianRisk;
  readonly option: ReplyOption;
  readonly available: boolean;
  readonly missingCapability?: string;
  /**
   * What the current board will actually be charged, not the authored
   * magnitude. `apply()` floors budget authority at zero and clamps every other
   * metric into 0..1, so a debit larger than the balance is not a debit — it is
   * the balance, and a quote that stated the larger figure advertised a price
   * the simulation could not charge.
   */
  readonly cost: MetricCost;
  /**
   * The metrics whose authored debit was larger than what is left to spend.
   * The quote above is already the smaller, true figure; this is what lets the
   * surface say "there is none left" rather than silently print a magnitude
   * nobody recognizes as clamped.
   */
  readonly exhausted?: readonly (keyof MetricSet)[];
  readonly successChance?: number;
  readonly successExposureChance?: number;
  /** The matchup the odds were read off. Absent on a reply with no attempt in it. */
  readonly contest?: Contest;
  readonly risks: readonly RiskBranch[];
  /**
   * What a spoken answer commits the administration to that no roll decides.
   * Present only on a position, which is the reply kind that has no risk branch
   * to name and, until this existed, nothing at all under "if it goes wrong".
   */
  readonly exposure?: readonly PositionExposure[];
  /**
   * The price split by who decides it: what the President spends, exact, and
   * what the answer is assessed to do to the country, as bands the realized
   * figure will be measured against on the Record. Present only on a position.
   */
  readonly assessment?: PositionAssessment;
  readonly ripples: readonly Ripple[];
  readonly rippleVisibility: RippleVisibility;
  readonly deterrence?: DeterrenceAssessment;
  readonly conflict?: ConflictConsequence;
  readonly consultation?: readonly Consultee[];
  readonly capacity?: CapacityCost;
  /** How a military rung's money was reached, as the instrument projection stated it. */
  readonly costBasis?: ForceCostBasis;
};

// The exposure model itself lives beside this one: a position's consequences
// are prose, and nothing in this module composes prose.
export type { PositionExposure };

export type ConversationThread = {
  readonly script: ConversationScript;
  readonly beats: readonly ConversationBeat[];
  readonly replies: readonly ReplyProjection[];
};

// --- The trade-off gate ---

function costedFields(cost: MetricCost): number {
  return Object.values(cost).filter((value) => value !== undefined && value !== 0).length;
}

// A decision with nothing on the other side of it is a content defect, so it
// fails here rather than reaching a player as a free choice. Loud, like
// apply()'s narration gate: a surface can render any thread this returns.
export function assertPlayable(script: ConversationScript): void {
  if (script.options.length < 2) {
    throw new Error(`conversation ${script.id} offers fewer than two replies: there is no decision in it`);
  }
  if (new Set(script.options.map((o) => o.tone)).size < 2) {
    throw new Error(`conversation ${script.id} offers only one tone: its replies are not a choice`);
  }
  for (const option of script.options) {
    if (option.commitment.kind !== "position") continue;
    // A resolved impact is a cost — it is just not one the author typed into
    // the four metric fields. Content that declares what a decision did to
    // people and to money resolves it into effects before the script gets
    // here, and reading only `cost` refused exactly those replies: a scenario
    // that spent an emergency appropriation and killed forty people was thrown
    // out as a free choice while one that moved standing by a hundredth passed.
    if (costedFields(option.commitment.cost) > 0 || (option.commitment.resolved ?? []).length > 0 ||
      option.commitment.collection || option.commitment.relief || option.commitment.locale || option.commitment.transmit || option.commitment.tariff || option.commitment.tariffLift || option.commitment.directive ||
      option.commitment.billText || option.commitment.judicialNomination || option.commitment.orderRescission || option.commitment.orderReview) continue;
    throw new Error(`conversation ${script.id} reply ${option.id} costs nothing: no costless decisions`);
  }
}

// --- Speaker truth ---

export { resolveSpeaker } from "./conversation-speaker.js";

// --- What the board can actually be charged ---

/**
 * The board a price is charged against.
 *
 * Readiness is read off the force rather than off the panel: a readiness effect
 * is routed onto the nation's own stat and mirrored back, so the stat is the
 * balance and the metric is a copy of it.
 */

// --- Projection ---

function instrumentProjection(
  campaign: Campaign,
  script: ConversationScript,
  option: ReplyOption,
  streams: RngStreams,
): ReplyProjection {
  if (option.commitment.kind !== "instrument") throw new Error("not an instrument commitment");
  const projected = projectAction(
    campaign,
    {
      actor: campaign.founding.nation,
      target: script.counterpart,
      instrument: option.commitment.instrument,
      rung: option.commitment.rung,
    },
    streams,
  );
  if (!projected.ok) {
    return {
      option,
      available: false,
      missingCapability: projected.missingCapability,
      cost: {},
      risks: [],
      ripples: [],
      rippleVisibility: "always",
    };
  }
  return fromActionProjection(campaign, option, projected.projection);
}

function fromActionProjection(campaign: Campaign, option: ReplyOption, projection: ActionProjection): ReplyProjection {
  const quote = chargedQuote(projection.cost, campaign);
  return {
    option,
    available: true,
    cost: quote.cost,
    ...(quote.exhausted.length > 0 ? { exhausted: quote.exhausted } : {}),
    successChance: projection.successChance,
    ...(projection.successExposureChance !== undefined ? { successExposureChance: projection.successExposureChance } : {}),
    timing: projection.timing,
    civilianRisk: projection.civilianRisk,
    contest: projection.contest,
    risks: projection.risks,
    ripples: projection.ripples,
    rippleVisibility: projection.rippleVisibility,
    ...(projection.deterrence ? { deterrence: projection.deterrence } : {}),
    ...(projection.conflict ? { conflict: projection.conflict } : {}),
    consultation: projection.consultation,
    ...(projection.capacity ? { capacity: projection.capacity } : {}),
    ...(projection.costBasis ? { costBasis: projection.costBasis } : {}),
  };
}

/**
 * The room's opinion written onto the packet that carries the decision.
 *
 * Every voice the player was shown, not only the chair the subject routed to.
 * The screen argues with up to four ministers and the record used to keep one
 * of them, so a Secretary of Defense who filed a warning against the president's
 * course had no evidence of having done so, and nothing that wanted to model a
 * grievance, a resignation or a leak over a specific overruling had anything to
 * read. The primary keeps its own fields because the odds it was weighing are
 * the load-bearing half of a forecast; the rest of the room rides beside it.
 */
function stampCounsel(
  room: readonly CabinetCounsel[],
  packet: EffectPacket,
  successChance: number | undefined,
): EffectPacket {
  const primary = room[0];
  if (primary?.kind !== "counsel") return packet;
  const counsel: ActionCounsel = {
    role: primary.role,
    person: primary.person,
    stance: primary.stance,
    ...(successChance === undefined ? {} : { successChance }),
    room: room.flatMap((voice) =>
      voice.kind === "counsel" ? [{ role: voice.role, person: voice.person, stance: voice.stance }] : [],
    ),
  };
  return { ...packet, counsel };
}

// A position is not rolled for, so it has no odds to have been read against —
// the record keeps the stance alone rather than a success chance invented for
// the sake of a uniform shape.
function withCounsel(
  campaign: Campaign,
  script: ConversationScript,
  option: ReplyOption,
  packet: EffectPacket,
  streams: RngStreams,
): EffectPacket {
  const projection = projectReply(campaign, script, option, streams);
  return stampCounsel(roomCounselOnReply(campaign, script, projection), packet, projection.successChance);
}

export function projectReply(
  campaign: Campaign,
  script: ConversationScript,
  option: ReplyOption,
  streams: RngStreams,
): ReplyProjection {
  if (option.commitment.kind === "instrument") return instrumentProjection(campaign, script, option, streams);
  if (option.commitment.kind === "join") {
    // A war the counterpart is not in cannot be joined, and the room is told
    // that before the player picks rather than after.
    const entry = joinEntry(campaign, script, option.commitment.side);
    const quote = chargedQuote(entry ? joinCost(campaign, entry.conflict, entry.side) : {}, campaign);
    // The same War Powers refusal and nuclear warning the Operations room
    // reads, so a reply cannot offer a door into a war the office's authority
    // does not reach, or into one against an arsenal without saying so.
    const projected = entry ? projectJoin(campaign, entry.conflict.id, entry.side) : undefined;
    return {
      option,
      available: entry !== undefined && projected?.refusal === undefined,
      ...(projected?.refusal ? { missingCapability: projected.refusal } : {}),
      ...(projected?.deterrence.defenderNuclear ? { deterrence: projected.deterrence } : {}),
      cost: quote.cost,
      ...(quote.exhausted.length > 0 ? { exhausted: quote.exhausted } : {}),
      risks: [],
      ripples: [],
      rippleVisibility: "always",
    };
  }
  const collection = collectionAction(campaign, option.commitment.collection);
  const relief = reliefProjection(campaign, option.commitment.relief);
  const locale = localeProjection(campaign, option.commitment.locale);
  const transmission = transmissionAction(campaign, option.commitment.transmit);
  const tariff = tariffAction(campaign, option.commitment.tariff);
  const tariffLift = tariffLiftAction(campaign, option.commitment.tariffLift);
  const directive = directiveAction(campaign, option.commitment.directive);
  const billText = billTextAction(campaign, option.commitment.billText);
  const judicialNomination = judicialNominationAction(campaign, option.commitment.judicialNomination);
  const orderRescission = orderRescissionAction(campaign, option.commitment.orderRescission);
  const orderReview = orderReviewAction(campaign, option.commitment.orderReview);
  const quote = chargedQuote(quotedPositionCost(campaign, option.commitment), campaign);
  const exposure = [...projectPositionExposure(campaign, script, option.commitment), ...(option.commitment.importSuspensionDays ? [{ id: "timed-import-suspension", description: `Incoming goods are suspended for ${option.commitment.importSuspensionDays} days from signature. Exports remain legally open. The suspension expires automatically; other trade restrictions still apply.` }] : [])];
  return {
    option,
    available: !option.commitment.reliefRefusal && collection.ok && relief.ok && locale.ok && transmission.ok && tariff.ok && tariffLift.ok && directive.ok && billText.ok && judicialNomination.ok && orderRescission.ok && orderReview.ok,
    ...(option.commitment.reliefRefusal ? { missingCapability: option.commitment.reliefRefusal } : !collection.ok ? { missingCapability: collection.reason } : !relief.ok ? { missingCapability: relief.reason } : !locale.ok ? { missingCapability: locale.reason } : !transmission.ok ? { missingCapability: transmission.reason } : !tariff.ok ? { missingCapability: tariff.reason } : !tariffLift.ok ? { missingCapability: tariffLift.reason } : !directive.ok ? { missingCapability: directive.reason } : !billText.ok ? { missingCapability: billText.reason } : !judicialNomination.ok ? { missingCapability: judicialNomination.reason } : !orderRescission.ok ? { missingCapability: orderRescission.reason } : !orderReview.ok ? { missingCapability: orderReview.reason } : {}),
    cost: quote.cost,
    ...(quote.exhausted.length > 0 ? { exhausted: quote.exhausted } : {}),
    assessment: assessPosition(campaign, quote.cost, { briefingDoubted: script.briefingDoubted === true }),
    risks: [],
    ...(exposure.length > 0 ? { exposure } : {}),
    ripples: [],
    rippleVisibility: "always",
  };
}

/**
 * Which war the player would be entering, and on which side of it.
 *
 * The reply names its side relative to the nation the scenario cast — "beside"
 * them or "against" them — and the side of the actual conflict is read off the
 * board here. That way a scenario cannot enlist the player onto a side its own
 * cast is not on: if the board has moved since the scenario was written, the
 * reply is simply unavailable rather than quietly wrong.
 */
function joinEntry(
  campaign: Campaign,
  script: ConversationScript,
  side: "beside" | "against",
): { conflict: Conflict; side: ConflictSide } | undefined {
  const player = campaign.founding.nation;
  for (const conflict of selectConflictsInvolving(campaign, script.counterpart)) {
    if (conflict.status !== "active") continue;
    if (sideOf(conflict, player) !== undefined) continue;
    const theirs = sideOf(conflict, script.counterpart);
    if (theirs === undefined) continue;
    const ours: ConflictSide = side === "beside" ? theirs : theirs === "aggressor" ? "defender" : "aggressor";
    return { conflict, side: ours };
  }
  return undefined;
}

export function openConversation(campaign: Campaign, script: ConversationScript, streams: RngStreams): ConversationThread {
  assertPlayable(script);
  return {
    script,
    beats: script.opening.map((beat) => ({ speaker: resolveSpeaker(campaign, script, beat.speaker), text: beat.text })),
    replies: script.options.map((option) => projectReply(campaign, script, option, streams)),
  };
}

// --- Commitment ---

export type ReplyOutcome = {
  readonly packet: EffectPacket;
  // The consequence, spoken in the thread rather than on a results screen.
  readonly beats: readonly ConversationBeat[];
  // Present only on an instrument reply the resolver staged. The surface must
  // not re-run selection to recover the valence and risk branch the draw was
  // keyed on, so the key rides out with the outcome; a room that ignores it
  // plays the unstaged path unchanged.
  readonly staged?: StagedResolution;
};

export type ReplyResult =
  | { readonly ok: false; readonly missingCapability: string }
  | ({ readonly ok: true } & ReplyOutcome);

function boundedDeltas(deltas: PositionRelationshipDeltas): PositionRelationshipDeltas {
  const clamp = (value: number) => Math.max(-POSITION_RELATIONSHIP_LIMIT, Math.min(POSITION_RELATIONSHIP_LIMIT, value));
  return Object.fromEntries(
    Object.entries(deltas).map(([field, value]) => [field, clamp(value)]),
  ) as PositionRelationshipDeltas;
}

/**
 * What the answer did to the two governments' reading of each other.
 *
 * Both directions move, because both edges are what the board reads back: the
 * player's own edge is what a scenario's `relationship` gate and every foreign
 * screen consult, and the counterpart's edge is what decides whether it joins
 * someone else's war against you. Moving one and not the other would leave the
 * fiction agreed at the table and half the board still disagreeing with it.
 */
function relationshipEffects(campaign: Campaign, script: ConversationScript, deltas: PositionRelationshipDeltas): Effect[] {
  const bounded = boundedDeltas(deltas);
  const pairs = [
    [campaign.founding.nation, script.counterpart],
    [script.counterpart, campaign.founding.nation],
  ] as const;
  return pairs
    .filter(([from, to]) => from !== to && selectRelationship(campaign, from, to) !== undefined)
    .map(([from, to]) => ({ kind: "relationship" as const, from, to, deltas: bounded }));
}

function positionPacket(campaign: Campaign, script: ConversationScript, option: ReplyOption, collectionEffects: readonly Effect[] = []): EffectPacket {
  if (option.commitment.kind !== "position") throw new Error("not a position commitment");
  const { cost, pull, remembered, relationship, conflictMove, resolved, institutional } = option.commitment;
  const heldToward = selectRelationship(campaign, script.counterpart, campaign.founding.nation);
  const effects: readonly Effect[] = [
    { kind: "metric", deltas: realizePositionCost(campaign, cost) },
    ...(resolved ?? []),
    ...collectionEffects,
    ...(option.commitment.importSuspensionDays ? temporaryImportSuspension(campaign, script.counterpart, option.commitment.importSuspensionDays) : []),
    ...(pull ? [{ kind: "alignment" as const, pull }] : []),
    ...(relationship ? relationshipEffects(campaign, script, relationship) : []),
    ...(conflictMove ? conflictMoveEffects(campaign, script, conflictMove, remembered) : []),
    // The counterpart is the one who remembers what was said to it.
    ...(heldToward
      ? [
          {
            kind: "relationship" as const,
            from: script.counterpart,
            to: campaign.founding.nation,
            addHistory: { turn: campaign.turn, kind: "position", description: remembered },
          },
        ]
      : []),
  ];
  return {
    source: "conversation",
    actor: "player",
    ...(script.subjects?.length ? { subjects: script.subjects } : {}),
    turn: campaign.turn,
    provenance: decisionProvenance(campaign,
      option.commitment.directive?.kind === "inspector-removal-notice" ? { ...script, visibility: "public" } : script,
      effects),
    ...(institutional && institutional.length > 0 ? { institutional } : {}),
    // The same assessment the card read, frozen onto the packet so the Record
    // can put what was assessed beside what was measured.
    assessment: assessPosition(campaign, chargedQuote(quotedPositionCost(campaign, option.commitment), campaign).cost, {
      briefingDoubted: script.briefingDoubted === true,
    }),
    narration: { summary: remembered },
    effects,
  };
}

export function commitReply(
  campaign: Campaign,
  script: ConversationScript,
  option: ReplyOption,
  streams: RngStreams,
  extras?: ResolutionExtras,
): ReplyResult {
  const spoken: ConversationBeat = { speaker: resolveSpeaker(campaign, script, { kind: "player" }), text: option.text };

  if (option.commitment.kind === "position") {
    if (option.commitment.reliefRefusal) return { ok: false, missingCapability: option.commitment.reliefRefusal };
    const collection = collectionAction(campaign, option.commitment.collection);
    if (!collection.ok) return { ok: false, missingCapability: collection.reason };
    const relief = reliefProjection(campaign, option.commitment.relief);
    if (!relief.ok) return { ok: false, missingCapability: relief.reason };
    const locale = localeProjection(campaign, option.commitment.locale);
    if (!locale.ok) return { ok: false, missingCapability: locale.reason };
    const transmission = transmissionAction(campaign, option.commitment.transmit);
    if (!transmission.ok) return { ok: false, missingCapability: transmission.reason };
    const tariff = tariffAction(campaign, option.commitment.tariff);
    if (!tariff.ok) return { ok: false, missingCapability: tariff.reason };
    const tariffLift = tariffLiftAction(campaign, option.commitment.tariffLift);
    if (!tariffLift.ok) return { ok: false, missingCapability: tariffLift.reason };
    const directive = directiveAction(campaign, option.commitment.directive);
    if (!directive.ok) return { ok: false, missingCapability: directive.reason };
    const billText = billTextAction(campaign, option.commitment.billText);
    if (!billText.ok) return { ok: false, missingCapability: billText.reason };
    const judicialNomination = judicialNominationAction(campaign, option.commitment.judicialNomination);
    if (!judicialNomination.ok) return { ok: false, missingCapability: judicialNomination.reason };
    const orderRescission = orderRescissionAction(campaign, option.commitment.orderRescission);
    if (!orderRescission.ok) return { ok: false, missingCapability: orderRescission.reason };
    const orderReview = orderReviewAction(campaign, option.commitment.orderReview);
    if (!orderReview.ok) return { ok: false, missingCapability: orderReview.reason };
    const charter = option.commitment.relief ? worldDataset.charters.find((entry) => entry.id === campaign.founding.charter) : undefined;
    const signed = option.commitment.relief && charter
      ? signOrder(campaign, charter, "order-relief-program", streams, option.commitment.relief) : undefined;
    if (signed && !signed.ok) return { ok: false, missingCapability: signed.reason };
    const acted = option.commitment.locale
      ? takeLocaleAct(campaign, option.commitment.locale.state, option.commitment.locale.act, option.commitment.locale.cause) : undefined;
    if (acted && !acted.ok) return { ok: false, missingCapability: acted.reason };
    // The room argues about a position exactly as it argues about an
    // instrument, and the screen already prints that opinion beside the
    // option, so a position writes counsel onto the record the same way an
    // instrument does. Without it, nine replies in ten are argued over and then
    // forgotten, and a chair overruled on one of them has no way to hold it
    // against the president. Recorded from the same projection the screen read,
    // so what a player was shown and what the record keeps cannot come apart.
    const packet = withCounsel(campaign, script, option, positionPacket(campaign, script, option,
      [...collection.effects, ...transmission.effects, ...tariff.effects, ...tariffLift.effects, ...directive.effects, ...billText.effects,
        ...judicialNomination.effects, ...orderRescission.effects, ...orderReview.effects, ...(signed?.ok ? signed.packet.effects : []), ...(acted?.ok ? acted.packet.effects : [])]), streams);
    // The narrator states what was decided; the rejoinder, where one is
    // written, is somebody answering it. Order matters: the fact lands first,
    // and the reaction is a reaction to it.
    const rejoinder = option.commitment.rejoinder;
    return {
      ok: true,
      packet: settleScenarioAccounting(campaign, packet),
      beats: [
        spoken,
        { speaker: { kind: "narrator" }, text: packet.narration.summary },
        ...(signed?.ok ? [{ speaker: { kind: "narrator" } as const, text: signed.packet.narration.summary }] : []),
        ...(acted?.ok ? [{ speaker: { kind: "narrator" } as const, text: acted.packet.narration.summary }] : []),
        ...(transmission.summary ? [{ speaker: { kind: "narrator" } as const, text: transmission.summary }] : []),
        ...(tariff.summary ? [{ speaker: { kind: "narrator" } as const, text: tariff.summary }] : []),
        ...(tariffLift.summary ? [{ speaker: { kind: "narrator" } as const, text: tariffLift.summary }] : []),
        ...(directive.summary ? [{ speaker: { kind: "narrator" } as const, text: directive.summary }] : []),
        ...(billText.summary ? [{ speaker: { kind: "narrator" } as const, text: billText.summary }] : []),
        ...(judicialNomination.summary ? [{ speaker: { kind: "narrator" } as const, text: judicialNomination.summary }] : []),
        ...(orderRescission.summary ? [{ speaker: { kind: "narrator" } as const, text: orderRescission.summary }] : []),
        ...(orderReview.summary ? [{ speaker: { kind: "narrator" } as const, text: orderReview.summary }] : []),
        ...(rejoinder ? [{ speaker: resolveSpeaker(campaign, script, rejoinder.speaker), text: rejoinder.text }] : []),
      ],
    };
  }

  if (option.commitment.kind === "join") {
    const entry = joinEntry(campaign, script, option.commitment.side);
    if (!entry) return { ok: false, missingCapability: "a war that nation is actually fighting" };
    const joined = joinConflict(campaign, campaign.founding.nation, entry.conflict.id, entry.side);
    if (!joined.ok) return { ok: false, missingCapability: joined.missingCapability ?? joined.reason };
    // Entering somebody else's war is the loudest decision in the game and was
    // the one commit path that recorded neither the room that argued about it
    // nor where it sits in the graph.
    const joinPacket = withCounsel(campaign, script, option, stampedDecision(campaign, script, joined.packet), streams);
    // Same order a position keeps: the fact lands first, the reaction reacts.
    const joinRejoinder = option.commitment.rejoinder;
    return {
      ok: true,
      packet: joinPacket,
      beats: [
        spoken,
        { speaker: { kind: "narrator" }, text: joinPacket.narration.summary },
        ...(joinRejoinder
          ? [{ speaker: resolveSpeaker(campaign, script, joinRejoinder.speaker), text: joinRejoinder.text }]
          : []),
      ],
    };
  }

  const resolved = issueAction(
    campaign,
    {
      actor: campaign.founding.nation,
      target: script.counterpart,
      instrument: option.commitment.instrument,
      rung: option.commitment.rung,
    },
    streams,
    "conversation",
    // The register the player answered in is a fact only the conversation
    // knows, so it is supplied here rather than asked of every caller — an
    // explicit context from a caller still wins.
    extras ? { ...extras, context: { tone: option.tone, ...extras.context } } : undefined,
  );
  if (!resolved.ok) return { ok: false, missingCapability: resolved.missingCapability };

  // The room's opinion is recorded at the moment it was held, against the odds
  // it was actually looking at. Reconstructing it later from the ledger can only
  // recover the half of counsel's scoring that a save keeps — the minister's
  // instincts — and silently loses the half that made a cautious chair flinch.
  const stamped = stampCounsel(
    roomCounselOnReply(campaign, script, fromActionProjection(campaign, option, resolved.projection)),
    stampedDecision(campaign, script, resolved.packet),
    resolved.projection.successChance,
  );
  // Content-compiled effects (domestic signature, etc.) ride beside the
  // instrument packet the same way a position's `resolved` rides beside cost.
  const compiled = option.commitment.resolved ?? [];
  const packet =
    compiled.length === 0 ? stamped : { ...stamped, effects: [...stamped.effects, ...compiled] };

  // The resolver's narration already says what the attempt was and how it went,
  // failure branch included, so a second beat restating the risk would be the
  // same sentence twice. An authored aftermath arrives as several lines and is
  // spoken as several beats, in the thread, where the decision was made.
  const aftermath = resolved.consequence?.beats ?? [packet.narration.summary];
  // The rejoinder speaks between the order and the world's answer: it is the
  // room at the moment of commitment, written blind to the roll, so it cannot
  // come after a narration that already says how the attempt went.
  const rejoinder = option.commitment.rejoinder;
  return {
    ok: true,
    packet,
    beats: [
      spoken,
      ...(rejoinder ? [{ speaker: resolveSpeaker(campaign, script, rejoinder.speaker), text: rejoinder.text }] : []),
      ...aftermath.map((text) => ({ speaker: { kind: "narrator" } as const, text })),
    ],
    ...(resolved.staged ? { staged: resolved.staged } : {}),
  };
}
