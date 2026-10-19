import type { NationId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { selectAuthorizationAgainst, selectNation } from "./state.js";
// Straight from the clock rather than through `nomination.js`, which only
// re-exports it: congress.js reads the termination obligations from here, and
// the longer route would run that read back through a module that imports
// congress.js itself.
import { campaignDay, weekCloseDate } from "./clock.js";
import { weeksFor } from "./pace.js";

// The forty-eight hour report, which is a separate and earlier obligation from
// the sixty-day clock the engine already runs.
//
// `warPowersStanding` compresses the sixty days into nine weeks and gates the
// three rungs of force on it. That is the half of the War Powers Resolution about
// whether force may continue. This is the half about whether Congress was told,
// and it has a fact in it that a game can build a whole decision on: the
// sixty-day clock runs from the day a report was submitted **or from the day
// one was required to be submitted**. A president who does not report is not
// buying time. They are running the same clock with a worse record.
//
// What the report says is also a decision. It states the circumstances, the
// authority being relied on, and the estimated scope and duration — three
// things that can each be candid or evasive, and that Congress will hold the
// administration to when the estimate turns out to have been the optimistic one.

export type ReportObligationId = string;

/** Which limb of the reporting trigger this introduction fell under. */
export type IntroductionKind = "hostilities" | "equipped-for-combat" | "substantial-enlargement";

export type ReportFiling = {
  readonly filedDay: number;
  readonly filedDate: GameDate;
  /** The constitutional or legislative authority the administration says it is acting under. */
  readonly authorityClaimed: string;
  readonly scope: string;
  /** Weeks the administration estimates. The estimate is on the record when it is exceeded. */
  readonly estimatedWeeks: number;
};

export type ReportObligation = {
  readonly id: ReportObligationId;
  readonly target: NationId;
  readonly kind: IntroductionKind;
  readonly rung: number;
  readonly openedDay: number;
  readonly openedDate: GameDate;
  /** Two days after the introduction. The statute says forty-eight hours and means it. */
  readonly dueDay: number;
  readonly description: string;
  readonly filing?: ReportFiling;
  /** Set once the deadline passed unfiled. The obligation does not go away when it is missed. */
  readonly missed?: true;
  /** The thirty-day extension, certified in writing on grounds of unavoidable military necessity. */
  readonly extension?: { readonly certifiedDay: number; readonly necessity: string };
  /**
   * The day the force actually came out.
   *
   * The only thing that discharges a termination obligation short of a vote.
   * Set once and never cleared: an introduction that was ended is a different
   * record from one that was never opened, and the ladder reads the difference.
   */
  readonly terminated?: { readonly day: number };
};

export type WarPowersReportState = {
  readonly obligations: readonly ReportObligation[];
};

export function foundingWarPowersReports(): WarPowersReportState {
  return { obligations: [] };
}

export const REPORT_WINDOW_DAYS = 2;
/** Sixty days, in the weeks this game runs on, and the thirty-day certification on top of it. */
export const TERMINATION_WINDOW_DAYS = 60;
export const EXTENSION_DAYS = 30;
/**
 * How close to the end of the sixty days the extension can be certified. A
 * necessity for more time to withdraw is not credible two months out, and the
 * player surfaces say when the certification opens from this same number.
 */
export const EXTENSION_OPENS_DAYS = 14;

/**
 * What a week of continuing past the sixty days costs, before the compounding.
 *
 * The statute leaves the President three answers at day sixty: a vote, thirty
 * certified days to bring the force out, or the force comes out. There is no
 * fourth, so continuing is not a state the game can price at zero — it is the
 * administration standing on an authority it has been told it does not have,
 * and the Hill is the party that reads it that way.
 */
export const SUSTAINED_WEEKLY_STANDING_COST = 0.02;
export const SUSTAINED_WEEKLY_DISPOSITION_COST = 0.02;

/**
 * How much that weekly price grows per further week the force stays in.
 *
 * The same shape a standing emergency is billed on, and for the same reason: a
 * flat rent becomes a line item a president stops reading, while a rising one
 * makes "when does this end" the loudest question on the ledger.
 */
export const SUSTAINED_COST_COMPOUNDING = 0.15;

// --- Reading ---------------------------------------------------------------

export function selectObligations(campaign: Campaign): readonly ReportObligation[] {
  return [...campaign.security.warPowers.obligations].sort(
    (a, b) => b.openedDay - a.openedDay || a.id.localeCompare(b.id),
  );
}

export function selectUnfiledObligations(campaign: Campaign): readonly ReportObligation[] {
  return selectObligations(campaign).filter((obligation) => obligation.filing === undefined);
}

/** The sixty days, plus the thirty a certification buys. */
export function terminationWindowDays(obligation: ReportObligation): number {
  return TERMINATION_WINDOW_DAYS + (obligation.extension ? EXTENSION_DAYS : 0);
}

/**
 * Whether the sixty-day termination requirement attaches to this introduction
 * at all.
 *
 * Three conditions, each one the statute's own. It is keyed to a hostilities
 * report and to nothing else, so a forward deployment owes the forty-eight
 * hour report and no window, while a blockade, which is hostilities, owes both. It falls away entirely once Congress
 * has authorized force against that government, which is what a vote buys. And
 * it ends when the force comes out, which is what it was asking for.
 */
export function terminationClockRuns(campaign: Campaign, obligation: ReportObligation): boolean {
  if (obligation.kind !== "hostilities") return false;
  if (obligation.terminated) return false;
  return selectAuthorizationAgainst(campaign, obligation.target) === undefined;
}

/**
 * The day the sixty days start counting.
 *
 * The statute runs them from the day a report "is submitted or is required to
 * be submitted ..., whichever is earlier". So a report filed inside the
 * forty-eight hours starts the clock on the day it was filed, and a report
 * filed late, or never, starts it on the day it was owed: not reporting buys
 * at most the two days the statute already gave.
 */
export function terminationStartDay(obligation: ReportObligation): number {
  return obligation.filing ? Math.min(obligation.filing.filedDay, obligation.dueDay) : obligation.dueDay;
}

/**
 * The whole window measured from the day forces went in: the sixty days (and
 * any certified thirty) plus however long after the introduction they started.
 * What a gauge of the window is drawn against, so a clock that starts on the
 * day the report was owed never reads as more time left than the window holds.
 */
export function terminationWindowFromIntroduction(obligation: ReportObligation): number {
  return terminationStartDay(obligation) - obligation.openedDay + terminationWindowDays(obligation);
}

/** Days from introducing forces to the latest the sixty days can end: the report's two days, then the sixty. */
export const LATEST_TERMINATION_DAYS = REPORT_WINDOW_DAYS + TERMINATION_WINDOW_DAYS;

/**
 * Days left before the President must terminate the use of force absent a vote.
 *
 * Negative once the window has run out. Ask `terminationClockRuns` first: this
 * is the arithmetic of the window, not the question of whether the statute sets
 * one.
 */
export function terminationDaysRemaining(campaign: Campaign, obligation: ReportObligation): number {
  return terminationStartDay(obligation) + terminationWindowDays(obligation) - campaignDay(campaign);
}

/**
 * Every introduction whose clock has run out with nothing standing over it.
 *
 * The live obligation to terminate, which is what running the clock out
 * produces. It is not a lapse and it is not permission: while one of these
 * stands, the force is in place on an authority the statute says expired.
 */
export function expiredObligations(campaign: Campaign): readonly ReportObligation[] {
  return selectObligations(campaign).filter(
    (obligation) => terminationClockRuns(campaign, obligation) && terminationDaysRemaining(campaign, obligation) < 0,
  );
}

/** Weeks the force has stayed in past the day it was owed out. Zero on the week it expires. */
export function weeksPastTermination(campaign: Campaign, obligation: ReportObligation): number {
  const over = -terminationDaysRemaining(campaign, obligation);
  return over <= 0 ? 0 : weeksFor(over, "floor");
}

/** How far this week's price has compounded above the first week's. */
export function sustainedCostScale(campaign: Campaign, obligation: ReportObligation): number {
  return 1 + weeksPastTermination(campaign, obligation) * SUSTAINED_COST_COMPOUNDING;
}

// --- Opening one -----------------------------------------------------------

const INTRODUCTION_BY_RUNG: Readonly<Record<number, IntroductionKind>> = {
  2: "equipped-for-combat",
  3: "hostilities",
  4: "hostilities",
  5: "hostilities",
};

/**
 * What introducing forces leaves behind: an obligation with two days on it.
 *
 * Only the player's government, for the reason the war powers gate is only the
 * player's: the campaign carries one Congress and it is theirs.
 */
export function recordForceIntroduction(
  campaign: Campaign,
  actor: NationId,
  target: NationId,
  rung: number,
  description: string,
): readonly Effect[] {
  if (actor !== campaign.founding.nation) return [];
  const kind = INTRODUCTION_BY_RUNG[rung];
  if (!kind) return [];
  const day = campaignDay(campaign);
  const obligation: ReportObligation = {
    id: `wpr:${target}:${campaign.turn}`,
    target,
    kind,
    rung,
    openedDay: day,
    openedDate: campaign.calendar,
    dueDay: day + REPORT_WINDOW_DAYS,
    description,
  };
  return [{ kind: "warPowers", open: obligation }];
}

// --- Acts ------------------------------------------------------------------

export type ReportResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

const CANDOR_DISPOSITION_GAIN = 0.03;
const LATE_DISPOSITION_COST = 0.05;

/**
 * File the report.
 *
 * Filing on time is worth something with the Hill and filing late costs
 * something, and neither is large — which is right. The report is not where a
 * presidency is won. It is where the record of it starts, and the estimate
 * written into it is the sentence a committee reads back in six months.
 */
export function fileWarPowersReport(
  campaign: Campaign,
  id: ReportObligationId,
  authorityClaimed: string,
  scope: string,
  estimatedWeeks: number,
): ReportResult {
  const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === id);
  if (!obligation) return { ok: false, reason: "No such reporting obligation." };
  if (obligation.filing) return { ok: false, reason: "That report has already been filed." };
  if (!authorityClaimed.trim()) return { ok: false, reason: "The report has to state the authority relied on." };
  if (!scope.trim()) return { ok: false, reason: "The report has to state the scope." };
  if (!(estimatedWeeks > 0)) return { ok: false, reason: "The report has to estimate a duration." };

  const day = campaignDay(campaign);
  const late = day > obligation.dueDay;
  const name = selectNation(campaign, obligation.target)?.base.identity.name ?? obligation.target;
  const filing: ReportFiling = {
    filedDay: day,
    filedDate: campaign.calendar,
    authorityClaimed,
    scope,
    estimatedWeeks,
  };

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [obligation.target as string, "INST-CONGRESS"],
        systems: ["war-powers"],
      },
      narration: {
        summary: late
          ? `The report on ${name} goes to the Hill late, claiming ${authorityClaimed}.`
          : `The President reports to the Speaker and the President pro tempore on ${name}, claiming ${authorityClaimed}.`,
      },
      effects: [
        { kind: "warPowers", file: { id, filing } },
        {
          kind: "congress",
          set: {
            ...campaign.congress,
            disposition: clamp01(
              round3(campaign.congress.disposition + (late ? -LATE_DISPOSITION_COST : CANDOR_DISPOSITION_GAIN)),
            ),
          },
        },
      ],
    },
  };
}

