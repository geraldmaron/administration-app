import type { SalienceMemory } from "./opinion.js";
import type { ImpactEventEffect } from "./impact-event.js";
import type { BorderIncidentEffect } from "./border-incidents.js";
import type { BlockadeEffect } from "./blockades.js";
import type { NpcTempoEffect } from "./npc-tempo.js";
import type { HullLossEffect } from "./hull-losses.js";
import type { PolicyStatPath } from "./policy-stats.js";
import type { MilitaryConstructionProjectEffect } from "./military-construction.js";
import type { OffshoreLeaseSaleEffect } from "./offshore-leasing.js";
import type { CleanPowerPurchaseEffect } from "./clean-power-purchasing.js";
import type { BlockedAssetEffect } from "./blocked-assets.js";
import type { PositionAssessment } from "./position-assessment.js";
import type { CityId, Grudge, NationId, PersonId, RelationshipEvent, RoleId, SectorId, StateId, TreatyId } from "@admin/world";
import type { OversightEffect } from "./oversight.js";
import type { FeedEffect } from "./record-effects.js";
import type {
  AppropriationEffect,
  CapRaiseEffect,
  CommitmentEffect,
  ConditionEffect,
  EmergencyEffect,
  ExternalEmergencyEffect,
  FundingLapseEffect,
  OrderFramingEffect,
  PendingRuleEffect,
  CourtCaseEffect,
  CourtProceedingEffect,
  SolicitorGeneralEffect,
  PursuitEffect,
} from "./record-effects.js";
import type { CaseEffect } from "./case-types.js";
import type { TieEffect } from "./ties.js";
export type { TieEffect };
export type { CaseEffect };
import type { DocketEntry } from "./state-week.js";
import type {
  ActionCommitment,
  ActionCounsel,
  AlignmentVector,
  Bill,
  CabinetAgendaState,
  Conflict,
  Congress,
  EffectActor,
  ExecutiveOrderRecord,
  FlagId,
  GameDate,
  IssuedAct,
  MetricSet,
  NationRuntime,
  OperatorRuntime,
  PersonRuntime,
  PressCorps,
  RemovalArc,
  TermClock,
  TreatyRecord,
} from "./state.js";
import type { CycleEffect } from "./business-cycle.js";
import type { MacroState } from "./macro-state.js";
import type { NationBooks } from "./national-books.js";
import type { DebtLimitState } from "./debt-limit.js";
import type { OpinionDriver } from "./opinion.js";
import type { StateGeographyOps } from "./state-effects.js";
import type { CohortEffect } from "./demos.js";
import type { TradeEffect } from "./trade-effects.js";
import type { InstitutionEffect, NominationEffect } from "./institution-effects.js";
import type { GodModeEffect } from "./god-effects.js";
import type { RulesEffect } from "./rules-effects.js";
import type { ScenarioFamilyEffect } from "./scenario-family-effects.js";
import type {
  AssessmentEffect,
  CommandEffect,
  FindingEffect,
  IntelligenceEffect,
  WarPowersEffect,
} from "./security-effects.js";
import type { CausalProvenance } from "./causality.js";
import type { PledgeEffect } from "./pledges.js";
import type { ForecastEffect } from "./projection-record.js";
import type { ExternalShockEffect } from "./external-shocks.js";
import type { LeadershipEffect, MarketsEffect, MembershipEffect, IndictmentEffect, MunitionsEffect, RegimeEffect } from "./world-effects.js";

// Every shape a change to the campaign can take, and the envelope one arrives
// in. Types only: `effects.ts` is the one write path and holds the handlers,
// and it has to stay inside the size budget as the vocabulary grows.

export type EffectSource = "action" | "conversation" | "simulate" | "operator" | "godmode";

export type NarrationRef = {
  readonly summary: string; // how this change is explained to the player, in-fiction
};

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

// Signed movement, added to whatever the metric currently holds. Several
// effects in one packet touching the same metric sum rather than overwrite,
// and every 0..1 metric is clamped on the way in.
//
// Approval is not among the keys. The headline is settled from the public's
// six judgments at the end of every packet, so a delta on it would be
// recomputed away; refusing the key in the type turns a silent no-op into a
// compile error at the site that tried to write it. `never` rather than a bare
// Omit, because a widened `Partial<MetricSet>` is still assignable to an Omit;
// it is not assignable to a key that admits no value.
export type DeltaMetricKey = Exclude<keyof MetricSet, "approval">;
export type MetricDeltas = Partial<Record<DeltaMetricKey, number>> & { readonly approval?: never };

