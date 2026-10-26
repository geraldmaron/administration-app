import { STATE_IDS, type StateId } from "@admin/world";
import {
  selectActiveConditions,
  selectActiveConflicts,
  type Campaign,
  type Commitment,
  type ExecutiveOrderRecord,
  type GovernorStanding,
  type NationCondition,
} from "./state.js";
import { prospectiveOrderAuthority, type ProspectiveOrderAuthority } from "./order-authority.js";
import { ANSWER_ATTENTION_TURNS, answeredSignature } from "./obligations.js";
import type { ConditionKind } from "./condition-kinds.js";
import type { LocaleActId } from "./locale-acts.js";
import type { OrderSubject } from "./order-subjects.js";
import { liveCourtOrder } from "./court-order-records.js";

// The statutory predicates federal force at home moves on, and what a mission
// in a state is worth to the unrest it answers.
//
// Kept apart from the act catalogue so `conditions.ts` can read mission
// attention without loading the acts, the orders and everything they import:
// this file reads campaign state and order authority and nothing that computes
// a turn. Every predicate here reads the record, never an ambient event: a
// protest is not a rebellion, and a declaration over unrest is not an invasion.

/**
 * Whether the governor will go along with an act that needs them.
 *
 * Read off `GovernorStanding`. A governor disposed against the administration
 * refuses, and the refusal is what leaves only the statutes that do not ask.
 */
export const GOVERNOR_ASSENT_FLOOR = 0.45;

export function governorAssents(governor: GovernorStanding | undefined): boolean {
  // An absent governor record cannot supply affirmative consent.
  return governor !== undefined && governor.disposition >= GOVERNOR_ASSENT_FLOOR;
}

const UNREST: ConditionKind = "unrest";

/** Live unrest at home that reaches this state: placed in it, or national. The placed one wins. */
export function unrestReaching(campaign: Campaign, state: StateId): NationCondition | undefined {
  const reaching = selectActiveConditions(campaign).filter((condition) => condition.nation === campaign.founding.nation
    && condition.kind === UNREST && (condition.state === state || condition.state === undefined))
    .sort((a, b) => Number(b.state !== undefined) - Number(a.state !== undefined) || b.severity - a.severity || a.id.localeCompare(b.id));
  return reaching[0];
}

/**
 * Unrest placed in this state, not national unrest that reaches it. §252 and
 * §253 answer a state that cannot or will not keep order itself, which national
 * unrest says nothing about: read off it, every opposed governor's state would
 * open at once.
 */
function placedUnrest(campaign: Campaign, state: StateId): NationCondition | undefined {
  const reaching = unrestReaching(campaign, state);
  return reaching?.state === state ? reaching : undefined;
}

/**
 * How bad unrest has to be before each Insurrection Act occasion can be read
 * into it. Planning values: the Act names no threshold, and these order the
 * three occasions by how far each reaches past the state's own authority.
 */
export const INSURRECTION_SEVERITY = { request: 0.4, obstruction: 0.5, rights: 0.6 } as const;
/** §252 is read once the state has let a federal court's injunction stand defied for this long. */
export const OBSTRUCTION_WEEKS = 1;
/**
 * Unrest at or above this is still a disorder the state has left to the court order. Lower than the bar for suing, because the mission that made the suit
 * possible is also what eases the unrest while the court decides, and a state that has stood on a granted order is obstructing it however the crowds fare.
 */
export const OBSTRUCTION_STILL = 0.3;
/** A §254 proclamation must precede the order by at least a week, and stays in force this long. */
export const PROCLAMATION_VALID_TURNS = 4;
/** Above this, insurgency reads as rebellion for §12406(2). The United States rests near 0.05. */
export const REBELLION_INSURGENCY_FLOOR = 0.2;
/** How long Insurrection Act troops must have been on a mission here before §12406(3) reads them as unable to carry it out. */
export const REGULAR_FORCES_WEEKS = 2;

