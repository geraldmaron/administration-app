import {
  COURT_ORDER_KIND_IDS,
  COURT_ORDER_KINDS,
  OBSTRUCTION_WEEKS,
  courtOrderProjection,
  courtOrderRecords,
  courtOrderStatus,
  requestCourtOrder,
  type Campaign,
  type CourtOrderKind,
  type CourtOrderProjection,
  type CourtOrderRecord,
  type CourtOrderStatus,
  type DirectiveStatus,
  type EffectPacket,
  type LocaleActId,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { orderAuthorityRecord } from "../authority/registry";
import type { LocaleActAuthorityView } from "./locale-act-options";

// "Seek a court order": the orders Justice can ask a court for over one
// state, the odds the court is drawn against, and what became of the ones
// already filed. A filed application's answer is read only off the record the
// court leaves the week it rules (`courtOrderRecords`), never off the draw, so
// a pending application says pending until the court has spoken.

/** The court's odds in whole percents, which always add up to 100. */
export type CourtOrderOddsView = { readonly granted: number; readonly narrowed: number; readonly denied: number };

/** What the application rests on, in whole percents where it is a reading. */
export type CourtOrderEvidenceView = {
  /** The FBI's capability to build the affidavit. */
  readonly capability: number;
  /** How strong the kind's own legal predicate is on this week's record; zero means absent. */
  readonly predicate: number;
  /** The overall evidence the court weighs. */
  readonly score: number;
  readonly priority: boolean;
  readonly surveillance: boolean;
  /** Each part said plainly, for the row that lists them. */
  readonly lines: readonly string[];
};

/** One application already filed, as the record keeps it. */
export type CourtOrderApplicationView = {
  readonly id: string;
  readonly kind: CourtOrderKind;
  readonly name: string;
  readonly status: CourtOrderStatus;
  readonly statusText: string;
  readonly appliedTurn: number;
  readonly decideTurn: number;
  readonly termEndsTurn?: number;
  readonly cooldownEndsTurn?: number;
  /** Weeks until the court answers, the order lapses, or Justice can file again. */
  readonly weeksLeft?: number;
  /** What a live order lets the administration do; only on a granted or narrowed order still running. */
  readonly enables?: string;
};

export type CourtOrderOption = {
  readonly kind: CourtOrderKind;
  readonly name: string;
  readonly court: string;
  readonly authority: LocaleActAuthorityView;
  /** What a granted order would let the administration do. */
  readonly enables: string;
  /** The act a live order opens, where one does. */
  readonly opensAct?: LocaleActId;
  /** Why Justice cannot file it this week; absent when it can. */
  readonly locked?: string;
  /** The packet that files the application. Carries the odds, never the answer. Absent when locked. */
  readonly packet?: EffectPacket;
  readonly evidence: CourtOrderEvidenceView;
  readonly odds: CourtOrderOddsView;
  /** Which way the district bench leans, for the injunction only. */
  readonly bench?: { readonly court: string; readonly leaning: "your way" | "against you" | "even" };
  readonly decisionWeeks: { readonly min: number; readonly max: number };
  readonly decisionText: string;
  readonly termWeeks: number;
  readonly termText: string;
  /** What the Attorney General does with the instruction this week; only a carried one files. */
  readonly attorneyGeneral?: DirectiveStatus;
  readonly attorneyGeneralText?: string;
  /** Whether filing it now would renew an order already running. */
  readonly renewal: boolean;
  /** The newest application of this kind in this state, whatever became of it. */
  readonly latest?: CourtOrderApplicationView;
};

export type CourtOrderDesk = {
  readonly state: StateId;
  readonly options: readonly CourtOrderOption[];
  /** Every application filed for the state, newest first. */
  readonly applications: readonly CourtOrderApplicationView[];
  /** The granted or narrowed orders still running. */
  readonly live: readonly CourtOrderApplicationView[];
};

const weeks = (count: number): string => `${count} ${count === 1 ? "week" : "weeks"}`;
const percent = (share: number): number => Math.min(100, Math.max(0, Math.round(share * 100)));

function oddsView(projection: CourtOrderProjection): CourtOrderOddsView {
  const granted = percent(projection.odds.granted);
  const narrowed = Math.min(100 - granted, percent(projection.odds.narrowed));
  return { granted, narrowed, denied: 100 - granted - narrowed };
}

function evidenceView(projection: CourtOrderProjection): CourtOrderEvidenceView {
  const { capability, predicate, priority, surveillance, score } = projection.evidence;
  const lines = [
    `FBI capability: ${percent(capability)}%`,
    predicate > 0 ? `Legal grounds: ${percent(predicate)}%` : "No legal grounds on the record",
    ...(priority ? ["An investigative priority is in force here"] : []),
    ...(surveillance ? ["Collection under an earlier order here"] : []),
  ];
  return { capability: percent(capability), predicate: percent(predicate), score: percent(score), priority, surveillance, lines };
}

const days = (kind: CourtOrderKind): number => COURT_ORDER_KINDS[kind].termDays;

const ENABLES: Readonly<Record<CourtOrderKind, (name: string) => string>> = {
  "fisa-order": (name) => `Lets Justice conduct surveillance in ${name} on the targets and for the term the order names.`,
  "title-iii-order": (name) => `Lets Justice intercept the communications the order names in ${name}, for up to ${days("title-iii-order")} days.`,
  "injunction-enforcement": (name) =>
    `If ${name} leaves the injunction defied for ${weeks(OBSTRUCTION_WEEKS).replace(/^1 /, "a ")}, the Insurrection Act's obstruction ground (§252) opens.`,
  "search-warrant": () => `Lets agents search what the warrant names, within ${days("search-warrant")} days. No other act depends on it.`,
};

const OPENS: Readonly<Partial<Record<CourtOrderKind, LocaleActId>>> = {
  "fisa-order": "surveil-under-order",
  "title-iii-order": "surveil-under-order",
  "injunction-enforcement": "proclaim",
};

const AG_WORDS: Readonly<Record<DirectiveStatus, string>> = {
  carried: "The Attorney General will file it.",
  "slow-walked": "The Attorney General would sit on it. Nothing would be filed this week.",
  refused: "The Attorney General would refuse to file it.",
};

function statusText(record: CourtOrderRecord, turn: number): { readonly text: string; readonly weeksLeft?: number } {
  if (record.status === "pending") {
    const left = Math.max(0, record.decideTurn - turn);
    return { text: left > 0 ? `Waiting on the court. It answers within ${weeks(left)}.` : "Waiting on the court's answer.", weeksLeft: left };
  }
  if (record.status === "granted" || record.status === "narrowed") {
    const left = Math.max(0, (record.termEndsTurn ?? turn) - turn);
    const granted = record.status === "granted" ? "Granted." : "Granted, narrower than Justice asked.";
    return { text: `${granted} In force for ${weeks(left)} more.`, weeksLeft: left };
  }
  if (record.status === "denied") {
    const left = Math.max(0, (record.cooldownEndsTurn ?? turn) - turn);
    return left > 0 ? { text: `Denied. Justice can file again in ${weeks(left)}.`, weeksLeft: left } : { text: "Denied." };
  }
  return { text: "Expired. It no longer authorizes anything." };
}

function applicationView(campaign: Campaign, record: CourtOrderRecord): CourtOrderApplicationView {
  const name = campaign.states[record.state]?.base.name ?? record.state;
  const { text, weeksLeft } = statusText(record, campaign.turn);
  const live = record.status === "granted" || record.status === "narrowed";
  return {
    id: record.id,
    kind: record.kind,
    name: COURT_ORDER_KINDS[record.kind].name,
    status: record.status,
    statusText: text,
    appliedTurn: record.appliedTurn,
    decideTurn: record.decideTurn,
    ...(record.termEndsTurn !== undefined ? { termEndsTurn: record.termEndsTurn } : {}),
    ...(record.cooldownEndsTurn !== undefined ? { cooldownEndsTurn: record.cooldownEndsTurn } : {}),
    ...(weeksLeft !== undefined ? { weeksLeft } : {}),
    ...(live ? { enables: ENABLES[record.kind](name) } : {}),
  };
}

function authorityOf(kind: CourtOrderKind): LocaleActAuthorityView {
  const authority = COURT_ORDER_KINDS[kind].authority;
  const record = orderAuthorityRecord(authority);
  return { cite: authority.cite, name: authority.name, limit: authority.limit, ...(record ? { recordId: record.id } : {}) };
}

function benchView(projection: CourtOrderProjection): CourtOrderOption["bench"] {
  if (!projection.bench) return undefined;
  const { court, shift } = projection.bench;
  return { court, leaning: shift > 0 ? "your way" : shift < 0 ? "against you" : "even" };
}

function filed(campaign: Campaign, state: StateId, kind: CourtOrderKind, projection: CourtOrderProjection): EffectPacket | undefined {
  if (!projection.availability.ok) return undefined;
  const result = requestCourtOrder(campaign, state, kind);
  return result.ok ? result.packet : undefined;
}

function optionFor(campaign: Campaign, state: StateId, kind: CourtOrderKind): CourtOrderOption {
  const projection = courtOrderProjection(campaign, state, kind);
  const name = campaign.states[state]?.base.name ?? state;
  const { min, max } = projection.decisionWeeks;
  const latest = courtOrderStatus(campaign, state, kind);
  const bench = benchView(projection);
  const packet = filed(campaign, state, kind, projection);
  const opensAct = OPENS[kind];
  return {
    kind,
    name: projection.def.name,
    court: projection.def.court,
    authority: authorityOf(kind),
    enables: ENABLES[kind](name),
    ...(opensAct ? { opensAct } : {}),
    ...(projection.availability.ok ? {} : { locked: `This needs ${projection.availability.missing}.` }),
    ...(packet ? { packet } : {}),
    evidence: evidenceView(projection),
    odds: oddsView(projection),
    ...(bench ? { bench } : {}),
    decisionWeeks: { min, max },
    decisionText: min === max ? `About ${weeks(min)}` : `${min} to ${weeks(max)}`,
    termWeeks: projection.termWeeks,
    termText: `${weeks(projection.termWeeks)} once granted`,
    ...(projection.attorneyGeneral ? { attorneyGeneral: projection.attorneyGeneral, attorneyGeneralText: AG_WORDS[projection.attorneyGeneral] } : {}),
    renewal: projection.renewal,
    ...(latest ? { latest: applicationView(campaign, latest) } : {}),
  };
}

/** Every court order Justice could ask for over one state this week, in the engine's order. */
export function courtOrderOptions(campaign: Campaign, state: StateId): readonly CourtOrderOption[] {
  return COURT_ORDER_KIND_IDS.map((kind) => optionFor(campaign, state, kind));
}

/** The "Seek a court order" desk for one state: what can be asked for, and what became of what was. */
export function courtOrderDesk(campaign: Campaign, state: StateId): CourtOrderDesk {
  const applications = courtOrderRecords(campaign, state).map((record) => applicationView(campaign, record));
  return {
    state,
    options: courtOrderOptions(campaign, state),
    applications,
    live: applications.filter((application) => application.status === "granted" || application.status === "narrowed"),
  };
}
