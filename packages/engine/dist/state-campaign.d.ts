import type { ImpactEvent } from "./impact-event.js";
import type { BorderIncident } from "./border-incidents.js";
import type { Judiciary } from "./state-judiciary.js";
import type { City, CityId, CohortId, FactionId, NationId, SectorId, StateId, PersonId, RoleId, Nation, NationStats, NationTraits, OrgId, Person, Relationship } from "@admin/world";
import type { CampaignSeed } from "./rng.js";
import type { PartyShares } from "./electorate.js";
import type { SalienceMemory } from "./opinion.js";
import type { ConflictInheritance, EngagementState, ForeignCoverageState, ForeignPoliticsState, MarketsState, MunitionsState, OpponentState, RegimeOperationsState, ReleasesState } from "./state-world.js";
import type { CycleState } from "./business-cycle.js";
import type { MacroState } from "./macro-state.js";
import type { NationBooks } from "./national-books.js";
import type { DebtLimitState } from "./debt-limit.js";
import type { DocketEntry, WeekOpening } from "./state-week.js";
import type { OpinionRecord } from "./opinion-record.js";
import type { RelationsRecord } from "./relations-record.js";
import type { RulesState } from "./rules.js";
import type { PresidentialCase } from "./case-types.js";
import type { DeclaredEmergency, ExternalThreatEmergency } from "./state-emergency.js";
import type { MilitaryConstructionProject } from "./state-orders.js";
import type { OffshoreLeaseSale } from "./offshore-leasing.js";
import type { CleanPowerPurchase } from "./clean-power-purchasing.js";
import type { BlockedAsset } from "./blocked-assets.js";
import type { StateRuntime } from "./state-geography.js";
import type { Tie } from "./state-ties.js";
import type { CabinetAgendaState } from "./state-cabinet-agenda.js";
import type { AccountCapRaise, Bill, Congress, FundingLapse, IssuedAct, TermClock, PressCorps, TreatyRecord } from "./state-legislature.js";
import type { InstitutionId, InstitutionRuntime } from "./institutions.js";
import type { OversightState } from "./oversight.js";
import type { DirectiveStore } from "./directives.js";
import type { Nomination } from "./nomination.js";
import type { ServiceId, ServiceRuntime } from "./services.js";
import type { ProjectId, ProjectRuntime } from "./projects.js";
import type { TradeState } from "./trade.js";
import type { SecurityState } from "./security.js";
import type { ScenarioFamilyState, ScenarioPlace } from "./scenario-families.js";
import type { CohortStrain } from "./demos.js";
import type { ExecutiveOrderRecord, OrderStatLineage, PendingRule } from "./state-orders.js";
import type { Commitment } from "./state-commitments.js";
import type { FoundingConfig } from "./state-founding.js";
import type { PledgeLedger } from "./pledges.js";
import type { ActionRecord } from "./state-ledger.js";
export type { FoundingConfig, FoundingMandate } from "./state-founding.js";
export type GameDate = {
    readonly year: number;
    readonly month: number;
    readonly day: number;
};
export type NationRuntime = {
    readonly base: Nation;
    readonly stats: NationStats;
    readonly traits: NationTraits;
    readonly memberships?: readonly OrgId[];
};
/**
 * Live metro state. `base` is the authored snapshot and does not move;
 * employment, remaining tax-holiday weeks, and US `adminLean` do.
 * `adminLean` is omitted on foreign cities rather than stored as undefined,
 * so a JSON save round-trips the same shape it was written with.
 */