export type InsurrectionGround = "251" | "252" | "253";

/** The order each mission act signs; the troop order splits by the Act's own sections. */
export function missionOrderId(act: LocaleActId, ground?: InsurrectionGround): string | undefined {
  if (act === "troops") return ground === "251" ? "order-insurrection-request" : "order-insurrection-enforcement";
  return MISSION_ORDER_IDS[act];
}

const MISSION_ORDER_IDS: Partial<Record<LocaleActId, string>> = {
  "property-surge": "order-property-surge",
  "immigration-operation": "order-immigration-operation",
  "task-force": "order-joint-task-force",
  federalize: "order-guard-federalization",
  proclaim: "order-insurrection-proclamation",
};

const MISSION_ORDERS = new Set([...Object.values(MISSION_ORDER_IDS), "order-insurrection-request", "order-insurrection-enforcement"]);

export function isMissionOrder(orderId: string): boolean {
  return MISSION_ORDERS.has(orderId);
}

/**
 * How long each mission runs once ordered, apart from what it is worth to the
 * unrest: an immigration operation runs its weeks whether or not it eases
 * anything, and a court reads those weeks as the federal law it enforces.
 * Planning values.
 */
export const MISSION_WEEKS: Readonly<Partial<Record<LocaleActId, number>>> = {
  "property-surge": 6,
  "immigration-operation": 8,
  "task-force": 8,
  federalize: 8,
  proclaim: PROCLAMATION_VALID_TURNS,
  troops: 8,
  priority: 8,
};

const eased = (act: LocaleActId, attention: number) => ({ attention, weeks: MISSION_WEEKS[act]! });

/** What each mission is worth to the unrest it answers, and for how long. Planning values. */
export const MISSION_ATTENTION: Readonly<Partial<Record<LocaleActId, { readonly attention: number; readonly weeks: number }>>> = {
  "property-surge": eased("property-surge", 0.5),
  "task-force": eased("task-force", 0.75),
  federalize: eased("federalize", 1),
  troops: eased("troops", 1),
  priority: eased("priority", 0.3),
};

type MissionRecord = ExecutiveOrderRecord & { readonly subject: Extract<OrderSubject, { kind: "locale-mission" }> };

function missionRecords(campaign: Campaign, state: StateId): readonly MissionRecord[] {
  return campaign.orders.filter((record): record is MissionRecord =>
    record.subject?.kind === "locale-mission" && record.subject.state === state);
}

const operative = (campaign: Campaign, record: ExecutiveOrderRecord) =>
  prospectiveOrderAuthority(campaign, record.id) === "operative";

/**
 * §252: obstruction that makes federal law "impracticable to enforce ... by the
 * ordinary course of judicial proceedings". Read as the ordinary course tried
 * and defied: Justice won an injunction enforcing federal law here, and the
 * state has taken no action on the unrest since the court granted it. A
 * federal mission merely having been in the state is not a judicial proceeding.
 */
function obstructed(campaign: Campaign, state: StateId): boolean {
  const injunction = liveCourtOrder(campaign, state, ["injunction-enforcement"]);
  if (!injunction || campaign.turn - injunction.decideTurn < OBSTRUCTION_WEEKS) return false;
  const signature = answeredSignature(UNREST);
  return !(campaign.states[state]?.marks.some((mark) => mark.signature === signature && mark.turn >= injunction.decideTurn) ?? false);
}

/** Whether the state itself answered: an answered relief claim over the unrest within the attention window. */
function stateProtecting(campaign: Campaign, state: StateId): boolean {
  const signature = answeredSignature(UNREST);
  return campaign.states[state]?.marks.some((mark) =>
    mark.signature === signature && campaign.turn - mark.turn <= ANSWER_ATTENTION_TURNS) ?? false;
}

