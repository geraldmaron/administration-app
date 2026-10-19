import type { NationId, PersonId, Relationship, RoleId } from "@admin/world";
import type { ActionRecord, Campaign, Conflict, FeedItem, FlagId, GodModeState, MetricSet, NationCondition, NationRuntime, PersonRuntime, Pursuit, RemovalArc } from "./state-campaign.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import type { Bill, ForceAuthorization, TermClock, TreatyRecord } from "./state-legislature.js";
export declare function selectNation(campaign: Campaign, id: NationId): NationRuntime | undefined;
export declare function selectPerson(campaign: Campaign, id: PersonId): PersonRuntime | undefined;
export declare function selectRelationship(campaign: Campaign, from: NationId, to: NationId): Relationship | undefined;
export declare function selectRelationshipsFrom(campaign: Campaign, from: NationId): readonly Relationship[];
/**
 * Whether the player's government and another already sit in some standing body
 * together.
 *
 * Read off the two nations' own `base.memberships` rather than through
 * `blocsInPlay`, which builds the same fact the other way round (org to member
 * list) out of every nation on the board. Both answer the same question, and
 * this is the direction a selector can ask it in: blocs.ts and treaties.ts both
 * import campaign state at run time, so a selector reaching for either would
 * close a cycle. The treaty floor needs it, so it lives on the read path.
 */
export declare function sharesCompact(campaign: Campaign, counterpart: NationId): boolean;
export declare function hasIntelOnRelationship(campaign: Campaign, relationship: Relationship): boolean;
/**
 * What the player's services can read of what a foreign government holds
 * internally — its own assessments rather than its dealings with third parties.
 * The outread comparison, run against the one government doing the guarding at
 * the heavier margin a government's own counsel costs. Membership in a shared
 * body grants no access to a government's private deliberations; selective
 * reports must be read through their own record. The player's own government
 * keeps no file on itself worth spying on, so it is always legible.
 */
export declare function hasIntelOnNation(campaign: Campaign, nation: NationId): boolean;
export declare function selectDiscoverableRelationshipsFrom(campaign: Campaign, from: NationId): readonly Relationship[];
/**
 * Whether this campaign has been governed from outside the fiction. Read by the
 * intelligence gates, the removal arc, and anything that ranks a campaign
 * against others — none of which should be reaching into `campaign.godMode`
 * themselves to ask a question this simple.
 */
export declare function isGodMode(campaign: Campaign): boolean;
export declare function selectGodMode(campaign: Campaign): GodModeState | undefined;
/**
 * Whether this campaign may be ranked. Achievements and leaderboards ask this
 * rather than testing `godMode` directly, so the exclusion is one rule in one
 * place instead of a convention every future scoreboard has to remember.
 */
export declare function isRankable(campaign: Campaign): boolean;
export declare function selectMetrics(campaign: Campaign): MetricSet;
/**
 * One metric's course, oldest first, with the live turn's reading last. The
 * series a surface draws: the closed turns are settled and the final point is
 * where the metric stands right now.
 */
export declare function selectMetricSeries(campaign: Campaign, key: keyof MetricSet): readonly number[];
/**
 * How far a metric has moved since the last closed turn, or `undefined` where
 * `metricHistory` is genuinely empty and any number would be invented. A built
 * campaign's opening turn is not that case: `inheritedMetricHistory` seeds a
 * predecessor's closing quarter before the president's first turn, so the
 * delta returned there is the move against that inherited reading. Callers
 * must treat the two cases differently — "no change" and "no prior reading"
 * are not the same statement.
 */
export declare function selectMetricDelta(campaign: Campaign, key: keyof MetricSet): number | undefined;
/** Removal pressure's own course, oldest first, live reading last — the same shape `selectMetricSeries` gives the five metrics. */
export declare function selectRemovalPressureSeries(campaign: Campaign): readonly number[];
/** How far removal pressure has moved since the last closed turn, or `undefined` on the opening turn. */
export declare function selectRemovalPressureDelta(campaign: Campaign): number | undefined;
/**
 * The chairs this campaign's charter defines, occupied or not.
 *
 * Distinct from `selectCabinet`, which is live occupancy: an emptied chair has
 * no entry there at all, so walking it makes a dismissed minister's ministry
 * disappear from the government rather than stand vacant. The seats are fixed
 * at founding and never change, which is exactly what a surface listing "the
 * cabinet" means by it.
 */