export type CityRuntime = {
    readonly base: City;
    readonly employment: number;
    readonly taxBase: number;
    readonly taxHolidayTurns: number;
    readonly adminLean?: number;
    readonly demShare?: number;
    readonly lastMovedTurn?: number;
    readonly lastMovedReason?: string;
};
export type SectorRuntime = {
    readonly nation: NationId;
    readonly sector: SectorId;
    readonly mix: number;
    readonly employment: number;
    readonly laborPressure: number;
};
export type RelationshipGraph = Readonly<Record<string, Relationship>>;
export declare function relationshipKey(from: NationId, to: NationId): string;
export type PersonRuntime = {
    readonly base: Person;
    readonly alive: boolean;
    /** A living former justice remains in the record but is not offered another seat. */
    readonly judicialRetired?: true;
    readonly currentRole?: RoleId;
    readonly affiliation?: FactionId;
    /**
     * What their loyalty read when they took the chair they currently hold.
     *
     * `base.loyalty` moves during a campaign, so the founding roll is gone the
     * moment it does — and "62%" says nothing a player can act on without it,
     * while "62% and falling since you overruled them" is a decision. Absent for
     * someone who has never been seated, and reset on appointment: a chair's
     * record is not inherited by whoever walks into it.
     */
    readonly loyaltyAtAppointment?: number;
    /** US governor overlay. Omitted rather than undefined so JSON round-trips. */
    readonly state?: StateId;
    readonly municipalCity?: CityId;
    /** What they hold toward the President. Absent until something the President did reaches them. */
    /** Issue-specific political pressure from actual outreach; it is not a vote commitment. */
    readonly issuePressure?: readonly {
        readonly actId: string;
        readonly source: string;
        readonly delta: number;
        readonly through: GameDate;
        readonly account: string;
    }[];
    readonly tie?: Tie;
};
export type MetricSet = {
    /**
     * The headline: the approval rating the public actually holds, 0..1.
     *
     * Stored, but never written by an effect. It is settled once per packet in
     * `apply()` from `player.opinion` and the week's own salience, exactly as the
     * composite it replaced was — a figure an effect can set directly is a figure
     * nothing has to explain, and this one has to be explainable as the sum of
     * six judgments the player can read.
     *
     * Stored rather than derived on read because the record depends on it. A
     * ledger entry's `cost` is an amount per metric measured as a before/after
     * diff, and the removal arc's recent-record term, the Record screen's list of
     * what moved the number, and the balance harness's per-turn series all read
     * that diff. A headline with no place in the metric set has no diff to leave
     * behind, and every one of those readers would need a second snapshot
     * mechanism of its own.
     */
    readonly approval: number;
    /**
     * Budget authority: the part of the enacted discretionary appropriation this
     * administration is still holding and may obligate, in USD millions.
     *
     * Not cash, not reserves, and not a wallet. It is founded at a carry share of
     * the year's discretionary line (`openingBudgetAuthority`, funding.ts),
     * released a week at a time by `apportionmentPhase`, floored at zero because
     * an obligation in excess of an appropriation is void rather than borrowed,
     * and credited by nothing outside an appropriation, a supplemental or a
     * declared-emergency drawdown.
     *
     * The key is `treasury` and only the key. It is the scenario schema's
     * commitment-cost field — `reply.commitment.cost.treasury` across two dozen
     * content files and every shipped reply — so renaming it here is a corpus
     * migration rather than an engine change.
     */
    readonly treasury: number;
    readonly stability: number;
    readonly militaryReadiness: number;
    readonly standing: number;
};
/**
 * What the country makes of its own government, stored as the six standing
 * judgments a public actually holds rather than as one approval number.
 *
 * These are what effects move. `metrics.approval` is what they add up to under
 * the weights the week itself decides, and nothing writes it directly.
 */
export type PublicMood = {
    readonly security: number;
    readonly prosperity: number;
    readonly services: number;
    readonly integrity: number;
    readonly unity: number;
    readonly competence: number;
    /**
     * How divided the country is: the era's anchor plus what this administration
     * has added or healed (`polarization.ts`). Not a judgment of the government —
     * a property of the public that sets how far apart the parties start and how
     * far the record moves each of them.
     */
    readonly polarization: number;
};
export type FlagId = string;
export type FlagSet = Readonly<Record<FlagId, boolean>>;
export type AlignmentVector = {
    readonly economicLeftRight: number;
    readonly authLibertarian: number;
    readonly nationalistGlobalist: number;
};
export type OperatorRuntime = {
    readonly id: string;
    readonly kind: string;
    readonly nationality?: NationId;
    /** Set only on an operator the opening board carried into the oath. */
    readonly inherited?: ConflictInheritance;
};
/**
 * Who ordered a change, as opposed to which subsystem produced it (that is an
 * `EffectPacket`'s `source`). The two are genuinely different questions: a
 * conversation reply and an ops commit come from different subsystems and are
 * both the player, while an NPC's action and the player's own run through the
 * identical resolver and differ only in who gave the order. Only the caller can
 * answer it, so every packet states it rather than having it inferred from
 * `source` — an inference that is right today and would go quietly wrong the
 * first time a subsystem serves both sides.
 */
