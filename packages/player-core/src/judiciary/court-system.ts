import { isOpenCase, selectDateOfTurn, selectTurnOfDate, solicitorGeneralAssessment, solicitorGeneralStanding, type Campaign, type CourtProceeding } from "@admin/engine";
import type { PersonId } from "@admin/world";
import { formatDate } from "../format/figures";
import { courtOverview, currentStage, type CourtPipeline } from "./court-overview";
import { benchReading, courtDocket, type DocketCase } from "./courts";

// The courts as one system: where each live case sits in its process, the
// dates the record actually holds for it, the benches that will hear it, and
// how the justices have voted together. Everything here is read from recorded
// state; a date the engine has not set is absent, never estimated.

export type CourtLane = keyof CourtPipeline;

export type CourtSystemCase = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly lane: CourtLane;
  /** The circuit the district forum sits in; absent until the forum is recorded. */
  readonly circuit?: string;
  readonly state?: string;
  readonly forum: string;
  /** The next step on the court's calendar. */
  readonly next: CourtDate;
  /** The President's own deadline to answer, when the case is waiting on one. */
  readonly response?: CourtDate;
  /** A stay application waits on the court with no decision date set. */
  readonly stayPending: boolean;
};

export type CourtDate = { readonly turn: number; readonly date: string; readonly weeks: number };

export type CourtEventKind = "step" | "argument" | "opinion-target" | "response";

export type CourtEvent = CourtDate & { readonly kind: CourtEventKind; readonly caseId: string; readonly title: string; readonly href: string };

export type CourtCircuit = {
  readonly name: string;
  readonly states: readonly string[];
  readonly democratic: number;
  readonly republican: number;
  readonly vacant: number;
  /** Democratic minus Republican appointees over seats filled, from -1 to 1; absent with no seat filled. */
  readonly margin?: number;
  readonly caseIds: readonly string[];
};

export type CourtJustice = {
  readonly seat: number;
  readonly name: string;
  readonly vacant: boolean;
  readonly chief: boolean;
  readonly lean?: number;
  readonly age?: number;
  readonly tenure?: number;
  readonly href?: string;
  readonly personId?: PersonId;
  readonly pending?: string;
};

export type AgreementCell = { readonly together: number; readonly shared: number };

export type CourtSystem = {
  readonly cases: readonly CourtSystemCase[];
  readonly lanes: CourtPipeline;
  readonly decided: readonly { readonly title: string; readonly href: string; readonly ruled: string; readonly split?: string; readonly upheld: boolean }[];
  readonly events: readonly CourtEvent[];
  readonly circuits: readonly CourtCircuit[];
  readonly justices: readonly CourtJustice[];
  readonly majority: number;
  /** Agreement between two seated justices, keyed by both ids in either order; only cases where both voted count. */
  readonly agreement: ReadonlyMap<string, AgreementCell>;
  /** Whether any two sitting justices have a recorded vote in common. */
  readonly agreementRecorded: boolean;
  readonly solicitorGeneral: { readonly standing: number; readonly assessment: "strained" | "mixed" | "strong" };
  /** The Court's October terms that overlap the coming year, October 1 to June 30. */
  readonly terms: readonly { readonly label: string; readonly start: CourtDate; readonly end: CourtDate }[];
  /** The first of each month in the coming year, placed on its week, to label the calendar. */
  readonly months: readonly { readonly label: string; readonly weeks: number }[];
};

const MONTH_ABBREVIATIONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function monthsOf(campaign: Campaign): CourtSystem["months"] {
  const { year, month } = campaign.calendar;
  return Array.from({ length: 13 }, (_, index) => {
    const at = { year: year + Math.floor((month + index) / 12), month: ((month + index) % 12) + 1, day: 1 };
    return { label: MONTH_ABBREVIATIONS[at.month - 1]!, weeks: selectTurnOfDate(campaign, at) - campaign.turn };
  }).filter((entry) => entry.weeks > 0 && entry.weeks <= COURT_HORIZON_WEEKS);
}

/** Weeks of the calendar the courts view looks ahead. */
export const COURT_HORIZON_WEEKS = 52;

function termsOf(campaign: Campaign): CourtSystem["terms"] {
  const year = campaign.calendar.year;
  return [year - 1, year, year + 1].flatMap((termYear) => {
    // Turns are weeks, so the turn places the term on the calendar and the date it is named by stays the real one.
    const on = (date: { readonly year: number; readonly month: number; readonly day: number }): CourtDate => {
      const turn = selectTurnOfDate(campaign, date);
      return { turn, date: formatDate(date), weeks: turn - campaign.turn };
    };
    const start = on({ year: termYear, month: 10, day: 1 });
    const end = on({ year: termYear + 1, month: 6, day: 30 });
    return end.weeks >= 0 && start.weeks <= COURT_HORIZON_WEEKS ? [{ label: `October Term ${termYear}`, start, end }] : [];
  });
}

export const agreementKey = (first: string, second: string): string => (first < second ? `${first}|${second}` : `${second}|${first}`);

function dated(campaign: Campaign, turn: number): CourtDate {
  return { turn, date: formatDate(selectDateOfTurn(campaign, turn)), weeks: turn - campaign.turn };
}

