import { applyImpactEvent } from "./impact-lifecycle.js";
import { applyBorderIncident } from "./border-incidents.js";
import { applyBlockade } from "./blockades.js";
import { applyNpcTempo } from "./npc-tempo.js";
import { applyHullLoss } from "./hull-losses.js";
import { applyPopulationToll } from "./vitals.js";
import { applyMilitaryConstructionProject } from "./military-construction.js";
import { applyOffshoreLeaseSale } from "./offshore-leasing.js";
import { applyCleanPowerPurchase } from "./clean-power-purchasing.js";
import { applyBlockedAsset } from "./blocked-assets.js";
import type { NationId, Relationship } from "@admin/world";
import { applyOversight } from "./oversight.js";
import { bookUsDebt } from "./national-books.js";
import { applyAppropriation, applyCapRaise, applyCommitment, applyCondition, applyCourtCase, applyCourtProceeding, applyEmergency, applyExternalEmergency, applyFeed, applyFundingLapse, applyOrderFraming, applyPendingRule, applyPursuit, applySolicitorGeneral } from "./record-effects.js";
import type { AppropriationEffect, CapRaiseEffect, CommitmentEffect, ConditionEffect, EmergencyEffect, FundingLapseEffect, OrderFramingEffect, PendingRuleEffect, PursuitEffect } from "./record-effects.js";
export type { AppropriationEffect, CapRaiseEffect, CommitmentEffect, ConditionEffect, EmergencyEffect, FundingLapseEffect, OrderFramingEffect, PendingRuleEffect, PursuitEffect };
import { relationshipKey as keyOf, type ActionRecord, type Campaign, type CityRuntime, type EffectActor, type FlagId, type GameDate, type MetricSet, type NationRuntime, type PublicMood, type RelationshipGraph } from "./state.js";
import { applyPerson } from "./person-effects.js";
import { applyMoodDeltas, polarize, recomputeApproval, revertPolarization } from "./opinion.js";
import { accumulateAlignment } from "./alignment.js";
import { applyStateGeography } from "./state-effects.js";
import { applyCohort, type CohortEffect } from "./demos.js";
import { applyTrade, type TradeEffect } from "./trade-effects.js";
import { applyInstitution, applyNomination, type InstitutionEffect, type NominationEffect } from "./institution-effects.js";
import { seatCabinetOffice } from "./institutions.js";
import { applyGodMode, carryGodMode } from "./god-effects.js";
import { applyRules } from "./rules-effects.js";
import { applyScenarioFamily } from "./scenario-family-effects.js";
import {
  applyAssessment,
  applyCommand,
  applyFinding,
  applyIntelligence,
  applyWarPowers,
} from "./security-effects.js";
import { currentEventId, enterFold, stampFor, type CausalId, type CausalProvenance, type CausalStamp } from "./causality.js";
import { applyTie, settleFavorsOnBill } from "./ties.js";
import { applyCourtLimitedRelief, applyOrderRemedy } from "./order-remedy.js";
import { recordStatLineage } from "./order-lineage.js";
import { applyPledge } from "./pledges.js";
import { applyForecast } from "./projection-record.js";
import { applyCase } from "./case-effects.js";
import { applyDocket } from "./docket-effects.js";
import type { CycleEffect } from "./business-cycle.js";
import { applyExternalShock, shockEffect } from "./external-shocks.js";
import { applyLeadership, applyMarkets, applyMembership, applyIndictment, applyMunitions, applyRegime } from "./world-effects.js";

export type { CohortEffect };
export type { InstitutionEffect, NominationEffect, TradeEffect };
export type { CausalProvenance, CausalStamp };
// The vocabulary lives beside this file; consumers still import every effect
// shape from here, because `apply()` is what they are shapes for.
export * from "./effect-types.js";
import type {
  ActingEffect,
  AlignmentEffect,
  AttentionEffect,
  BillEffect,
  BooksEffect,
  BudgetEffect,
  CabinetAgendaEffect,
  CabinetEffect,
  ChoiceBorrowingEffect,
  CityEffect,
  CongressEffect,
  ConflictEffect,
  DebtLimitEffect,
  DeepPartial,
  Effect,
  EffectPacket,
  FlagEffect,
  IssuedActEffect,
  MacroStateEffect,
  MetricEffect,
  NationStatEffect,
  OpinionEffect,
  OperatorEffect,
  OrderEffect,
  OrderReviewEffect,
  OrderRescissionEffect,
  PolicyEffect,
  PressEffect,
  RelationshipEffect,
  RelationshipScalars,
  RemovalEffect,
  SectorEffect,
  StateEffect,
  TermClockEffect,
  TreatyEffect,
} from "./effect-types.js";