export type MetricEffect = {
  readonly kind: "metric";
  readonly deltas: MetricDeltas;
};

export type RelationshipScalars = {
  trust: number;
  alignment: number;
  tension: number;
  tradeDependence: number;
  militaryThreat: number;
};

export type RelationshipEffect = {
  readonly kind: "relationship";
  readonly from: NationId;
  readonly to: NationId;
  // Signed movement, added to the live value and clamped to the scalar's
  // schema range. For the rare change that is genuinely absolute — an embargo
  // taking trade dependence to zero — use `set`.
  readonly deltas?: Partial<RelationshipScalars>;
  readonly set?: Partial<RelationshipScalars>;
  readonly addTreaty?: TreatyId;
  readonly addGrudge?: Grudge;
  // Full replacement of the grudge list — used by grudge decay, which
  // recomputes every grudge's weight rather than appending one.
  readonly replaceGrudges?: readonly Grudge[];
  readonly addHistory?: RelationshipEvent;
};

// Absolute values, not movement — every caller computes the new figure against
// live nation stats. Named `set` so the contract is legible at the call site.
export type NationStatEffect = {
  readonly kind: "nationStat";
  readonly nation: NationId;
  readonly setStats?: DeepPartial<NationRuntime["stats"]>;
  readonly setTraits?: DeepPartial<NationRuntime["traits"]>;
  /** A relative policy movement in the stat's own units; absent means an absolute set/reset. */
  readonly requestedDelta?: { readonly path: PolicyStatPath; readonly amount: number; readonly ownerId?: string };
  /** Internal remedy rewrite; its lineage weight has already been changed. */
  readonly skipLineage?: true;
};

/** A reported death toll, charged against the live population when its packet lands. */
export type PopulationTollEffect = {
  readonly kind: "populationToll";
  readonly nation: NationId;
  readonly deaths: number;
  readonly place?: StateId;
};

export type CityEffect = {
  readonly kind: "city";
  readonly city: CityId;
  readonly deltas?: {
    readonly employment?: number;
    readonly taxBase?: number;
    readonly demShare?: number;
    readonly adminLean?: number;
  };
  readonly set?: {
    readonly taxHolidayTurns?: number;
  };
  readonly reason: string;
};

export type StateEffect = {
  readonly kind: "state";
  readonly state: StateId;
  readonly deltas?: { readonly lean?: number; readonly population?: number };
  readonly reason: string;
} & StateGeographyOps;

export type SectorEffect = {
  readonly kind: "sector";
  readonly nation: NationId;
  readonly sector: SectorId;
  readonly deltas?: {
    readonly employment?: number;
    readonly laborPressure?: number;
    readonly mix?: number;
  };
  readonly reason: string;
};

export type FlagEffect = {
  readonly kind: "flag";
  readonly set?: readonly FlagId[];
  readonly clear?: readonly FlagId[];
};

/**
 * The President putting a matter off, or taking one back up.
 *
 * A deferral is a decision, so it travels the same road every other decision
 * does. It could have been a field the app wrote directly — it is one record
 * on one object — and that is exactly why it is an effect instead: the moment
 * one kind of state change is allowed to skip `apply()`, the ledger stops being
 * the account of what the administration did.
 */
export type AttentionEffect = {
  readonly kind: "attention";
  /** Matter id to the date it may interrupt again. */
  readonly defer?: Readonly<Record<string, GameDate>>;
  /** Matter ids the President has taken back up before their date. */
  readonly resume?: readonly string[];
};

export type IssuedActEffect = {
  readonly kind: "issuedAct";
  readonly set: IssuedAct;
};

export type PersonEffect = {
  readonly kind: "person";
  readonly person: PersonId;
  /** Register a fictional lower-court judge when a panel is actually drawn. */
  readonly create?: PersonRuntime;
  readonly changes: Partial<Pick<PersonRuntime, "alive" | "currentRole" | "affiliation" | "loyaltyAtAppointment" | "state" | "judicialRetired" | "issuePressure">>;
  /**
   * A signed move in the person's own loyalty, folded into `base.loyalty`
   * rather than kept beside it. Every rule that prices loyalty — the weekly
   * consequences draw, counsel's opinions, an order's standing — reads
   * `base.loyalty`, and a shift stored alongside would make a minister read
   * one way to the roster and another to the rule that removes them.
   */
  readonly loyaltyShift?: number;
  /**
   * A signed move in the person's own competence, folded into `base.competence`
   * and clamped there, for the reason loyalty's is: every rule that reads
   * competence reads the base.
   */
  readonly competenceShift?: number;
};