/** Each Insurrection Act occasion, read off this week's record for this state. */
export function insurrectionGrounds(campaign: Campaign, state: StateId): Readonly<Record<InsurrectionGround, boolean>> {
  const severity = unrestReaching(campaign, state)?.severity ?? 0;
  const placed = placedUnrest(campaign, state)?.severity ?? 0;
  const assents = governorAssents(campaign.states[state]?.governor);
  return {
    "251": assents && severity >= INSURRECTION_SEVERITY.request,
    "252": placed >= OBSTRUCTION_STILL && obstructed(campaign, state),
    "253": placed >= INSURRECTION_SEVERITY.rights && !assents && !stateProtecting(campaign, state),
  };
}

/** The occasion a proclamation would rest on this week, the one that asks least of federal power first. */
export function insurrectionGround(campaign: Campaign, state: StateId): InsurrectionGround | undefined {
  const grounds = insurrectionGrounds(campaign, state);
  return (["251", "252", "253"] as const).find((ground) => grounds[ground]);
}

/** A §254 proclamation for this state, issued an earlier week inside its window, still in force. */
export function liveProclamation(campaign: Campaign, state: StateId): ExecutiveOrderRecord | undefined {
  return missionRecords(campaign, state)
    .filter((record) => record.order === "order-insurrection-proclamation"
      && record.turn <= campaign.turn - 1 && record.turn >= campaign.turn - PROCLAMATION_VALID_TURNS && operative(campaign, record))
    .sort((a, b) => b.turn - a.turn)[0];
}

/** The act whose mission order sent a commitment, read off the order record it was sent under. */
function commitmentAct(campaign: Campaign, commitment: Commitment): LocaleActId | undefined {
  const record = commitment.authorizedBy ? campaign.orders.find((entry) => entry.id === commitment.authorizedBy) : undefined;
  return record?.subject?.kind === "locale-mission" ? record.subject.act : undefined;
}

/** The forces one act has standing in this state, under the order that sent them. */
function forceMissions(campaign: Campaign, state: StateId, act: LocaleActId): readonly Commitment[] {
  return Object.values(campaign.commitments).filter((commitment) => commitment.status === "active"
    && commitment.target.kind === "state" && commitment.target.id === state && commitmentAct(campaign, commitment) === act);
}

/**
 * §12406(3): the President "is unable with the regular forces to execute the
 * laws". Read as the regular forces tried: Insurrection Act troops on a
 * proclamation still in force, on their mission here at least two weeks under
 * an order still operating, and the unrest still at the level that sent them.
 * The troop act stands in for the Insurrection Act's own call on the militia
 * (10 U.S.C. §§252-253), which this order does not model separately.
 */
function regularForcesUnable(campaign: Campaign, state: StateId): boolean {
  if (!liveProclamation(campaign, state) || (unrestReaching(campaign, state)?.severity ?? 0) < INSURRECTION_SEVERITY.obstruction) return false;
  return forceMissions(campaign, state, "troops").some((commitment) => commitment.startedTurn <= campaign.turn - REGULAR_FORCES_WEEKS
    && commitment.authorizedBy !== undefined && prospectiveOrderAuthority(campaign, commitment.authorizedBy) === "operative");
}

export type FederalServiceGround = "invasion" | "rebellion" | "regular-forces";

/** §12406's occasions, as Trump v. Illinois (2025) reads them: never a declaration or a protest. */
export function federalServiceGround(campaign: Campaign, state: StateId): FederalServiceGround | undefined {
  const us = campaign.founding.nation;
  if (selectActiveConflicts(campaign).some((conflict) => conflict.defender === us)) return "invasion";
  if ((campaign.nations[us]?.stats.security.insurgencyPressure ?? 0) >= REBELLION_INSURGENCY_FLOOR) return "rebellion";
  return regularForcesUnable(campaign, state) ? "regular-forces" : undefined;
}

/**
 * One federalized Guard and one troop mission per state, never both ordered in
 * the same week: a second order stacks cost and risk on a mission already
 * there, not an answer the first one lacked.
 */