// apply() is the only state mutation
// entry point. Every subsystem (actions, conversations, simulate, operators,
// god mode) produces an EffectPacket instead of touching Campaign directly.

function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return patch as unknown as T;
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    result[key] = deepMerge((base as Record<string, unknown>)[key], value as never);
  }
  return result as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Budget authority is the one metric with no natural ceiling — the
// appropriation decides how high it goes, not the scale — and the one with a
// hard floor at zero. A government cannot be overdrawn: an obligation in excess
// of the available appropriation is void, so what a cost larger than the
// authority buys is a refusal, never a negative balance. The rest are 0..1
// shares.
function clampMetric(key: keyof MetricSet, value: number): number {
  return key === "treasury" ? Math.max(0, value) : clamp(value, 0, 1);
}

function applyMetric(state: Campaign, effect: MetricEffect): Campaign {
  const merged: { -readonly [K in keyof MetricSet]: number } = { ...state.player.metrics };
  for (const [key, delta] of Object.entries(effect.deltas) as [keyof MetricSet, number][]) {
    // The headline is settled from the public at the end of the packet
    // (`recomputeApproval`), never nudged — any attempted movement is
    // recomputed away. A score an effect can set is a score nothing explains.
    if (key === "approval") continue;
    // Readiness is not a panel number. It is the force itself: the one figure
    // the military and assistance rungs gate on, and the one time restores. A
    // bill written on the metric alone would spend something no gate reads and
    // nothing regenerates, so it is routed onto the stat below and mirrored
    // back from there.
    if (key === "militaryReadiness") continue;
    merged[key] = clampMetric(key, merged[key] + delta);
  }
  const moved = { ...state, player: { ...state.player, metrics: merged } };
  return spendReadiness(moved, effect.deltas.militaryReadiness);
}

/**
 * A declared readiness cost, charged where the force actually is.
 *
 * Only the player emits metric effects (`actorMetrics`, instruments.ts), so the
 * nation to charge is always the one the campaign is played from.
 */
function spendReadiness(state: Campaign, delta: number | undefined): Campaign {
  if (delta === undefined || delta === 0) return state;
  const current = state.nations[state.founding.nation];
  if (!current) throw new Error(`no nation ${state.founding.nation} to charge readiness against`);
  return applyNationStat(state, {
    kind: "nationStat",
    nation: state.founding.nation,
    setStats: { military: { readiness: clamp(current.stats.military.readiness + delta, 0, 1) } },
  });
}

// Signed deltas (after - before), not the post-change absolute values — this
// is "cost", how much each metric moved, which is what a driver breadcrumb
// (packages/engine/src/metrics.ts) and removal pressure (removal.ts) both
// need the sign of.
function diffMetrics(before: MetricSet, after: MetricSet): Partial<Record<keyof MetricSet, number>> {
  const diff: Partial<Record<keyof MetricSet, number>> = {};
  for (const key of Object.keys(after) as (keyof MetricSet)[]) {
    if (before[key] !== after[key]) diff[key] = after[key] - before[key];
  }
  return diff;
}

/** The same signed diff as `diffMetrics`, over the six things a public judges on. */
function diffMood(before: PublicMood, after: PublicMood): Partial<Record<keyof PublicMood, number>> {
  const diff: { -readonly [K in keyof PublicMood]?: number } = {};
  for (const key of Object.keys(after) as (keyof PublicMood)[]) {
    if (before[key] !== after[key]) diff[key] = after[key] - before[key];
  }
  return diff;
}

/**
 * People who are not alive after this packet, counted across every nation.
 *
 * Summed over the whole board rather than the player's own nation, because a
 * toll declared as borne abroad reduces the population of the country it
 * happened in — and a strike whose dead were foreign is still a thing this
 * administration did and should be able to read back.
 *
 * Growth is not netted off: only nations that shrank are counted, so a turn
 * where one country lost people and another gained them reports the loss rather
 * than a smaller number that describes neither.
 */