/**
 * Certify the thirty-day extension.
 *
 * Available only where forces are actually still committed, and it buys thirty
 * days for the purpose of bringing them out — not thirty days of continued
 * operations, which is the distinction the certification is written against and
 * the one an administration is most tempted to blur.
 */
export function certifyExtension(campaign: Campaign, id: ReportObligationId, necessity: string): ReportResult {
  const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === id);
  if (!obligation) return { ok: false, reason: "No such reporting obligation." };
  if (obligation.extension) return { ok: false, reason: "That extension has already been certified." };
  if (!terminationClockRuns(campaign, obligation)) {
    return {
      ok: false,
      reason: `Nothing requires this force out, so there is no window to extend. ${coverLine(campaign, obligation)}`,
    };
  }
  if (!necessity.trim()) {
    return { ok: false, reason: "The certification has to state the unavoidable military necessity." };
  }
  const remaining = terminationDaysRemaining(campaign, obligation);
  if (remaining > EXTENSION_OPENS_DAYS) {
    return { ok: false, reason: "The sixty days have not run far enough to certify a necessity for extending them." };
  }
  if (remaining < 0) return { ok: false, reason: "That window has already closed." };

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [obligation.target as string, "INST-CONGRESS"],
        systems: ["war-powers"],
      },
      narration: {
        summary: `The President certifies to Congress that unavoidable military necessity requires thirty more days to bring the force out.`,
      },
      effects: [{ kind: "warPowers", certify: { id, day: campaignDay(campaign), necessity } }],
    },
  };
}