export type EffectActor = "player" | "world" | "developer";
/**
 * Who ordered an action, read from the nation that took it rather than from
 * the subsystem that ran it. The player's own ops and an NPC's go through one
 * resolver, so the resolver cannot tell them apart by how it was called — but
 * it can always tell them apart by whose nation is acting, which is the fact
 * itself rather than a proxy for it.
 */
export declare function actorForNation(campaign: Campaign, acting: NationId): EffectActor;
export type { ActionCommitment, ActionCounsel, ActionCounselVoice, ActionRecord } from "./state-ledger.js";
export type FeedVisibility = "public" | "intelligence";
/**
 * The particulars an article is written from.
 *
 * A headline states what happened; a piece behind it has to say who it happened
 * to and what turns on it, or it is three paragraphs of atmosphere that would
 * read identically under any other headline. Every field is optional because a
 * feed item is produced in twenty places and not all of them know all of this —
 * but a site that knows a name or a number should hand it over, because the
 * composer cannot invent one and will not pretend to.
 */
/**
 * Scenario-class vocabulary shared with authored content scene facets.
 *
 * Exported as a value, not only as the source of the type: a validator on the
 * other side of the contract needs the list at runtime to check a class it was
 * handed, and without the export the array reads as dead to every linter that
 * cannot follow `typeof X[number]`.
 */