function livesLost(before: Campaign, after: Campaign): number {
  let lost = 0;
  for (const [id, runtime] of Object.entries(after.nations) as [NationId, NationRuntime][]) {
    const previous = before.nations[id]?.stats.demography.population;
    const current = runtime.stats.demography.population;
    if (previous !== undefined && current < previous) lost += previous - current;
  }
  return lost;
}

// The zod ranges from packages/world's Relationship schema. apply() clamps to
// them so no caller can write a campaign that would fail dataset validation.
const RELATIONSHIP_RANGES: Readonly<Record<keyof RelationshipScalars, readonly [number, number]>> = {
  trust: [-1, 1],
  alignment: [-1, 1],
  tension: [0, 1],
  tradeDependence: [0, 1],
  militaryThreat: [0, 1],
};

// Relationship graphs that the in-flight `apply()` owns outright.
//
// A graph lands here only when apply() has just copied it from the incoming
// campaign, which means nothing outside that one packet can reach it: the
// caller still holds the original, and the copy is not returned until the
// packet is finished. Writing into an owned copy in place is therefore
// indistinguishable, from any observer, from rebuilding it per effect — and
// it is what keeps a packet that moves every directed pair at once (grudge
// decay writes all 1,990 of them in a single packet) from copying the whole
// graph once per pair.
const packetOwnedGraphs = new WeakSet<RelationshipGraph>();

function writeRelationship(state: Campaign, key: string, next: Relationship): Campaign {
  if (!packetOwnedGraphs.has(state.relationships)) {
    return { ...state, relationships: { ...state.relationships, [key]: next } };
  }
  // The readonly is dropped only for a graph this packet owns; see above.
  (state.relationships as Record<string, Relationship>)[key] = next;
  return state;
}

function applyRelationship(state: Campaign, effect: RelationshipEffect): Campaign {
  const key = keyOf(effect.from, effect.to);
  const current = state.relationships[key];
  if (!current) throw new Error(`no relationship ${effect.from} -> ${effect.to} to apply an effect to`);
  const scalars: { -readonly [K in keyof RelationshipScalars]: number } = {
    trust: current.trust,
    alignment: current.alignment,
    tension: current.tension,
    tradeDependence: current.tradeDependence,
    militaryThreat: current.militaryThreat,
  };
  for (const [field, range] of Object.entries(RELATIONSHIP_RANGES) as [keyof RelationshipScalars, readonly [number, number]][]) {
    const absolute = effect.set?.[field];
    const delta = effect.deltas?.[field];
    if (absolute === undefined && delta === undefined) continue;
    const base = absolute ?? scalars[field];
    scalars[field] = clamp(base + (delta ?? 0), range[0], range[1]);
  }
  const next = {
    ...current,
    ...scalars,
    treaties: effect.addTreaty ? [...current.treaties, effect.addTreaty] : current.treaties,
    grudges: effect.replaceGrudges
      ? [...effect.replaceGrudges]
      : effect.addGrudge
        ? [...current.grudges, effect.addGrudge]
        : current.grudges,
    history: effect.addHistory ? [...current.history, effect.addHistory] : current.history,
  };
  return writeRelationship(state, key, next);
}

export function applyNationStat(state: Campaign, effect: NationStatEffect): Campaign {
  const current = state.nations[effect.nation];
  if (!current) throw new Error(`no nation ${effect.nation} to apply an effect to`);
  const next: NationRuntime = {
    ...current,
    stats: deepMerge(current.stats, effect.setStats),
    traits: deepMerge(current.traits, effect.setTraits),
  };
  const moved = { ...state, nations: { ...state.nations, [effect.nation]: next } };
  const recorded = recordStatLineage(moved, effect, current, next);
  return effect.nation === state.founding.nation
    ? mirrorReadiness(recorded, current.stats.military.readiness, next.stats.military.readiness)
    : recorded;
}

/**
 * Keep the panel's readiness figure and the force it describes one number.
 *
 * The ladder, the capacity phase, a war's attrition and a standing defense
 * program all write the nation stat, because the rules run identically for
 * every capital and only the player has metrics at all. Mirroring the movement
 * point for point is what stops the reading on the Desk from being a second,
 * slowly diverging account of the same force — the figure the player is shown
 * is the figure the gate reads.
 */
function mirrorReadiness(state: Campaign, before: number, after: number): Campaign {
  if (after === before) return state;
  const metrics = state.player.metrics;
  const projected = clamp(metrics.militaryReadiness + (after - before), 0, 1);
  if (projected === metrics.militaryReadiness) return state;
  return {
    ...state,
    player: {
      ...state.player,
      metrics: { ...metrics, militaryReadiness: projected },
    },
  };
}