export declare function selectCabinetSeats(campaign: Campaign): readonly RoleId[];
export declare function selectCabinet(campaign: Campaign): Readonly<Record<RoleId, PersonId>>;
export declare function selectCabinetHolder(campaign: Campaign, role: RoleId): PersonRuntime | undefined;
export declare function hasFlag(campaign: Campaign, flag: FlagId): boolean;
export declare function selectLedger(campaign: Campaign): readonly ActionRecord[];
export declare function selectLedgerSince(campaign: Campaign, turn: number): readonly ActionRecord[];
/**
 * Only what this administration decided: the ops it committed, the replies it
 * gave, the appointments it made. Everything a nation, an operator or the
 * month's drift did on its own stays in `selectLedger` — the two are different
 * documents, and reading one as the other is how a player comes to believe the
 * world is only ever reacting to them.
 */
export declare function selectPlayerLedger(campaign: Campaign): readonly ActionRecord[];
export declare function selectFeed(campaign: Campaign): readonly FeedItem[];
export declare function selectRemoval(campaign: Campaign): RemovalArc;
export declare function selectConflicts(campaign: Campaign): readonly Conflict[];
export declare function selectActiveConflicts(campaign: Campaign): readonly Conflict[];
export declare function selectConditions(campaign: Campaign): readonly NationCondition[];
export declare function selectActiveConditions(campaign: Campaign): readonly NationCondition[];
export declare function selectConditionsFor(campaign: Campaign, nation: NationId): readonly NationCondition[];
export declare function selectOrders(campaign: Campaign): readonly ExecutiveOrderRecord[];
export declare function selectContestedOrders(campaign: Campaign): readonly ExecutiveOrderRecord[];
/** Every authorization still in force this week. */
export declare function selectActiveAuthorizations(campaign: Campaign): readonly ForceAuthorization[];
/** The standing authorization to use force against one country, if there is one. */
export declare function selectAuthorizationAgainst(campaign: Campaign, target: NationId): ForceAuthorization | undefined;
export declare function selectBills(campaign: Campaign): readonly Bill[];
/** What is waiting for a signature or a veto right now. */
export declare function selectBillsOnTheDesk(campaign: Campaign): readonly Bill[];
/** What the chambers are still working: referred, in markup, or awaiting a call. */
export declare function selectBillsInProgress(campaign: Campaign): readonly Bill[];
/** The acts in force. Durable, and read by everything they constrain. */
export declare function selectLaws(campaign: Campaign): readonly Bill[];
/** Enacted provisions still governing. The historical statute book stays in `selectLaws`. */
export declare function selectCurrentLaws(campaign: Campaign): readonly Bill[];
/** Whether an enacted revision actually changed its named predecessor. */
export declare function hasLawRevisionTakenEffect(campaign: Campaign, billId: string): boolean;
export declare function selectTermClock(campaign: Campaign): TermClock;
/**
 * Weeks served in *this* term — the only week number a player is ever shown.
 *
 * The turn counter and the term counter agree for exactly one presidency. A
 * re-elected president's term starts at turn 209, so the raw turn is 215 in
 * their seventh week, and every surface that printed `campaign.turn` against a
 * 208-week term told them they were past the end of a term they had just
 * begun. One writer, because two of them is how the masthead came to read
 * "215 / 208 wk" two hundred points above a rail reading "Week 7 of 208".
 */
export declare function selectWeeksServed(campaign: Campaign): number;
export declare function selectTreaties(campaign: Campaign): readonly TreatyRecord[];
/** Signed, and waiting on the Senate. */
export declare function selectTreatiesAwaitingRatification(campaign: Campaign): readonly TreatyRecord[];
/**
 * The instruments actually in force — the only ones that bind anybody. A
 * Senate-ratified treaty and a signature-only executive agreement both bind;
 * one signed but still awaiting the Senate does not.
 */
export declare function selectBindingTreaties(campaign: Campaign): readonly TreatyRecord[];
export declare function selectPursuits(campaign: Campaign): readonly Pursuit[];
export declare function selectActivePursuits(campaign: Campaign): readonly Pursuit[];
/**
 * The campaign one nation is currently running against another, if any. At most
 * one is ever active per ordered pair: a state pressing a neighbor over trade
 * and over its border is running one campaign with two grievances, not two
 * campaigns, and modeling it as two would let the same commitment be spent
 * twice.
 */
export declare function selectPursuitAgainst(campaign: Campaign, actor: NationId, target: NationId): Pursuit | undefined;