/**
 * Why no window is running on an introduction, in the words the refusal and
 * the paperwork row both use.
 */
export function coverLine(campaign: Campaign, obligation: ReportObligation): string {
  if (obligation.terminated) return "The force has been brought out.";
  const authorization = selectAuthorizationAgainst(campaign, obligation.target);
  if (authorization) return `Covered by the ${authorization.title}.`;
  if (obligation.kind !== "hostilities") {
    return "The sixty days run on an introduction into hostilities, and this is not one.";
  }
  return "The sixty days are still running.";
}

/**
 * Bring the force out.
 *
 * The answer the statute is actually asking for, and the only one short of a
 * vote: the obligation is discharged, the weekly price of continuing stops, and
 * the ladder the introduction closed opens again. Available at any point the
 * clock is running rather than only after it has run out — a president who
 * brings a force home inside the sixty days has complied, not forfeited
 * something.
 */
export function terminateForce(campaign: Campaign, id: ReportObligationId): ReportResult {
  const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === id);
  if (!obligation) return { ok: false, reason: "No such reporting obligation." };
  if (!terminationClockRuns(campaign, obligation)) {
    return {
      ok: false,
      reason: `There is no committed force here to bring out. ${coverLine(campaign, obligation)}`,
    };
  }
  const day = campaignDay(campaign);
  const name = selectNation(campaign, obligation.target)?.base.identity.name ?? obligation.target;
  const late = terminationDaysRemaining(campaign, obligation) < 0;
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [obligation.target as string, "INST-CONGRESS"],
        systems: ["war-powers"],
      },
      narration: {
        summary: late
          ? `The President terminates the use of force against ${name}, past the sixty days the resolution allowed it.`
          : `The President terminates the use of force against ${name} inside the sixty days, and reports it.`,
      },
      effects: [{ kind: "warPowers", terminate: { id, day } }],
    },
  };
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// --- The weekly tick -------------------------------------------------------