function proceedingOf(campaign: Campaign, row: DocketCase): CourtProceeding | undefined {
  return (campaign.judiciary.proceedings ?? []).find((entry) =>
    entry.id === row.id || (entry.subject.kind === "executive-order" && entry.subject.recordId === row.id));
}

/** A case with no proceeding is a legacy review, placed by the forum the docket records. */
function laneOf(row: DocketCase, proceeding: CourtProceeding | undefined): CourtLane {
  if (proceeding) return currentStage(proceeding);
  return row.forum === "supreme" ? "review" : row.forum === "circuit" ? "circuit" : "filed";
}

function responseOf(campaign: Campaign, proceeding: CourtProceeding | undefined): CourtDate | undefined {
  const response = proceeding ? campaign.cases?.[`case:review:${proceeding.id}`] : undefined;
  if (!response || !isOpenCase(response.status) || !("dueAt" in response.clock)) return undefined;
  // Named by the real due date; the turn only places it on the calendar.
  const turn = selectTurnOfDate(campaign, response.clock.dueAt);
  return { turn, date: formatDate(response.clock.dueAt), weeks: turn - campaign.turn };
}

function caseEvents(campaign: Campaign, entry: CourtSystemCase, proceeding: CourtProceeding | undefined): readonly CourtEvent[] {
  const of = (kind: CourtEventKind, at: CourtDate): CourtEvent => ({ ...at, kind, caseId: entry.id, title: entry.title, href: entry.href });
  const calendar = proceeding?.calendar;
  // The Court sets argument dates and aims at late June; it does not announce an opinion's day, so neither does this.
  const supreme = calendar
    ? [...(calendar.status !== "argued" ? [of("argument", dated(campaign, calendar.argumentTurn))] : []), of("opinion-target", dated(campaign, calendar.opinionTargetTurn))]
    : [];
  return [of("step", entry.next), ...supreme, ...(entry.response ? [of("response", entry.response)] : [])];
}

function justicesOf(campaign: Campaign): readonly CourtJustice[] {
  const bench = benchReading(campaign);
  const known = new Map(courtOverview(campaign).agreement.justices.map((justice) => [justice.name, justice]));
  return bench.seats.map((seat) => {
    const record = known.get(seat.name);
    return {
      seat: seat.seat, name: seat.name, vacant: seat.vacant, chief: seat.chief,
      ...(seat.lean !== undefined ? { lean: seat.lean } : {}),
      ...(record?.age !== undefined ? { age: record.age } : {}),
      ...(record?.tenure !== undefined ? { tenure: record.tenure } : {}),
      ...(seat.href ? { href: seat.href } : {}),
      ...(record ? { personId: record.id } : {}),
      ...(seat.pending ? { pending: seat.pending.name } : {}),
    };
  });
}

export function courtSystem(campaign: Campaign): CourtSystem {
  const docket = courtDocket(campaign);
  const overview = courtOverview(campaign);
  const built = docket.pending.map((row) => {
    const proceeding = proceedingOf(campaign, row);
    const response = responseOf(campaign, proceeding);
    const entry: CourtSystemCase = {
      id: row.id, title: row.orderName, href: row.href, lane: laneOf(row, proceeding),
      ...(row.lowerForum?.circuit ? { circuit: row.lowerForum.circuit } : {}),
      ...(overview.circuits.flatMap((circuit) => circuit.cases).find((entry) => entry.href === row.href)?.state
        ? { state: overview.circuits.flatMap((circuit) => circuit.cases).find((entry) => entry.href === row.href)!.state! } : {}),
      forum: row.lowerForum?.court ?? "Court not recorded yet",
      next: dated(campaign, campaign.turn + row.weeksLeft),
      ...(response ? { response } : {}),
      stayPending: proceeding?.stayApplication?.status === "pending",
    };
    return { entry, events: caseEvents(campaign, entry, proceeding) };
  });
  const cases = built.map((row) => row.entry);
  const standing = solicitorGeneralStanding(campaign.judiciary.solicitorGeneral);
  const agreement = new Map(overview.agreement.pairs.map((pair) => [agreementKey(pair.first, pair.second), { together: pair.together, shared: pair.shared }]));
  return {
    cases,
    lanes: overview.pipeline,
    decided: docket.ruled.slice(0, 4).map((row) => ({ title: row.orderName, href: row.href, ruled: row.ruled ?? "Date not recorded",
      ...(row.split ? { split: row.split } : {}), upheld: row.status === "upheld" })),
    events: built.flatMap((row) => row.events).filter((event) => event.weeks >= 0).sort((a, b) => a.turn - b.turn || a.title.localeCompare(b.title)),
    circuits: overview.circuits.map((circuit) => {
      const filled = circuit.democratic + circuit.republican;
      return { name: circuit.name, states: circuit.states, democratic: circuit.democratic, republican: circuit.republican, vacant: circuit.vacant,
        ...(filled > 0 ? { margin: (circuit.democratic - circuit.republican) / filled } : {}),
        caseIds: cases.filter((entry) => entry.circuit === circuit.name).map((entry) => entry.id) };
    }),
    justices: justicesOf(campaign),
    majority: benchReading(campaign).majority,
    agreement,
    agreementRecorded: overview.agreement.pairs.some((pair) => pair.shared > 0),
    solicitorGeneral: { standing, assessment: solicitorGeneralAssessment(standing) },
    terms: termsOf(campaign),
    months: monthsOf(campaign),
  };
}