function nextAdminLean(current: CityRuntime, delta: number | undefined): number | undefined {
  if (current.adminLean === undefined) return undefined;
  if (delta === undefined) return current.adminLean;
  return clamp(Math.round((current.adminLean + delta) * 1000) / 1000, -1, 1);
}

function nextCityRuntime(state: Campaign, current: CityRuntime, effect: CityEffect): CityRuntime {
  const employment = Math.max(0, current.employment + (effect.deltas?.employment ?? 0));
  const taxBase = Math.max(0, current.taxBase + (effect.deltas?.taxBase ?? 0));
  const taxHolidayTurns =
    effect.set?.taxHolidayTurns === undefined ? current.taxHolidayTurns : Math.max(0, effect.set.taxHolidayTurns);
  const adminLean = nextAdminLean(current, effect.deltas?.adminLean);
  const demShare =
    current.demShare === undefined && effect.deltas?.demShare === undefined
      ? undefined
      : clamp((current.demShare ?? current.base.demShare ?? 0) + (effect.deltas?.demShare ?? 0), 0, 1);
  return {
    ...current,
    employment,
    taxBase,
    taxHolidayTurns,
    lastMovedTurn: state.turn,
    lastMovedReason: effect.reason,
    ...(adminLean === undefined ? {} : { adminLean }),
    ...(demShare === undefined ? {} : { demShare }),
  };
}

const LABOR_FORCE_RATE = 0.62;

function rollupCityEmployment(state: Campaign, city: CityRuntime, deltaJobs: number): Campaign {
  if (deltaJobs === 0) return state;
  const runtime = state.nations[city.base.nation];
  if (!runtime) throw new Error(`no nation ${city.base.nation} to apply an effect to`);
  const force = Math.round(runtime.stats.demography.population * LABOR_FORCE_RATE);
  if (force <= 0) return state;
  return applyExternalShock(state, shockEffect(state, city.base.nation, "jobs", { unemployment: -deltaJobs / force }));
}

function applyCity(state: Campaign, effect: CityEffect): Campaign {
  const current = state.cities[effect.city];
  if (!current) throw new Error(`no city ${effect.city} to apply an effect to`);
  const next = nextCityRuntime(state, current, effect);
  const withCity = { ...state, cities: { ...state.cities, [effect.city]: next } };
  return rollupCityEmployment(withCity, next, next.employment - current.employment);
}

function applyState(state: Campaign, effect: StateEffect): Campaign {
  const current = state.states[effect.state];
  if (!current) throw new Error(`no state ${effect.state} to apply an effect to`);
  const lean = clamp(Math.round((current.lean + (effect.deltas?.lean ?? 0)) * 1000) / 1000, -1, 1);
  const population = Math.max(0, current.population + (effect.deltas?.population ?? 0));
  return {
    ...state,
    states: { ...state.states, [effect.state]: applyStateGeography({ ...current, lean, population }, effect) },
  };
}

function applySector(state: Campaign, effect: SectorEffect): Campaign {
  const slice = state.sectors[effect.nation];
  const current = slice?.[effect.sector];
  if (!current) throw new Error(`no sector ${effect.sector} in ${effect.nation} to apply an effect to`);
  const next = {
    ...current,
    employment: Math.max(0, current.employment + (effect.deltas?.employment ?? 0)),
    laborPressure: clamp(current.laborPressure + (effect.deltas?.laborPressure ?? 0), 0, 1),
    mix: clamp(current.mix + (effect.deltas?.mix ?? 0), 0, 1),
  };
  const withSector = {
    ...state,
    sectors: { ...state.sectors, [effect.nation]: { ...slice, [effect.sector]: next } },
  };
  return rollupSector(withSector, effect.nation, current, next);
}