const MISSED_REPORT_DISPOSITION_COST = 0.07;

/** Deadlines that passed unfiled this week, each marked once and priced once. */
function missedObligations(state: Campaign): readonly ReportObligation[] {
  const day = campaignDay(state);
  return state.security.warPowers.obligations.filter(
    (obligation) => obligation.filing === undefined && obligation.missed === undefined && day > obligation.dueDay,
  );
}

function missedReportPacket(
  state: Campaign,
  missed: readonly ReportObligation[],
  disposition: number,
): EffectPacket {
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn,
    // Observed: a report was owed on a date and was not filed, which is a fact
    // of the record rather than a reading of one.
    provenance: { origin: "scheduled", confidence: "observed", visibility: "public", systems: ["war-powers"] },
    narration: {
      summary: `${missed.length} forty-eight hour ${missed.length === 1 ? "report goes" : "reports go"} unfiled, and the sixty days run from the day they were owed.`,
    },
    effects: [
      { kind: "warPowers", miss: { ids: missed.map((obligation) => obligation.id) } },
      { kind: "congress", set: { ...state.congress, disposition } },
    ],
  };
}

/**
 * The price of one force still in place past the day it was owed out.
 *
 * One packet per obligation rather than one for all of them, because each is a
 * separate country with its own week count, and a president reading the record
 * has to be able to see which commitment is the expensive one. The packet is
 * the naming: continuing is not a silence the game lets pass, it is a line on
 * the ledger every week, and it gets dearer.
 */