// Who holds a chair. `person: undefined` empties it. This is the *seat*, which
// is a different fact from the *person* — `PersonEffect` moves someone's own
// `currentRole`, and both have to move together for the two to agree. A chair
// is emptied by omitting the role from `player.cabinet` rather than by mapping
// it to undefined: an explicit undefined does not survive a JSON save
// round-trip, so a save would reload with a shape it was not written from.
export type CabinetEffect = {
  readonly kind: "cabinet";
  readonly role: RoleId;
  readonly person?: PersonId;
};

export type OperatorEffect = {
  readonly kind: "operator";
  readonly spawn?: readonly OperatorRuntime[];
  readonly removeIds?: readonly string[];
};

// Which stance the administration now holds in one policy domain. Like
// CabinetEffect, this is the only writer of its slice of player state outside
// founding, and it replaces rather than accumulates: a domain holds exactly one
// stance at a time, always.
export type PolicyEffect = {
  readonly kind: "policy";
  readonly domain: string;
  readonly stance: string;
  /**
   * Whose program moved. Omitted, or the player's own nation, means the
   * administration's — `player.policies`. Any other nation writes that
   * government's program instead, which is where the rest of the world's
   * legislating lands.
   */
  readonly nation?: NationId;
};

// The standing appropriation the administration now holds. Replaces rather
// than accumulates, for the same reason PolicyEffect does: a government holds
// exactly one budget at a time, and the one it passed last is not still partly
// in force.
export type BudgetEffect = {
  readonly kind: "budget";
  readonly allocation: Readonly<Record<string, number>>;
};

/**
 * Movement in what the country makes of the government.
 *
 * Deltas on the six standing judgments, never on approval itself — approval is
 * derived (opinion.ts) and an effect that could set it would be an effect that
 * declares what the public thinks without saying why. `polarize` is the one
 * asymmetric field: a decision may divide a country and no decision may simply
 * declare it united, so the value is positive-only, and it pushes the
 * polarization stock a share of a fully divisive week (`polarization.ts`).
 *
 * `heal` moves the stock back toward the era's anchor by a distance, from
 * either side. Time is not a decision, so the weekly revision phase is its only
 * writer. Both fields are relative, because polarization has several writers
 * in a turn and a whole-value write would erase what the others added.
 */
export type OpinionEffect = {
  readonly kind: "opinion";
  readonly deltas: Partial<Record<OpinionDriver, number>>;
  readonly polarize?: number;
  readonly heal?: number;
  /** The weekly revision's record of which stories are on the front page, replacing the last one whole. */
  readonly salience?: SalienceMemory;
};

// A decision's pull on the player's accumulated alignment.
// Always additive (packages/engine/src/alignment.ts's accumulateAlignment),
// never a direct overwrite, so alignment reflects decision history.
export type AlignmentEffect = {
  readonly kind: "alignment";
  readonly pull: Partial<AlignmentVector>;
};

// A full replacement of the removal arc,
// recomputed each turn from live state (packages/engine/src/removal.ts).
export type RemovalEffect = {
  readonly kind: "removal";
  readonly arc: RemovalArc;
};

/**
 * Seat or clear an acting officer.
 *
 * Its own kind rather than a variant of `cabinet`, because an acting is not a
 * confirmed holder and writing one into the cabinet would claim a Senate vote
 * that never happened. An absent `person` clears the seat, which is how the
 * confirmed appointment that ends the arrangement says so.
 */
export type ActingEffect = {
  readonly kind: "acting";
  /** A role id or an office id, whichever the seat is. */
  readonly seat: string;
  readonly person?: PersonId;
};

/**
 * Replace what the cabinet has outstanding with the President.
 *
 * Whole rather than patched, the way `removal` and `conflict` are: the agenda is
 * recomputed from the week that just ran — proposals that expired are gone,
 * offers that were answered are gone — and a field-by-field merge would leave a
 * withdrawn proposal standing because nothing explicitly removed it.
 */
