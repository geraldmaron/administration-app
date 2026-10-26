import type { Charter, StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import type { CourtProceeding } from "./state-judiciary.js";
import type { LocaleActId } from "./locale-acts.js";
import { executiveOrder, type ExecutiveOrder } from "./orders.js";
import { constitutionalGround } from "./legislation.js";
import { strikeDownChance } from "./strike-odds.js";
import { doctrineShift } from "./background-docket.js";
import { DISTRICT_FORUM_READINGS, districtForumFor, districtStrikeChance } from "./lower-bench.js";
import { governorAssents } from "./locale-missions.js";

// Interim relief against a federal mission in one state.
//
// A rule that has not landed can be stayed before it binds anyone; a mission
// order lands the day it is signed, with officers or soldiers already on the
// street. What a plaintiff asks for there is a temporary restraining order and
// then a preliminary injunction, and under Winter v. NRDC (2008) the plaintiff
// must establish likely success on the merits, likely irreparable harm, a
// balance of equities in its favor and the public interest. Success and harm
// must both be shown, so the chance is their product rather than their sum. A
// state suing over its own Guard or its own streets brings a sovereign injury
// a private plaintiff does not, but only where its governor withheld assent: a
// state cannot be injured by help it asked for. The weights are game
// assumptions, not observed grant rates.

/**
 * How irreparable the harm a mission does reads to a court, 0..1. Soldiers in
 * the street most; a task force the governor invited, working cases beside the
 * state's own police, least.
 */
export const INTERIM_HARM: Readonly<Partial<Record<LocaleActId, number>>> = {
  troops: 0.9,
  federalize: 0.85,
  "immigration-operation": 0.7,
  "property-surge": 0.4,
  "task-force": 0.1,
  proclaim: 0.3,
};

/** What a state plaintiff's own sovereign injury adds to the chance, where the governor did not assent. */
export const STATE_PLAINTIFF_RELIEF = 0.1;
export const MAX_INTERIM_RELIEF = 0.9;
export const MIN_INTERIM_RELIEF = 0.05;

export type MissionInterimRelief = {
  /** The chance the court enjoins the mission order once the suit reaches interim relief. */
  readonly chance: number;
  /** The district court's modeled chance of setting the order aside on the merits. */
  readonly merits: number;
  readonly harm: number;
  readonly statePlaintiff: boolean;
};

const round4 = (value: number) => Math.round(value * 10000) / 10000 + 0;

function meritsChance(campaign: Campaign, charter: Charter, order: ExecutiveOrder, state: StateId, caseId: string,
  proceeding?: CourtProceeding): number {
  const ground = constitutionalGround(campaign, order.id);
  const legal = Math.max(0.02, Math.min(0.98, strikeDownChance(charter, order, undefined, ground) + doctrineShift(campaign, order.id)));
  const forum = DISTRICT_FORUM_READINGS.find((row) => row.id === proceeding?.lowerForum?.id)
    ?? districtForumFor(state, caseId, campaign.seed);
  return districtStrikeChance(legal, forum, order);
}

/**
 * The interim relief a suit against this mission order would win, or nothing
 * for an order that is not a mission order. Before a suit exists, pass whether
 * a state is expected to lead it; once filed, the proceeding says.
 */
export function missionInterimRelief(campaign: Campaign, charter: Charter, record: Pick<ExecutiveOrderRecord, "id" | "order" | "subject">,
  proceeding?: CourtProceeding, expectStatePlaintiff = false): MissionInterimRelief | undefined {
  if (record.subject?.kind !== "locale-mission") return undefined;
  const order = executiveOrder(record.order);
  if (!order) return undefined;
  const merits = meritsChance(campaign, charter, order, record.subject.state, `case:${record.id}`, proceeding);
  const harm = INTERIM_HARM[record.subject.act] ?? 0.5;
  const statePlaintiff = (proceeding ? proceeding.matter?.state !== undefined : expectStatePlaintiff)
    && !governorAssents(campaign.states[record.subject.state]?.governor);
  const chance = Math.max(MIN_INTERIM_RELIEF, Math.min(MAX_INTERIM_RELIEF,
    merits * (0.5 + 0.5 * harm) + (statePlaintiff ? STATE_PLAINTIFF_RELIEF : 0)));
  return { chance: round4(chance), merits: round4(merits), harm, statePlaintiff };
}