function stackedMission(campaign: Campaign, state: StateId, act: "federalize" | "troops"): boolean {
  const other = act === "federalize" ? "troops" : "federalize";
  return forceMissions(campaign, state, act).length > 0
    || forceMissions(campaign, state, other).some((commitment) => commitment.startedTurn === campaign.turn);
}

/** The text after "This needs " for each refused force act, citing the law that closes it. */
export const LOCALE_REFUSALS = {
  federalize: "an invasion, a rebellion, or an Insurrection Act mission here that the regular forces have not been able to carry out: 10 U.S.C. §12406(3), which Trump v. Illinois (2025) reads as reaching only where the military could legally execute the laws and could not do it. A declaration or a protest is none of them",
  proclaim: "one of the Insurrection Act's occasions: the governor's request (§251), obstruction of a federal court's order that the state has let stand (§252), or violence denying rights the state will not protect (§253)",
  troops: "a proclamation ordering the insurgents to disperse, issued an earlier week and still in force (10 U.S.C. §254). Without it, the Posse Comitatus Act (18 U.S.C. §1385) bars the armed forces from executing the laws",
  surveil: "a FISA or Title III court order, the exclusive means for electronic surveillance (50 U.S.C. §1812), and the Attorney General's procedures for collection on U.S. persons (Executive Order 12333 §2.3). No presidential order supplies either; set an investigative priority instead",
  "surveil-under-order": "a FISA or Title III order granted for this state and still in force (50 U.S.C. §1812). Seek one from the court first",
  disorder: "unrest in the state: federal force and collection answer disorder, not a disaster",
  stacked: "no mission already in force here: one federalized Guard and one troop mission to a state, never both ordered the same week",
} as const;

/** The signing gate a mission order holds for itself, so a direct signature cannot skip the act's predicate. */
export function missionOrderRefusal(campaign: Campaign, orderId: string, subject?: OrderSubject): string | undefined {
  if (subject?.kind !== "locale-mission" || !campaign.states[subject.state]) return "a state this mission is aimed at";
  if (missionOrderId(subject.act, subject.ground) !== orderId) return "a mission this order carries";
  const state = subject.state;
  if (subject.act === "property-surge" || subject.act === "task-force")
    return unrestReaching(campaign, state) ? undefined : LOCALE_REFUSALS.disorder;
  if (subject.act === "federalize") {
    if (!federalServiceGround(campaign, state)) return LOCALE_REFUSALS.federalize;
    return stackedMission(campaign, state, "federalize") ? LOCALE_REFUSALS.stacked : undefined;
  }
  if (subject.act === "proclaim")
    return subject.ground && insurrectionGrounds(campaign, state)[subject.ground] ? undefined : LOCALE_REFUSALS.proclaim;
  if (subject.act === "troops") {
    const proclaimed = liveProclamation(campaign, state)?.subject;
    if (proclaimed?.kind !== "locale-mission" || proclaimed.ground !== subject.ground) return LOCALE_REFUSALS.troops;
    return stackedMission(campaign, state, "troops") ? LOCALE_REFUSALS.stacked : undefined;
  }
  return undefined;
}

const PRIORITY_FLAG = "investigative-priority";
const STATE_SET: ReadonlySet<string> = new Set(STATE_IDS);

/** The flag a carried investigative priority leaves on a state; mission attention reads its turn-stamped marker. */
export function investigativePriorityFlag(state: StateId): string {
  return `${PRIORITY_FLAG}:${state}`;
}

/** The weeks a carried priority was set in this state, newest first. */
function priorityTurns(campaign: Campaign, state: StateId): readonly number[] {
  const prefix = `flagset:${investigativePriorityFlag(state)}:`;
  return Object.keys(campaign.player.flags)
    .filter((key) => key.startsWith(prefix) && campaign.player.flags[key])
    .map((key) => Number(key.slice(prefix.length)))
    .filter((turn) => Number.isInteger(turn))
    .sort((a, b) => b - a);
}