export type CabinetAgendaEffect = {
  readonly kind: "cabinetAgenda";
  readonly set: CabinetAgendaState;
};

// A war's whole record, replaced rather than patched: conflicts.ts recomputes
// the conflict from the week it just resolved, the same way removal.ts
// recomputes its arc, so there is never a half-written war in state.
export type ConflictEffect = {
  readonly kind: "conflict";
  readonly set: Conflict;
};

// One signed executive order, appended. What the government did and what the
// odds were are settled the moment the pen leaves the page and are never
// rewritten; the one part of the record that goes on moving afterwards is the
// court case, and that has its own effect below rather than a second writer
// here.
export type OrderEffect = {
  readonly kind: "order";
  readonly set: ExecutiveOrderRecord;
};

// The other branch, replaced whole for the reason a war is: congress.ts
// recomputes the chamber from the week it just had — disposition, expired
// authorizations, the appropriation's own clock — and patching one field of
// that from two places is how an administration ends up with an authorization
// nobody voted for.
export type CongressEffect = {
  readonly kind: "congress";
  readonly set: Congress;
};

// One bill, replaced whole and keyed by its own id. A bill moves through a
// small fixed sequence — desk, signature or veto, override or death — and every
// step is the whole record rewritten with a new status and the votes that
// produced it.
export type BillEffect = {
  readonly kind: "bill";
  readonly set: Bill;
};

// The term clock, replaced whole. A term, its fixed dates and everything the
// country has said at one of them move together — a second term opening is the
// same write as the election that produced it — and a patch of one field from
// two places is how a presidency ends up in a term nobody voted for.
export type TermClockEffect = {
  readonly kind: "termClock";
  readonly set: TermClock;
};

// The press corps, on the same terms: press.ts recomputes the standing from the
// week the administration just had, and an engagement appended by one writer
// while the standing is drifted by another is how the corps ends up warmer for
// a press conference that went badly.
export type PressEffect = {
  readonly kind: "press";
  readonly set: PressCorps;
};

// One treaty, keyed by its own id. A treaty moves through a short fixed
// sequence — signed, then ratified or rejected — and every step is the whole
// record rewritten with the Senate's count attached.
export type TreatyEffect = {
  readonly kind: "treaty";
  readonly set: TreatyRecord;
};

// An order already on the record, rewritten. Unlike `OrderEffect`, which
// appends the signature, this is the court coming back weeks later: the only
// field it moves is the review, and it is matched on the record's own id.
export type OrderReviewEffect = {
  readonly kind: "orderReview";
  readonly id: string;
  readonly review: NonNullable<ExecutiveOrderRecord["review"]>;
};
export type OrderRescissionEffect = { readonly kind: "orderRescission"; readonly id: string;
  readonly turn: number; readonly reason: "rescinded" | "sunset" };
export type OrderRemedyEffect = { readonly kind: "orderRemedy"; readonly orderId?: string; readonly ruleId?: string };
export type CourtLimitedReliefEffect = { readonly kind: "courtLimitedRelief"; readonly proceedingId: string; readonly orderId: string;
  readonly action: "apply" | "restore"; readonly scope: "defense-industrial" | "agency-rule"; readonly fraction: number };

/** Full replacement of one nation's macro record, the way `CycleEffect` replaces its cycle. */
export type MacroStateEffect = { readonly kind: "macroState"; readonly nation: NationId; readonly set: MacroState };

/** Full replacement of one nation's books. */
export type BooksEffect = { readonly kind: "books"; readonly nation: NationId; readonly set: NationBooks };

/** Full replacement of the United States' debt-limit record. */
export type DebtLimitEffect = { readonly kind: "debtLimit"; readonly set: DebtLimitState };

/**
 * The founding nation borrows `amount` (USD millions, today's prices) by the
 * President's own choice. A reply or an order that borrows is the President's
 * borrowing, not the world's, so it is booked where crowding can see it rather
 * than written onto the stock as a bare figure.
 */
export type ChoiceBorrowingEffect = { readonly kind: "choiceBorrowing"; readonly amount: number; readonly estimate?: import("./scenario-accounting.js").ScenarioEstimate };

/** Admit or remove held documents. Bookkeeping: the packet that carries it is marked background. */
export type DocketEffect = {
  readonly kind: "docket";
  readonly admit?: readonly DocketEntry[];
  readonly remove?: readonly string[];
};