function rollupSector(
  state: Campaign,
  nation: NationId,
  before: { employment: number; laborPressure: number },
  after: { employment: number; laborPressure: number },
): Campaign {
  const runtime = state.nations[nation];
  if (!runtime) throw new Error(`no nation ${nation} to apply an effect to`);
  const force = Math.round(runtime.stats.demography.population * LABOR_FORCE_RATE);
  const jobs = after.employment - before.employment;
  // Jobs reach the rate through the drift phase, dated, so `macro.ts` stays
  // the one writer of unemployment and a reading can say which round moved it.
  const hired = force > 0 && jobs !== 0 ? applyExternalShock(state, shockEffect(state, nation, "jobs", { unemployment: -jobs / force })) : state;
  const protest = clamp(
    runtime.stats.politics.protestPressure + (after.laborPressure - before.laborPressure) * 0.35,
    0,
    1,
  );
  return applyNationStat(hired, {
    kind: "nationStat",
    nation,
    setStats: { politics: { protestPressure: protest } },
  });
}

function applyFlag(state: Campaign, effect: FlagEffect): Campaign {
  const flags: Record<FlagId, boolean> = { ...state.player.flags };
  for (const flag of effect.set ?? []) flags[flag] = true;
  for (const flag of effect.clear ?? []) flags[flag] = false;
  return { ...state, player: { ...state.player, flags } };
}

function applyAttention(state: Campaign, effect: AttentionEffect): Campaign {
  const deferrals: Record<string, GameDate> = { ...state.deferrals, ...(effect.defer ?? {}) };
  for (const id of effect.resume ?? []) delete deferrals[id];
  return { ...state, deferrals };
}

function applyIssuedAct(state: Campaign, effect: IssuedActEffect): Campaign {
  const act = effect.set.kind === "instrument" ? { ...effect.set, causedBy: effect.set.causedBy ?? currentEventId() } : effect.set;
  return { ...state, issuedActs: { ...(state.issuedActs ?? {}), [act.id]: act } };
}

// Delegates to the one writer that keeps the chair and the body it runs in
// agreement. This used to write `player.cabinet` alone, which is why a seated
// Secretary of State sat above a Department of State with nobody in the chair.
function applyCabinet(state: Campaign, effect: CabinetEffect): Campaign {
  return seatCabinetOffice(state, effect.role, effect.person);
}

function applyPolicy(state: Campaign, effect: PolicyEffect): Campaign {
  if (effect.nation !== undefined && effect.nation !== state.founding.nation) {
    const held = state.governments[effect.nation];
    if (!held) throw new Error(`no government for ${effect.nation} to legislate in`);
    return {
      ...state,
      governments: { ...state.governments, [effect.nation]: { ...held, [effect.domain]: effect.stance } },
    };
  }
  return {
    ...state,
    player: { ...state.player, policies: { ...state.player.policies, [effect.domain]: effect.stance } },
  };
}

function applyBudget(state: Campaign, effect: BudgetEffect): Campaign {
  return { ...state, player: { ...state.player, budget: { ...effect.allocation } } };
}

function applyOperator(state: Campaign, effect: OperatorEffect): Campaign {
  const removeIds = new Set(effect.removeIds ?? []);
  const remaining = state.operators.filter((op) => !removeIds.has(op.id));
  return { ...state, operators: [...remaining, ...(effect.spawn ?? [])] };
}

function applyAlignment(state: Campaign, effect: AlignmentEffect): Campaign {
  return { ...state, player: { ...state.player, alignments: accumulateAlignment(state.player.alignments, effect.pull) } };
}

function applyOpinion(state: Campaign, effect: OpinionEffect): Campaign {
  const moved = applyMoodDeltas(state.player.opinion, effect.deltas);
  // Both moves are relative, so a packet that divided and reverted carries
  // both facts. The headline that follows from all of it is settled once, at
  // the end of the packet, in `apply()`.
  const divided = effect.polarize ? polarize(moved, effect.polarize) : moved;
  const opinion = effect.heal ? revertPolarization(divided, effect.heal) : divided;
  const next = { ...state, player: { ...state.player, opinion } };
  return effect.salience ? { ...next, salienceMemory: effect.salience } : next;
}

function applyRemoval(state: Campaign, effect: RemovalEffect): Campaign {
  return { ...state, removal: effect.arc };
}

function applyActing(state: Campaign, effect: ActingEffect): Campaign {
  const actings = { ...(state.actings ?? {}) };
  // A seating with no person is how the arrangement ends, so the key is removed
  // rather than set to undefined: an undefined value would survive the save as a
  // seat that is neither filled nor absent.
  if (effect.person === undefined) delete actings[effect.seat];
  else actings[effect.seat] = effect.person;
  return { ...state, actings };
}