export type LiveLocaleMission = {
  readonly act: LocaleActId;
  readonly recordId?: string;
  readonly sinceTurn: number;
  readonly status: ProspectiveOrderAuthority;
};

function missionWeeks(act: LocaleActId): number {
  return MISSION_WEEKS[act] ?? 0;
}

/** Every federal mission in this state still inside its window, with whether its order still operates. */
export function liveLocaleMissions(campaign: Campaign, state: StateId): readonly LiveLocaleMission[] {
  const records = missionRecords(campaign, state)
    .filter((record) => campaign.turn - record.turn < missionWeeks(record.subject.act))
    .map((record): LiveLocaleMission => ({ act: record.subject.act, recordId: record.id, sinceTurn: record.turn,
      status: prospectiveOrderAuthority(campaign, record.id) }));
  const priorities = priorityTurns(campaign, state)
    .filter((turn) => campaign.turn - turn < missionWeeks("priority"))
    .slice(0, 1)
    .map((turn): LiveLocaleMission => ({ act: "priority", sinceTurn: turn, status: "operative" }));
  return [...records, ...priorities].sort((a, b) => b.sinceTurn - a.sinceTurn);
}

/** The heaviest live mission weight in each state that has one. */
function missionWeights(campaign: Campaign): ReadonlyMap<StateId, number> {
  const weights = new Map<StateId, number>();
  const credit = (state: StateId, weight: number) => weights.set(state, Math.max(weights.get(state) ?? 0, weight));
  for (const record of campaign.orders) {
    if (record.subject?.kind !== "locale-mission") continue;
    const mission = MISSION_ATTENTION[record.subject.act];
    if (!mission || record.subject.act === "federalize" || record.subject.act === "troops") continue;
    if (campaign.turn - record.turn < mission.weeks && operative(campaign, record)) credit(record.subject.state, mission.attention);
  }
  for (const commitment of Object.values(campaign.commitments)) {
    if (commitment.status !== "active" || commitment.target.kind !== "state" || !commitment.authorizedBy) continue;
    const record = campaign.orders.find((entry) => entry.id === commitment.authorizedBy);
    const mission = record?.subject?.kind === "locale-mission" ? MISSION_ATTENTION[record.subject.act] : undefined;
    if (record && mission && operative(campaign, record)) credit(commitment.target.id as StateId, mission.attention);
  }
  const priority = MISSION_ATTENTION.priority!;
  const prefix = `flagset:${PRIORITY_FLAG}:`;
  for (const key of Object.keys(campaign.player.flags)) {
    if (!key.startsWith(prefix) || !campaign.player.flags[key]) continue;
    const [state, turn] = key.slice(prefix.length).split(":");
    if (STATE_SET.has(state!) && campaign.turn - Number(turn) < priority.weeks) credit(state as StateId, priority.attention);
  }
  return weights;
}

/**
 * What federal missions are worth to one unrest condition at home, 0..1.
 *
 * A placed condition takes the heaviest mission in its state. National unrest
 * is answered only as far as the missions reach the people living through it,
 * so each state's mission counts by its share of the population.
 */
export function missionAttention(campaign: Campaign, condition: NationCondition): number {
  if (condition.nation !== campaign.founding.nation || condition.kind !== UNREST) return 0;
  const weights = missionWeights(campaign);
  if (weights.size === 0) return 0;
  if (condition.state) return weights.get(condition.state) ?? 0;
  const total = Object.values(campaign.states).reduce((sum, runtime) => sum + (runtime?.population ?? 0), 0);
  if (total <= 0) return 0;
  const reached = [...weights].reduce((sum, [state, weight]) => sum + weight * ((campaign.states[state]?.population ?? 0) / total), 0);
  return Math.min(1, Math.round(reached * 10000) / 10000);
}