export type Effect =
  | ImpactEventEffect
  | BorderIncidentEffect
  | BlockadeEffect
  | NpcTempoEffect
  | HullLossEffect
  | MetricEffect
  | RelationshipEffect
  | NationStatEffect
  | PopulationTollEffect
  | CityEffect
  | StateEffect
  | SectorEffect
  | FlagEffect
  | PersonEffect
  | TieEffect
  | CabinetEffect
  | PolicyEffect
  | BudgetEffect
  | OperatorEffect
  | AlignmentEffect
  | OpinionEffect
  | RemovalEffect
  | ActingEffect
  | CabinetAgendaEffect
  | CycleEffect
  | MacroStateEffect
  | ExternalShockEffect
  | BooksEffect
  | DebtLimitEffect
  | ChoiceBorrowingEffect
  | CohortEffect
  | ConflictEffect
  | InstitutionEffect
  | NominationEffect
  | TradeEffect
  | CommandEffect
  | IntelligenceEffect
  | AssessmentEffect
  | FindingEffect
  | WarPowersEffect
  | ScenarioFamilyEffect
  | CommitmentEffect
  | ConditionEffect
  | EmergencyEffect
  | ExternalEmergencyEffect
  | MilitaryConstructionProjectEffect
  | OffshoreLeaseSaleEffect
  | CleanPowerPurchaseEffect
  | BlockedAssetEffect
  | PursuitEffect
  | OrderEffect
  | CongressEffect
  | BillEffect
  | TermClockEffect
  | PressEffect
  | TreatyEffect
  | OrderReviewEffect
  | OrderRescissionEffect
  | OrderRemedyEffect
  | CourtLimitedReliefEffect
  | OrderFramingEffect
  | PendingRuleEffect
  | CourtCaseEffect
  | CourtProceedingEffect
  | SolicitorGeneralEffect
  | CapRaiseEffect
  | FundingLapseEffect
  | AppropriationEffect
  | GodModeEffect
  | RulesEffect
  | OversightEffect
  | AttentionEffect
  | DocketEffect
  | CaseEffect
  | IssuedActEffect
  | PledgeEffect
  | ForecastEffect
  | MarketsEffect
  | MunitionsEffect
  | LeadershipEffect
  | MembershipEffect
  | RegimeEffect
  | IndictmentEffect
  | FeedEffect;

export type EffectPacket = {
  readonly source: EffectSource;
  readonly actor: EffectActor;
  readonly turn: number;
  readonly narration: NarrationRef;
  readonly effects: readonly Effect[];
  /**
   * The facts about this change that the narrating sentence should not be the
   * only record of. They travel on the packet for the same reason `actor` does:
   * only the caller knows them, apply() is the one write path onto the ledger,
   * and a second way to attach them would be a second account of the campaign.
   * Both are optional because most packets are not a commitment and most
   * commitments were not argued over in a room.
   */
  readonly commitment?: ActionCommitment;
  readonly counsel?: ActionCounsel;
  /**
   * What this act spent of the government's own capacity to act next — forces
   * committed, a source burned, emergency powers invoked.
   *
   * Opaque strings, because the vocabulary is the content layer's and naming it
   * here would put an authored enum in the engine's own types for the sake of a
   * field the engine only carries. Nothing prices them; the ledger keeps them
   * so the review afterwards can say what the week actually committed, which no
   * metric movement records.
   */
  readonly institutional?: readonly string[];
  /**
   * What the card assessed before the act was taken, frozen here so the Record
   * can set it beside what the week measured. Only a spoken position carries
   * one; an instrument carries odds instead.
   */
  readonly assessment?: PositionAssessment;
  readonly subjects?: readonly import("./story-subject.js").StorySubject[];
  readonly accounting?: readonly import("./scenario-accounting.js").ScenarioAccounting[];
  // Optional on the packet, never optional on the ledger: a packet that
  // supplies none is stamped anyway, because an event nothing can name is an
  // event no later effect can answer to. See causality.ts.
  readonly provenance?: CausalProvenance;
  /**
   * The world's weekly bookkeeping — accruals, apportionments, drift. It is
   * applied and stamped like any packet, but it is not an act anyone took, so
   * the Record can leave it out without changing any causal id.
   */
  readonly background?: boolean;
};