function applyCabinetAgenda(state: Campaign, effect: CabinetAgendaEffect): Campaign {
  return { ...state, cabinetAgenda: effect.set };
}

function applyCycle(state: Campaign, effect: CycleEffect): Campaign {
  return {
    ...state,
    cycles: {
      ...state.cycles,
      [effect.nation]: { phase: effect.phase, amplitude: effect.amplitude, enteredTurn: effect.enteredTurn },
    },
  };
}

function applyMacroState(state: Campaign, effect: MacroStateEffect): Campaign {
  return { ...state, macro: { ...state.macro, [effect.nation]: effect.set } };
}

function applyBooks(state: Campaign, effect: BooksEffect): Campaign {
  return { ...state, books: { ...state.books, [effect.nation]: effect.set } };
}

function applyDebtLimit(state: Campaign, effect: DebtLimitEffect): Campaign {
  return { ...state, debtLimit: effect.set };
}

/**
 * The President's own borrowing lands on the founding nation's stock through
 * the one step every US debt write takes, so nothing downstream can tell a
 * reply's or an order's borrowing from the week's settlement. It is also the
 * President's own added stock, so its interest comes out of the discretionary
 * line the way a program's borrowing does, rather than out of new borrowing.
 */
function applyChoiceBorrowing(state: Campaign, effect: ChoiceBorrowingEffect): Campaign {
  const nation = state.founding.nation;
  const current = state.nations[nation];
  if (!current) throw new Error(`no founding nation ${nation} to borrow for`);
  const was = current.stats.economy.debt;
  const debt = bookUsDebt(was, 0, effect.amount);
  const withDebt = applyNationStat(state, { kind: "nationStat", nation, setStats: { economy: { debt } } });
  const books = state.books?.[nation];
  if (!books) return withDebt;
  const booked = withDebt.nations[nation]!.stats.economy.debt - was;
  return { ...withDebt, books: { ...withDebt.books, [nation]: { ...books, choiceDebt: (books.choiceDebt ?? 0) + booked } } };
}

function applyConflict(state: Campaign, effect: ConflictEffect): Campaign {
  return { ...state, conflicts: { ...state.conflicts, [effect.set.id]: effect.set } };
}

function applyOrder(state: Campaign, effect: OrderEffect): Campaign {
  return { ...state, orders: [...state.orders, effect.set] };
}

function applyCongress(state: Campaign, effect: CongressEffect): Campaign {
  return { ...state, congress: effect.set };
}

function applyBill(state: Campaign, effect: BillEffect): Campaign {
  const withBill = { ...state, bills: { ...state.bills, [effect.set.id]: effect.set } };
  const bill = effect.set;
  if (bill.status !== "law" && bill.status !== "dead") return withBill;
  return settleFavorsOnBill(withBill, bill.id, bill.status === "law" ? "repaid" : "defaulted", withBill.turn);
}

function applyTermClock(state: Campaign, effect: TermClockEffect): Campaign {
  return { ...state, termClock: effect.set };
}

function applyPress(state: Campaign, effect: PressEffect): Campaign {
  return { ...state, press: effect.set };
}

function applyTreaty(state: Campaign, effect: TreatyEffect): Campaign {
  return { ...state, treaties: { ...state.treaties, [effect.set.id]: effect.set } };
}

function applyOrderReview(state: Campaign, effect: OrderReviewEffect): Campaign {
  const found = state.orders.some((record) => record.id === effect.id);
  if (!found) throw new Error(`no executive order ${effect.id} to rule on`);
  return {
    ...state,
    orders: state.orders.map((record) => (record.id === effect.id ? { ...record, review: effect.review } : record)),
  };
}

function applyOrderRescission(state: Campaign, effect: OrderRescissionEffect): Campaign {
  if (!state.orders.some((record) => record.id === effect.id)) throw new Error(`no executive order ${effect.id} to end`);
  return { ...state, orders: state.orders.map((record) => record.id === effect.id
    ? { ...record, rescindedTurn: effect.turn, endReason: effect.reason } : record) };
}