export * from "./state-feed.js";
export * from "./state-commitments.js";
export * from "./state-removal.js";
import type { RemovalArc } from "./state-removal.js";
import type { FeedItem, GodModeState } from "./state-feed.js";
export type { Conflict, ConflictBeat, ConflictOpening, ConflictSide, ConflictStatus } from "./state-conflict.js";
import type { Conflict } from "./state-conflict.js";
import type { ConditionKind } from "./condition-kinds.js";
export type { ConditionKind };
export type { ConditionBeat, ConditionScope, ConditionStatus, NationCondition, } from "./state-condition.js";
import type { NationCondition } from "./state-condition.js";
import type { ExternalShock } from "./external-shocks.js";
export type { Pursuit, PursuitBeat, PursuitStatus } from "./state-pursuit.js";
import type { Pursuit } from "./state-pursuit.js";
export type { EconomySample, FeedDigestWeek, StateApprovalSample } from "./state-series.js";
import type { EconomySample, FeedDigestWeek, StateApprovalSample } from "./state-series.js";
export type Campaign = {
    readonly seed: CampaignSeed;
    readonly founding: FoundingConfig;
    /**
     * The Vice President: elected on the ticket, seated without a Senate vote,
     * and never a cabinet chair. Optional because a campaign can be sealed
     * without a running mate, and one is not invented for it.
     */
    readonly vicePresident?: PersonId;
    /**
     * Every pledge the President made on a platform plank, kept and broken ones
     * included: a broken promise is the part of the record the cohorts it courted
     * remember. Optional so a campaign held only in memory still reads;
     * `normalizeCampaign` reads its absence as no pledges made.
     */
    readonly pledges?: PledgeLedger;
    /**
     * Staff forecasts the President acted on, oldest first, each kept beside what
     * happened (`selectForecastRecord`). Optional: a save from before forecasts
     * were filed has none, and an absent record reads as no forecasts.
     */
    readonly forecasts?: readonly import("./projection-record.js").ForecastRecord[];
    readonly turn: number;
    /** Set on the first office day and cleared at the close. Absent on a one-shot week. */
    readonly week?: WeekOpening;
    /** Held documents. Absent means the desk still stages the old way, and loading does not create it. */
    readonly docket?: readonly DocketEntry[];
    readonly calendar: GameDate;
    readonly nations: Readonly<Record<NationId, NationRuntime>>;
    readonly cities: Readonly<Record<CityId, CityRuntime>>;
    readonly states: Readonly<Record<StateId, StateRuntime>>;
    readonly sectors: Readonly<Record<NationId, Readonly<Partial<Record<SectorId, SectorRuntime>>>>>;
    readonly relationships: RelationshipGraph;
    readonly people: Readonly<Record<PersonId, PersonRuntime>>;
    readonly player: {
        readonly metrics: MetricSet;
        /**
         * Where the metrics stood at the close of each completed turn, oldest
         * first — never the live turn, which is still moving. A figure on its own
         * says where the player is; only the series says whether they are climbing
         * out of it or into it, and that is the question every metric on the
         * situation room actually raises. Bounded (see `METRIC_HISTORY_WINDOW`),
         * because a save that grows without limit for a hundred-turn campaign is a
         * cost paid for shape nobody can read at that length anyway.
         */
        readonly metricHistory: readonly MetricSet[];
        readonly cabinet: Readonly<Record<RoleId, PersonId>>;
        /**
         * The standing program: one stance held in every policy domain, always,
         * including the one the administration inherited. Stored as stance ids
         * rather than as the stances themselves — the catalogue is code, and a save
         * that carried a copy of it would reload against a build that had since
         * rebalanced it.
         */
        readonly policies: Readonly<Record<string, string>>;
        /**
         * The standing appropriation: an annual share of national income committed
         * to each of the five instruments. Stored as shares rather than as sums
         * because that is what a budget actually is — a claim on national income,
         * which is why a country that grows can afford the same establishment more
         * easily next year without anybody re-voting it.
         */
        readonly budget: Readonly<Record<string, number>>;
        readonly flags: FlagSet;
        readonly alignments: AlignmentVector;
        /**
         * How the country reads this administration. Stored on the player rather
         * than on the nation because it is a judgment of a government, not a
         * property of a people: it resets with an administration and the nation
         * does not.
         */
        readonly opinion: PublicMood;
    };
    /**
     * The standing program of every nation the player does not govern, keyed by
     * nation. The player's own is `player.policies`, because theirs is a
     * different kind of fact: charter-gated, drafted, priced and enacted by a
     * person. `selectGovernment` (governance.ts) reads across both, so nothing
     * downstream has to know which of the two it is looking at.
     */
    readonly governments: Readonly<Record<NationId, Readonly<Record<string, string>>>>;
    readonly operators: readonly OperatorRuntime[];
    readonly conflicts: Readonly<Record<string, Conflict>>;
    readonly conditions: Readonly<Record<string, NationCondition>>;
    readonly impactEvents?: Readonly<Record<string, ImpactEvent>>;
    /** Bilateral frontier incidents, including unresolved assessments; absent on older saves. */
    readonly borderIncidents?: Readonly<Record<string, BorderIncident>>;
    /**
     * Every blockade any government has laid, keyed by id, lifted ones kept. A
     * record is in force while what holds it on station still stands
     * (`blockades.ts`); absent on older saves, which read as none laid.
     */
    readonly blockades?: Readonly<Record<string, import("./blockades.js").Blockade>>;
    /**
     * Other governments' rationed acts, one entry per act per family, kept a
     * term (`npc-tempo.ts`); absent on older saves, which read as none made.
     */
    readonly npcTempo?: readonly import("./npc-tempo.js").TempoEntry[];
    /**
     * The President's hulls lost in wars, by name and class where the register
     * has one (`hull-losses.ts`); absent on older saves, which read as none lost.
     */
    readonly hullLosses?: readonly import("./hull-losses.js").HullLoss[];
    /**
     * Emergencies this administration has actually declared, by id.
     *
     * Before this the game had no such thing: `inEmergency` returned true if any
     * condition was running anywhere in the country, so the three heaviest orders
     * in the game — suspending habeas corpus, restricting the press, governing by
     * decree — unlocked the moment the weather turned, with no act of the
     * presidency behind them and nothing to give back. A declaration is an act
     * with a scope, a date and a cost, and it is the only thing that opens them.
     */
    readonly emergencies: Readonly<Record<string, DeclaredEmergency>>;
    /** Targeted IEEPA declarations, each tied to an observed foreign pursuit. */
    readonly externalEmergencies?: Readonly<Record<string, ExternalThreatEmergency>>;
    readonly pursuits: Readonly<Record<string, Pursuit>>;
    readonly orders: readonly ExecutiveOrderRecord[];
    readonly orderStatLineage?: Partial<Record<import("./policy-stats.js").PolicyStatPath, OrderStatLineage>>;
    readonly militaryConstructionProjects?: readonly MilitaryConstructionProject[];
    /** Sale and later exploration records; absence means no sale has been attempted. */
    readonly offshoreLeaseSales?: readonly OffshoreLeaseSale[];
    /** Federal-site contracts and observed delivery under an operative purchasing rule. */
    readonly cleanPowerPurchases?: readonly CleanPowerPurchase[];
    /** Modeled foreign-government accounts blocked under one live emergency and order. */
    readonly blockedAssets?: readonly BlockedAsset[];
    /**
     * The rulemaking proceedings the orders above set running, and where each
     * one has got to. Kept beside the orders rather than on them because a
     * proceeding outlives the signature and is acted on by three different
     * weeks — the one it lands in, the one the courts rule in, and the one
     * Congress disapproves it in.
     */
    readonly pendingRules: readonly PendingRule[];
    /**
     * Every ceiling on the appropriation that an act of Congress has lifted.
     * Spent ones are kept for the reason a settled war is: what an
     * administration was authorized to buy and never bought is part of its
     * record.
     */
    readonly capRaises: readonly AccountCapRaise[];
    /**
     * Every time the money actually ran out, oldest first.
     *
     * Whether the government is closed *right now* is not stored and must not be:
     * it is `congress.appropriation.throughTurn` against the turn, and a second
     * copy of that fact would be a shutdown that outlived the stopgap that ended
     * it. What is stored is the history, because that is the part no reading of
     * the current appropriation can recover — a term that closed the government
     * twice has done something a term that never did has not, and once a
     * continuing resolution passes there is nothing left in the appropriation to
     * say so.
     */
    readonly lapses: readonly FundingLapse[];
    readonly commitments: Readonly<Record<string, Commitment>>;
    /**
     * The executive branch, keyed by institution. Distinct from `player.cabinet`,
     * which stays what it always was: the charter's own seats and who sits in
     * them. An institution is the body a policy is executed by, with a staff, a
     * budget and a backlog, and it is the reason an announcement and a delivery
     * are two different things. Seeded whole at founding from the catalog, with
     * the political offices empty, which is how a presidency actually starts.
     */
    readonly institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>;
    /**
     * Every nomination this administration has made, keyed by id, terminal ones
     * kept. A withdrawn or rejected name is part of the record of the presidency
     * for the reason a dead bill is, and the pipeline's own median time-to-seat
     * is only readable if the failures stay in it.
     */
    /** The Court as stored state: every case it has decided, with the lineup. */
    readonly judiciary: Judiciary;
    readonly nominations: Readonly<Record<string, Nomination>>;
    /**
     * The trade network's stored half: the measures in force, the answers the
     * world is expecting, and how far each sector's price has moved.
     *
     * The edges themselves are not here and deliberately so. A dense bilateral
     * sector network at fifty nations would be seventy thousand entries that
     * nobody authored; what a bilateral sector edge actually is, is already
     * implied by the relationship's trade dependence and the two economies. So
     * `tradeEdge()` derives it, and the save carries only what a decision made.
     */
    readonly trade: TradeState;
    /**
     * The national security state: the eleven combatant commands and the map they
     * divide, the intelligence community's taskings and the refusals it has
     * written, the finished assessments, the covert action findings, and the
     * reports owed to Congress within forty-eight hours of introducing forces.
     *
     * One field rather than five because they are one subject. A president under
     * pressure reaches for all of them in the same week, and a save that filed
     * them apart would be a save that recorded five features rather than one
     * half of a government.
     */
    readonly security: SecurityState;
    /**
     * The arcs this campaign has running, keyed by family.
     *
     * A scenario binds its counterpart by a rule evaluated the week it is drawn,
     * which is right for an opener and wrong for a callback: the ranking moves,
     * so a follow-up re-ranks and can arrive about a country the president never
     * dealt with. A family pins the counterpart at the opener and hands it to
     * every later member. Only what a decision created is stored — which family
     * opened, against whom, and what has been dealt under it.
     */
    readonly scenarioFamilies: ScenarioFamilyState;
    /**
     * Where at home the last answer that set each authored flag happened, so a
     * scenario gated on the flag returns to the same place. Only answers below
     * the capital leave an entry, and setting the flag again from Washington or
     * abroad removes it, so this holds at most one place per authored flag the
     * corpus can set. Absent on a save from before places were kept.
     */
    readonly flagPlaces?: Readonly<Record<string, ScenarioPlace>>;
    readonly congress: Congress;
    /**
     * The day this administration took the oath. Stored rather than derived from
     * `turn * 7`, because the clock can now spend days inside a week and a
     * reconstructed founding date would move every historical event with it.
     * Optional so a v48 save still loads: `campaignFoundingDate` fills it.
     */
    readonly foundingDate?: GameDate;
    /**
     * Presidential acts that have been authorized and have not yet produced their
     * world result. Optional for the same reason `directives` is: an
     * administration that has issued nothing genuinely has none.
     */
    readonly issuedActs?: Readonly<Record<string, IssuedAct>>;
    /**
     * Who is looking at this government, and what they have found.
     *
     * The inspectors general seated across the executive branch, and every matter
     * — audit or committee inquiry — that has been opened, in either direction.
     * Closed matters are kept for the reason a settled war is: what a presidency
     * was investigated for is part of its record whether or not anything came of
     * it, and a board that dropped the finished ones would let an administration
     * outlast its own scandals by waiting.
     *
     * Not on `congress`, although half of it is Congress's, and not on
     * `institutions`, although the other half sits inside them. A matter is a
     * proceeding that outlives both its author and its subject — an audit runs on
     * after the agency's leadership changes and after the auditor is removed —
     * and filing it under either would have made it that body's property to
     * close.
     */
    readonly oversight: OversightState;
    /**
     * Every instruction this administration has given a body of the government,
     * and what the body did about being given it.
     *
     * The one optional store on this record, for the reason `godMode` is not a
     * version bump at all: an administration that has never told anybody to do
     * anything genuinely has none, so absent and empty say the same thing here
     * and `selectDirectives` reads both the same way. Not filed on
     * `institutions`, although each body carries the ids of its own: a refused
     * instruction is a fact about the presidency that gave it rather than about
     * the agency that declined, and filing it inside the agency would have made
     * it that agency's to lose.
     */
    readonly directives?: DirectiveStore;
    readonly bills: Readonly<Record<string, Bill>>;
    readonly termClock: TermClock;
    readonly press: PressCorps;
    readonly treaties: Readonly<Record<string, TreatyRecord>>;
    readonly ledger: readonly ActionRecord[];
    readonly feed: readonly FeedItem[];
    readonly removal: RemovalArc;
    /**
     * Where every nation's economy sits in the business cycle. One entry per
     * nation, keyed the same way `nations` is — see `business-cycle.ts`.
     * `macroDriftPhase` is the only writer, via `CycleEffect`.
     */
    readonly cycles: Readonly<Record<NationId, CycleState>>;
    readonly macro?: Readonly<Record<NationId, MacroState>>;
    readonly books?: Readonly<Record<NationId, NationBooks>>;
    readonly debtLimit?: DebtLimitState;
    /**
     * What the country's own economy has been doing, week by week, oldest first.
     *
     * Appended in the weekly tick the way `metricHistory` is, rather than written
     * through an effect: it is a reading of the week that just closed, not
     * something a decision does. Bounded for the reason `metricHistory` is.
     */
    readonly economyHistory?: readonly EconomySample[];
    /**
     * The last reading of each month that has left the weekly ring above, oldest
     * first, one per month. Written only by the weekly tick as samples leave the
     * ring; absent until the first one does, and absent on an older save, whose
     * earlier weeks were never kept and are not reconstructed.
     */
    readonly economyArchive?: readonly EconomySample[];
    /**
     * Every state's approval as each week opened, oldest first, from the oath.
     * Display only; nothing decides an outcome on it. Appended in the weekly tick
     * beside `metricHistory` and bounded the same way. Optional so an older save
     * loads; `normalizeCampaign` opens it empty rather than inventing its past.
     */
    readonly stateApprovalHistory?: readonly StateApprovalSample[];
    /** The public's readings as each week closed (`opinion-record.ts`). Absent on an older save until its next close. */
    readonly opinionRecord?: OpinionRecord;
    /** Every government's trust with the United States as each week closed (`relations-record.ts`); absent the same way. */
    readonly relationsRecord?: RelationsRecord;
    /**
     * The development grants, sabotage and rounds of hiring or layoffs still
     * shaping a country's growth and joblessness, each dated and held for its
     * span (`external-shocks.ts`). Bounded, and absent on a campaign that has
     * none: absence reads as no shock standing.
     */
    readonly externalShocks?: readonly ExternalShock[];
    /**
     * Who is holding a seat without being confirmed into it, keyed by role or
     * office id.
     *
     * An acting officer is not the same fact as a confirmed one and cannot be
     * stored in `player.cabinet` without claiming a confirmation that never
     * happened. Absent, or an absent key, means the seat is vacant or properly
     * filled — never that an acting was seated and forgotten.
     */
    readonly actings?: Readonly<Record<string, PersonId>>;
    /** What the cabinet has asked for and not had answered. Absent means nothing is outstanding. */
    readonly cabinetAgenda?: CabinetAgendaState;
    /** The feed folded by week, so a term's shape survives the feed's own bound. */
    readonly feedDigest?: readonly FeedDigestWeek[];
    /** Sixteen cohort strain lists; applyCohort only. Empty at founding. */
    readonly cohorts: Readonly<Record<CohortId, readonly CohortStrain[]>>;
    /**
     * How far each group's politics follow its state's beyond the average voter's
     * (`state-cohort-sensitivity.ts`), drawn once at founding around the sourced
     * estimates so campaigns differ. Absent on a save founded before v60, which
     * reads the unjittered estimates.
     */
    readonly cohortSensitivity?: Readonly<Record<CohortId, number>>;
    /**
     * Each group's Republican share of the two-party vote, its partisan starting
     * point (`cohort-baseline.ts`), drawn once at founding around the sourced
     * estimates. Absent on a save founded before v61, which reads the sourced
     * shares unjittered.
     */
    readonly cohortBaseline?: Readonly<Record<CohortId, number>>;
    /**
     * The country's five partisan blocs by party (`electorate.ts`): identifiers
     * and leaners on each side and the independents who lean neither, drawn
     * once at founding inside a symmetric range around Gallup's 2025 shares.
     * Absent on a save founded before v66, which reads an even country.
     */
    readonly electorateShares?: PartyShares;
    /**
     * When each story now on the front page broke, and how bad it was then
     * (`opinion.ts#selectSalience`): a story makes its judgment louder for eight
     * weeks after it breaks or gets worse, then the country has priced it in.
     * Written by the weekly revision; absent on a save from before v66, which
     * reads every live story as newly broken.
     */
    readonly salienceMemory?: SalienceMemory;
    /**
     * What the President has put off, and the date each may interrupt again.
     * Keyed by matter id, so one matter cannot be deferred twice and a deferral
     * cannot accumulate.
     *
     * This is the half of the attention contract that has to be *stored*. The
     * rest of it — what needs the President, which three are shown, what waits
     * behind them — is derived fresh on every look, because it is a reading of
     * the world and the world has just moved. A deferral is not: it is a decision
     * the President made, and a decision that died on reload would mean the same
     * bill interrupting every time the app opened.
     *
     * An entry is not a promise that the matter comes back. It is a promise that
     * it will not come back *before* this date; whether it still exists then is
     * the source's business, not this record's.
     */
    readonly deferrals: Readonly<Record<string, GameDate>>;
    /**
     * Durable presidential cases, keyed by id. Absent on a save that predates
     * the registry, which loads as no cases. Written only by a `case` effect
     * through `apply()`.
     */
    readonly cases?: Readonly<Record<string, PresidentialCase>>;
    /**
     * What this campaign runs under, where it is not what every campaign runs
     * under: the values in force, the dated log of every change, and whether the
     * paid ones are currently held back. Absent on a campaign that has changed
     * nothing, which is almost all of them.
     *
     * Written only by `rules-effects.ts` and read only through `ruleValue`.
     */
    readonly rules?: RulesState;
    /** The Sandbox marker, and nothing else now that omniscience and immunity are rules. */
    readonly godMode?: GodModeState;
    readonly markets?: MarketsState;
    readonly munitions?: MunitionsState;
    readonly foreignPolitics?: ForeignPoliticsState;
    readonly regimeOperations?: RegimeOperationsState;
    readonly foreignCoverage?: ForeignCoverageState;
    readonly engagement?: EngagementState;
    readonly opponent?: OpponentState;
    readonly releases?: ReleasesState;
    /**
     * The departments' case work, one record per service. Absent on a save from
     * before it was tracked; the service phase opens each on its next week.
     */
    readonly services?: Readonly<Partial<Record<ServiceId, ServiceRuntime>>>;
    /**
     * The departments' grant programs, one record per program. Absent on a save
     * from before they were tracked; the project phase opens each on its next week.
     */
    readonly projects?: Readonly<Partial<Record<ProjectId, ProjectRuntime>>>;
};
export type { CampaignDiffEntry } from "./campaign-diff.js";
export { diffCampaign } from "./campaign-diff.js";