function sustainedForcePacket(
  state: Campaign,
  obligation: ReportObligation,
  scale: number,
  disposition: number,
): EffectPacket {
  const weeks = weeksPastTermination(state, obligation) + 1;
  const name = selectNation(state, obligation.target)?.base.identity.name ?? obligation.target;
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn,
    provenance: {
      origin: "scheduled",
      confidence: "observed",
      visibility: "public",
      entities: [obligation.target as string, "INST-CONGRESS"],
      systems: ["war-powers"],
    },
    narration: {
      summary: `Forces remain committed against ${name} into week ${weeks} past the sixty days, with no vote behind them.`,
    },
    effects: [
      { kind: "metric", deltas: { standing: -SUSTAINED_WEEKLY_STANDING_COST * scale } },
      { kind: "congress", set: { ...state.congress, disposition } },
    ],
  };
}

/**
 * The war powers week: deadlines that passed unfiled are marked as missed, and
 * force still in place past the sixty days is billed for continuing.
 *
 * Both halves are the weekly consequence of one record, which is why they are
 * one phase. A missed report is marked, not forgiven and not escalated: it is
 * on the record as missed, the Hill liked this administration better before,
 * and the termination clock has been running the whole time from a date the
 * President never acknowledged. An expired clock is not marked and forgotten —
 * the statute's answer at day sixty is a vote, a certification, or the force
 * coming out, and there is no fourth answer for the game to price at zero.
 *
 * The chamber's regard is threaded through both rather than computed twice
 * from the opening figure: every packet a phase returns is planned against the
 * same week, so two that each write the whole `Congress` record from that week
 * would have the second quietly undo the first.
 */
export const warPowersReportPhase: TurnPhase = (state: Campaign) => {
  const missed = missedObligations(state);
  // The continuing bill is the week's, and how many weeks it has compounded is
  // a count of days, so it is read on the day the week closes. Read on this
  // phase's own office day, the cut saw a clock that ran out late in the week
  // a week later than the one-shot week did, and billed it at a lower scale
  // from then on. A missed report stays on today: its forty-eight hours can
  // still be met on a later office day, and marking it early would price a
  // report filed in time.
  const closing: Campaign = { ...state, calendar: weekCloseDate(state) };
  const expired = expiredObligations(closing);
  if (missed.length === 0 && expired.length === 0) return [];

  const packets: EffectPacket[] = [];
  let disposition = state.congress.disposition;
  if (missed.length > 0) {
    disposition = clamp01(round3(disposition - MISSED_REPORT_DISPOSITION_COST * missed.length));
    packets.push(missedReportPacket(state, missed, disposition));
  }
  for (const obligation of expired) {
    const scale = sustainedCostScale(closing, obligation);
    disposition = clamp01(round3(disposition - SUSTAINED_WEEKLY_DISPOSITION_COST * scale));
    packets.push(sustainedForcePacket(closing, obligation, scale, disposition));
  }
  return packets;
};