type HandlerTable = { [K in Effect["kind"]]: (state: Campaign, effect: Extract<Effect, { kind: K }>) => Campaign };
// Built on first use, not at module scope: handlers come from modules that
// import this one back, and under a cycle an import read during evaluation can
// be undefined — surfacing as "no handler registered for kind X" on a kind
// plainly registered below.
let handlerTable: HandlerTable | undefined;
function handlers(): HandlerTable {
  handlerTable ??= {
    impactEvent: applyImpactEvent,
    borderIncident: applyBorderIncident,
    blockade: applyBlockade,
    npcTempo: applyNpcTempo,
    hullLoss: applyHullLoss,
    metric: applyMetric,
    relationship: applyRelationship,
    nationStat: applyNationStat,
    populationToll: applyPopulationToll,
    city: applyCity,
    state: applyState,
    sector: applySector,
    flag: applyFlag,
    attention: applyAttention,
    docket: applyDocket,
    case: applyCase,
    issuedAct: applyIssuedAct,
    person: applyPerson,
    tie: applyTie,
    cabinet: applyCabinet,
    policy: applyPolicy,
    budget: applyBudget,
    operator: applyOperator,
    alignment: applyAlignment,
    opinion: applyOpinion,
    removal: applyRemoval,
    acting: applyActing,
    cabinetAgenda: applyCabinetAgenda,
    cycle: applyCycle,
    macroState: applyMacroState,
    externalShock: applyExternalShock,
    books: applyBooks,
    debtLimit: applyDebtLimit,
    choiceBorrowing: applyChoiceBorrowing,
    cohort: applyCohort,
    conflict: applyConflict,
    institution: applyInstitution,
    nomination: applyNomination,
    trade: applyTrade,
    command: applyCommand,
    intelligence: applyIntelligence,
    assessment: applyAssessment,
    finding: applyFinding,
    warPowers: applyWarPowers,
    scenarioFamily: applyScenarioFamily,
    commitment: applyCommitment,
    condition: applyCondition,
    emergency: applyEmergency,
    externalEmergency: applyExternalEmergency,
    militaryConstructionProject: applyMilitaryConstructionProject,
    offshoreLeaseSale: applyOffshoreLeaseSale,
    cleanPowerPurchase: applyCleanPowerPurchase,
    blockedAsset: applyBlockedAsset,
    pursuit: applyPursuit,
    order: applyOrder,
    congress: applyCongress,
    bill: applyBill,
    termClock: applyTermClock,
    press: applyPress,
    treaty: applyTreaty,
    orderReview: applyOrderReview,
    orderRescission: applyOrderRescission,
    orderRemedy: applyOrderRemedy,
    courtLimitedRelief: applyCourtLimitedRelief,
    orderFraming: applyOrderFraming,
    pendingRule: applyPendingRule,
    courtCase: applyCourtCase,
    courtProceeding: applyCourtProceeding,
    solicitorGeneral: applySolicitorGeneral,
    capRaise: applyCapRaise,
    fundingLapse: applyFundingLapse,
    appropriation: applyAppropriation,
    godMode: applyGodMode,
    rules: applyRules,
    oversight: applyOversight,
    pledge: applyPledge,
    forecast: applyForecast,
    markets: applyMarkets,
    munitions: applyMunitions,
    leadership: applyLeadership,
    membership: applyMembership,
    regime: applyRegime,
    indictment: applyIndictment,
    feed: applyFeed,
  };
  return handlerTable;
}
function reduceEffects(state: Campaign, effects: readonly Effect[]): Campaign {
  return effects.reduce((acc, effect) => {
    const handler = handlers()[effect.kind];
    if (!handler) throw new Error(`no handler registered for effect kind "${effect.kind}"`);
    return handler(acc, effect as never);
  }, state);
}

/**
 * Fold a packet's effects, giving the fold a relationship graph it owns.
 *
 * Every intermediate campaign between two effects of one packet is private to
 * this fold — no caller is ever handed one — so the fold can copy the graph
 * once at the top and write into that copy, instead of rebuilding a
 * 1,990-entry record for each of the up to 1,990 relationship effects a single
 * packet can carry. Reads still see every earlier write in the packet, in the
 * order the effects were listed, so a second write to the same pair still
 * wins. Ownership is surrendered before the copy escapes, including on the way
 * out of a throw, so nothing can write to it once it is a caller's state.
 */
function foldEffects(state: Campaign, effects: readonly Effect[], eventId: CausalId): Campaign {
  const leaveFold = enterFold(eventId);
  try {
    if (!effects.some((effect) => effect.kind === "relationship")) return reduceEffects(state, effects);
    const owned: Record<string, Relationship> = { ...state.relationships };
    packetOwnedGraphs.add(owned);
    try {
      return reduceEffects({ ...state, relationships: owned }, effects);
    } finally {
      packetOwnedGraphs.delete(owned);
    }
  } finally {
    leaveFold();
  }
}

