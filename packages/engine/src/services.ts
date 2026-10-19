import type { NationId, RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { CLEARANCE_PER_ARRIVAL, institutionDef, type InstitutionId } from "./institutions.js";
import { selectWorkDelivery, type WorkDef, type WorkDelivery } from "./executive-work.js";
import { selectChairRunner } from "./appointments.js";
import { SERVICES } from "./service-catalog.js";
import { createRngStreams } from "./rng.js";
import { hasProspectiveOrderAuthority } from "./order-authority.js";

// A public service as case work: what arrives, what is decided, what comes back
// because it was decided wrong, what is abandoned, and how long the rest has
// been waiting.
//
// An institution's own backlog (`institutionTick`) is one number that drags its
// delivery figure. That is the right reading of a body's general load and the
// wrong one for a named service, where the questions are different: is the
// work being decided, is it being decided correctly, and is anyone waiting too
// long. Five things are kept apart here and never folded into one score —
// capacity (what the owner can process this week), output (decisions), quality
// (errors, lateness), refusals, and withdrawals — so a week that clears its
// backlog by refusing everything reads as what it is.
//
// Quantities are in a common unit: a normal week's intake is `WEEKLY_INTAKE`.
// The screen reads them as weeks of intake and as shares, never as a count of
// real claims, because the engine does not carry the real volumes.
//
// Only source quantities are stored (cases by age, errors on their way back,
// the last week's flows). Totals and rates are derived on read.

export type ServiceId =
  | "consular-visas"
  | "tax-returns"
  | "arms-transfers"
  | "disability-claims"
  | "federal-cases"
  | "farm-payments"
  | "export-licenses"
  | "wage-complaints"
  | "drug-applications"
  | "fair-housing-complaints"
  | "student-aid"
  | "disaster-assistance"
  | "drilling-permits";

/**
 * How a building cuts a late backlog when whoever runs the portfolio lets
 * the pressure decide: by refusing claims it has not weighed, or, where the
 * cases are prosecutions, by pushing defendants into pleas. `refusal` also
 * carries the share an ordinary week refuses on the merits.
 */
export type ServiceShortcut = { readonly kind: "refusal"; readonly share: number } | { readonly kind: "plea" };

/**
 * Cases waiting, by whole weeks waited: index 0 arrived this week, index `n`
 * has waited `n` weeks, and the last index holds everything that has waited
 * that long or longer. Kept by the week rather than in wide age bands so that
 * deciding the oldest first leaves exactly the right cases behind: a band that
 * assumed its cases were spread evenly across it would age a quarter of a
 * young queue past a month every week whether anyone had waited that long or
 * not.
 */
export type Cohorts = readonly number[];

/** The oldest week kept separately; anything older waits in the last cohort. */
export const OLDEST_COHORT = 26;

/** Where each display band ends, in weeks: under 4, 4 to 13, 13 to 26, 26 and over. */
export const AGE_BUCKET_EDGES: readonly [4, 13, 26] = [4, 13, 26];

export type ServiceDefinition = {
  readonly id: ServiceId;
  readonly name: string;
  /** What one case is, in prose: "applications", "claims". */
  readonly unit: string;
  /** The Secretary who answers for it. */
  readonly portfolio: RoleId;
  readonly work: WorkDef;
  /** A case that has waited this many weeks is late. One of the band edges, so a band is wholly late or wholly not. */
  readonly standardWeeks: 4 | 13 | 26;
  /**
   * The corner a late backlog tempts the building to cut. Only a service with
   * one reads its Secretary: their integrity decides whether the backlog is
   * cleared by deciding cases or by the shortcut. A service without one is
   * run by its owner alone, whose head is already in the owner's delivery.
   */
  readonly shortcut?: ServiceShortcut;
};

export type ServiceWeek = {
  readonly arrivals: number;
  /** Cases decided wrongly weeks ago, back again. */
  readonly rework: number;
  readonly decided: number;
  /** Of `decided`, those cleared by the service's shortcut under backlog pressure rather than on the merits. */
  readonly pressured: number;
  readonly refused: number;
  readonly errors: number;
  readonly withdrawn: number;
};

export type ServiceRuntime = {
  readonly id: ServiceId;
  /** The week tracking began. Earlier weeks are not on the record. */
  readonly openedTurn: number;
  readonly pending: Cohorts;
  /** Errors on their way back as rework; index 0 returns next week. */
  readonly returning: readonly number[];
  readonly last?: ServiceWeek;
  /** A decision from the visa queue, kept so review rests on an application rather than an abstract proclamation. */
  readonly entryRefusals?: readonly { readonly id: string; readonly orderRecordId: string; readonly decidedTurn: number;
    readonly application: "family-visa"; readonly nation: NationId; readonly ground: "entry-suspension" }[];
  /** One dated complaint in the aggregate HUD queue, selected before any court filing. */
  readonly housingComplaint?: { readonly id: string; readonly filedTurn: number; readonly originalDeadlineTurn: number;
    readonly applicationDeadlineTurn: number; readonly allegedPractice: "race-based-rental-denial";
    readonly respondent: "housing-provider"; readonly writtenCriterion: "race" | "neutral-capacity";
    readonly status: "pending" | "interim-protected" | "reconsideration-ordered" | "reconsidered" | "unprotected";
    readonly reconsideredTurn?: number };
  /** One investigated payroll record, kept separate from the aggregate complaint queue. */
  readonly wageComplaint?: { readonly id: string; readonly discoveredTurn: number; readonly employer: "covered-private-employer";
    readonly worker: "hourly-worker"; readonly hours: number; readonly hourlyRate: number; readonly paid: number;
    readonly requiredPay: number; readonly goodFaithEvidence: "none-substantiated";
    readonly employerResponse: "pending" | "paid" | "refused";
    readonly responseTurn?: number; readonly status: "investigating" | "settled" | "litigating" | "recovery-ordered" | "recovered";
    readonly recoveredTurn?: number };
};

export const WEEKLY_INTAKE = 100;
// A service that keeps up carries about a month of intake in hand.
const OPENING_WEEKS = 4;
// How often an owner gets a decision wrong at full delivery, and how much more
// often as its delivery falls.
const ERROR_FLOOR = 0.02;
const ERROR_RANGE = 0.2;
// A wrong decision comes back, on appeal or as a fresh filing, after a lag;
// not every one does.
const REWORK_SHARE = 0.5;
const REWORK_LAG_WEEKS = 8;
// Each week a small share of the cases waiting half a year or more is given up.
const WITHDRAWAL_RATE = 0.02;
// Above this share of late cases a Secretary feels the backlog, and the
// pressure rises to full when every case is late.
const PRESSURE_FLOOR = 0.2;
// At no integrity and full pressure, the building is pushed to refuse half a
// week's capacity again on top of its ordinary decisions, and most of those
// summary refusals are wrong.
const PRESSURE_REFUSAL_MAX = 0.5;
const PRESSURE_ERROR = 0.6;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/** A cohort array with the given weeks filled, for an opening or a test. */
export function cohorts(filled: Readonly<Record<number, number>>): Cohorts {
  return Array.from({ length: OLDEST_COHORT + 1 }, (_, week) => filled[week] ?? 0);
}

export function pendingTotal(runtime: ServiceRuntime): number {
  return sum(runtime.pending);
}

/** Cases waiting by display band: under 4 weeks, 4 to 13, 13 to 26, 26 and over. */
export function ageBands(runtime: ServiceRuntime): readonly [number, number, number, number] {
  const [a, b, c] = AGE_BUCKET_EDGES;
  const band = (from: number, to: number) => sum(runtime.pending.slice(from, to));
  return [band(0, a), band(a, b), band(b, c), band(c, OLDEST_COHORT + 1)];
}

/** Cases that have waited the service's standard or longer. */
export function lateCases(runtime: ServiceRuntime, def: ServiceDefinition): number {
  return sum(runtime.pending.slice(def.standardWeeks));
}

export function lateShare(runtime: ServiceRuntime, def: ServiceDefinition): number {
  const total = pendingTotal(runtime);
  return total === 0 ? 0 : lateCases(runtime, def) / total;
}

/** How hard a late backlog presses on whoever answers for it, 0..1. */
export function backlogPressure(runtime: ServiceRuntime, def: ServiceDefinition): number {
  return clamp01((lateShare(runtime, def) - PRESSURE_FLOOR) / (1 - PRESSURE_FLOOR));
}

export function openingService(def: ServiceDefinition, turn: number): ServiceRuntime {
  const inHand = Object.fromEntries(Array.from({ length: OPENING_WEEKS }, (_, week) => [week, WEEKLY_INTAKE]));
  return { id: def.id, openedTurn: turn, pending: cohorts(inHand), returning: new Array<number>(REWORK_LAG_WEEKS).fill(0) };
}

/** A week older: every cohort moves up one, and the oldest keeps what it had. */
function aged(pending: Cohorts): Cohorts {
  return pending.map((_, week) => (week === 0 ? 0 : week === OLDEST_COHORT ? pending[week - 1]! + pending[week]! : pending[week - 1]!));
}

/** Take `amount` from the oldest cases first. */
function decideOldestFirst(pending: Cohorts, amount: number): Cohorts {
  let left = amount;
  return [...pending]
    .reverse()
    .map((count) => {
      const taken = Math.min(count, left);
      left -= taken;
      return count - taken;
    })
    .reverse();
}

/**
 * The integrity of whoever runs the portfolio, where the service has a shortcut
 * and somebody is in the chair. A chair nobody holds pushes nobody.
 */
export type ServiceLeadership = { readonly integrity: number } | undefined;

/**
 * One week of a service, as the runtime it leaves.
 *
 * Every case is counted once: what was waiting, plus what arrived and what
 * came back, less what was decided and what was withdrawn, is what waits
 * next week.
 */
export function serviceTick(
  runtime: ServiceRuntime,
  def: ServiceDefinition,
  delivery: WorkDelivery,
  leadership: ServiceLeadership,
): ServiceRuntime {
  const rework = runtime.returning[0] ?? 0;
  const older = aged(runtime.pending);
  const intake = [WEEKLY_INTAKE + rework, ...older.slice(1)];
  const capacity = WEEKLY_INTAKE * CLEARANCE_PER_ARRIVAL * delivery.capacity;
  const pushed =
    def.shortcut && leadership ? capacity * PRESSURE_REFUSAL_MAX * (1 - leadership.integrity) * backlogPressure(runtime, def) : 0;
  const decided = Math.min(sum(intake), capacity + pushed);
  const ordinary = Math.min(decided, capacity);
  const pressured = decided - ordinary;
  const afterDecisions = decideOldestFirst(intake, decided);
  const withdrawn = afterDecisions[OLDEST_COHORT]! * WITHDRAWAL_RATE;
  const pending = afterDecisions.map((count, week) => (week === OLDEST_COHORT ? count - withdrawn : count));

  const errorRate = ERROR_FLOOR + ERROR_RANGE * (1 - delivery.ownerQuality);
  const errors = ordinary * errorRate + pressured * PRESSURE_ERROR;
  const refused = def.shortcut?.kind === "refusal" ? ordinary * def.shortcut.share + pressured : 0;
  const returning = [...runtime.returning.slice(1), errors * REWORK_SHARE];

  return { ...runtime, pending, returning, last: { arrivals: WEEKLY_INTAKE, rework, decided, pressured, refused, errors, withdrawn } };
}

// --- The services -----------------------------------------------------------

export { SERVICES };

const SERVICE_BY_ID: ReadonlyMap<ServiceId, ServiceDefinition> = new Map(SERVICES.map((def) => [def.id, def]));

export function serviceDefinition(id: ServiceId): ServiceDefinition | undefined {
  return SERVICE_BY_ID.get(id);
}

function leadershipFor(campaign: Campaign, def: ServiceDefinition): ServiceLeadership {
  if (!def.shortcut) return undefined;
  const runner = selectChairRunner(campaign, def.portfolio);
  return runner?.alive ? { integrity: runner.base.integrity } : undefined;
}

/** The department a service rolls up to: its owner if the owner is one, else the owner's parent. */
export function serviceDepartment(def: ServiceDefinition): InstitutionId {
  const owner = institutionDef(def.work.owner);
  return owner?.kind === "department" || owner?.parent === undefined ? def.work.owner : owner.parent;
}

/**
 * The week of every service. A save from before services were tracked has
 * none; each opens this week on the same assumption a new campaign makes and
 * records from here, so no earlier week is invented.
 */
export const servicePhase: TurnPhase = (state: Campaign) => {
  const activeEntry = [...state.orders].reverse().find((record) => record.order === "order-entry-suspension"
    && record.subject?.kind === "entry-class" && hasProspectiveOrderAuthority(state, record.id));
  const services = SERVICES.map((def) => {
    const prior = state.services?.[def.id] ?? openingService(def, state.turn);
    const reconsideration = def.id === "fair-housing-complaints" && prior.housingComplaint?.status === "reconsideration-ordered";
    const wageRecovery = def.id === "wage-complaints" && prior.wageComplaint?.status === "recovery-ordered";
    const work = reconsideration || wageRecovery ? { ...prior, returning: prior.returning.map((count, index) => index === 0 ? count + 1 : count) } : prior;
    const next = serviceTick(work, def, selectWorkDelivery(state, def.work), leadershipFor(state, def));
    if (wageRecovery && prior.wageComplaint) return { ...next, wageComplaint: { ...prior.wageComplaint,
      status: "recovered" as const, recoveredTurn: state.turn } };
    if (def.id === "wage-complaints" && prior.wageComplaint?.status === "investigating"
      && state.turn > prior.wageComplaint.discoveredTurn) {
      const paid = createRngStreams(state.seed).stream("wage-employer-response", prior.wageComplaint.id).next() >= 0.55;
      return { ...next, wageComplaint: { ...prior.wageComplaint, employerResponse: paid ? "paid" as const : "refused" as const,
        responseTurn: state.turn, status: paid ? "settled" as const : "litigating" as const } };
    }
    if (def.id === "wage-complaints" && !prior.wageComplaint && next.last!.arrivals >= 1
      && createRngStreams(state.seed).stream("wage-payroll-audit", state.turn).next() < 0.035) {
      // Forty-six hours at $20/hour calls for $800 straight-time plus $180 overtime; the timecard shows $920 paid.
      return { ...next, wageComplaint: { id: `wage-complaint:${state.turn}`, discoveredTurn: state.turn,
        employer: "covered-private-employer" as const, worker: "hourly-worker" as const,
        hours: 46, hourlyRate: 20, paid: 920, requiredPay: 980, goodFaithEvidence: "none-substantiated" as const,
        employerResponse: "pending" as const, status: "investigating" as const } };
    }
    if (def.id === "fair-housing-complaints" && prior.housingComplaint?.status === "interim-protected") {
      return { ...next, housingComplaint: { ...prior.housingComplaint,
        applicationDeadlineTurn: prior.housingComplaint.applicationDeadlineTurn + 1 } };
    }
    if (reconsideration && prior.housingComplaint) {
      return { ...next, housingComplaint: { ...prior.housingComplaint, status: "reconsidered" as const,
        reconsideredTurn: state.turn } };
    }
    if (def.id === "fair-housing-complaints" && !prior.housingComplaint && next.last!.arrivals >= 1
      && createRngStreams(state.seed).stream("fair-housing-complaint", state.turn).next() < 0.035) {
      return { ...next, housingComplaint: { id: `housing-complaint:${state.turn}`, filedTurn: state.turn,
        originalDeadlineTurn: state.turn + 7, applicationDeadlineTurn: state.turn + 7,
        allegedPractice: "race-based-rental-denial" as const, respondent: "housing-provider" as const,
        writtenCriterion: createRngStreams(state.seed).stream("fair-housing-response", state.turn).next() < 0.58
          ? "race" as const : "neutral-capacity" as const,
        status: "pending" as const } };
    }
    if (def.id !== "consular-visas" || !activeEntry || next.last!.decided < 1) return next;
    const alreadyRecorded = prior.entryRefusals?.some((entry) => entry.orderRecordId === activeEntry.id);
    if (alreadyRecorded || activeEntry.subject?.kind !== "entry-class") return next;
    return { ...next, last: { ...next.last!, refused: next.last!.refused + 1 },
      entryRefusals: [...(prior.entryRefusals ?? []), {
      id: `visa:${activeEntry.id}`, orderRecordId: activeEntry.id, decidedTurn: state.turn,
      application: "family-visa" as const, nation: activeEntry.subject.nation,
      ground: "entry-suspension" as const }] };
  });
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", systems: ["institutions"] },
      narration: { summary: "The departments work through the week's cases." },
      effects: [{ kind: "institution", services }],
    },
  ];
};