// Who may move the President's alignment. The axes are the record of what the
// President has chosen to stand for, so only a packet the President ordered, or
// one written from outside the fiction by god mode, may pull them. A packet the
// world wrote carries its alignment effect for whoever acted: an NPC's public
// statement is that government's position, not the President's, and a bill that
// becomes law unsigned or over a veto is Congress's act, so neither moves the
// President at all. Filtered here, by the packet's actor, rather than inside the
// handler, because the handler cannot see who ordered the effect it is folding.
const ALIGNMENT_ACTORS: ReadonlySet<EffectActor> = new Set<EffectActor>(["player", "developer"]);

function effectsFor(packet: EffectPacket): readonly Effect[] {
  if (ALIGNMENT_ACTORS.has(packet.actor)) return packet.effects;
  return packet.effects.filter((effect) => effect.kind !== "alignment");
}

// The only exported state mutator. Every packet must carry narration — a
// state change the game cannot explain to the player in fiction is a bug,
// not a feature — and every effect kind must have a registered handler; an
// unrecognized kind fails loudly rather than being silently dropped.
export function apply(state: Campaign, packet: EffectPacket): Campaign {
  if (!packet.narration.summary.trim()) {
    throw new Error("EffectPacket rejected: narration.summary is required");
  }

  // The headline is settled once, over the finished packet, rather than inside
  // the two handlers that happen to touch its inputs. Approval reads the mood,
  // the wars, the live conditions, the economy and the standing scandals, so a
  // packet that opens a war and moves no metric still changes what the country
  // thinks — and has to leave that on the ledger like anything else.
  // Stamped before the fold rather than after it, which is what makes the
  // graph deep rather than only wide: a handler creating a record that will
  // outlive this turn can write this id onto it, and the phase that acts on
  // that record months later can name this event as its cause. The id only
  // needs the ledger's length, the turn and the date, all of which are known
  // here before a single effect has run.
  const causal = stampFor(
    packet.source,
    packet.provenance,
    packet.turn,
    state.ledger.length,
    state.calendar,
  );
  const next = recomputeApproval(foldEffects(state, effectsFor(packet), causal.eventId));

  // Every metric that actually moved is surfaced on the ledger entry, tied
  // to this packet's narration — the breadcrumb a player-facing "why did this
  // move" reads from (packages/engine/src/metrics.ts).
  const metricsDiff = diffMetrics(state.player.metrics, next.player.metrics);
  // The other two halves of what a decision did, measured the same way and for
  // the same reason. A declared impact reaches the board as opinion movement and
  // as a country with fewer people in it, and neither is a metric — so before
  // this the one part of a decision the player could never review afterwards was
  // the part that killed somebody.
  const moodDiff = diffMood(state.player.opinion, next.player.opinion);
  const toll = livesLost(state, next);
  const ledgerEntry: ActionRecord = {
    turn: packet.turn,
    actor: packet.actor,
    description: packet.narration.summary,
    causal,
    ...(Object.keys(metricsDiff).length > 0 ? { cost: metricsDiff } : {}),
    ...(Object.keys(moodDiff).length > 0 ? { mood: moodDiff } : {}),
    ...(toll > 0 ? { toll } : {}),
    // Omitted rather than written as undefined: an explicit undefined does not
    // survive the JSON round trip a save is, so a reloaded entry would not have
    // the shape it was written with.
    ...(packet.commitment ? { commitment: packet.commitment } : {}),
    ...(packet.counsel ? { counsel: packet.counsel } : {}),
    ...(packet.institutional && packet.institutional.length > 0 ? { institutional: packet.institutional } : {}),
    ...(packet.assessment ? { assessment: packet.assessment } : {}),
    ...(packet.subjects?.length ? { subjects: packet.subjects } : {}),
    ...(packet.accounting ? { accounting: packet.accounting } : {}),
    ...(packet.background ? { background: true as const } : {}),
  };

  // The key is omitted rather than written as undefined for a campaign that has
  // never been touched: an explicit undefined does not survive a JSON save
  // round-trip, so the save would reload with a shape it was not written from.
  const godMode = carryGodMode(state, next, packet);
  return { ...next, ...(godMode ? { godMode } : {}), ledger: [...next.ledger, ledgerEntry] };
}
