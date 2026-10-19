import { describe, expect, it } from "vitest";
import {
  addDays,
  campaignDay,
  compareDates,
  scheduleSupremeArgument,
  type Bill,
  type Campaign,
  type CourtProceeding,
  type DeclaredEmergency,
  type ReportObligation,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { buildCalendar } from "./build";
import type { CalendarEventKind } from "./types";
import { agenda, calendarMonth, daysUntil, termTimeline } from "./views";
import { isValidDate } from "./window";

const base = openingCampaign();
const TARGET = "FRA" as NationId;

const deskBill: Bill = {
  id: "bill:act-tax-relief-and-growth:1",
  act: "act-tax-relief-and-growth",
  title: "Tax Relief and Growth Act",
  sponsor: "bipartisan",
  introducedTurn: base.turn,
  status: "on-the-desk",
  presentedOn: base.calendar,
  passage: [
    { chamber: "house", yeas: 231, nays: 199, required: 218, passed: true },
    { chamber: "senate", yeas: 61, nays: 39, required: 60, passed: true },
  ],
};

const obligation: ReportObligation = {
  id: `wpr:${TARGET}:${base.turn}`,
  target: TARGET,
  kind: "hostilities",
  rung: 4,
  openedDay: campaignDay(base),
  openedDate: base.calendar,
  dueDay: campaignDay(base) + 2,
  description: "Forces introduced into hostilities.",
};

const emergency: DeclaredEmergency = {
  id: "emergency:nation:armed-conflict:1",
  scope: { kind: "nation" },
  cause: "armed-conflict",
  declaredTurn: base.turn,
  renewedTurn: base.turn,
  reason: "A national emergency was declared over an armed conflict requiring the armed forces.",
};

const proceeding: CourtProceeding = {
  id: "proceeding:fair-housing:1",
  subject: { kind: "fair-housing-enforcement", complaintId: "complaint:1" },
  matter: {
    kind: "fair-housing-enforcement",
    title: "United States v. Example Housing",
    parties: [{ name: "United States", role: "plaintiff" }, { name: "Example Housing", role: "defendant" }],
    injury: "Refusal to rent.",
    jurisdiction: "Federal question.",
    question: "Whether the refusal violated the Fair Housing Act.",
    authority: "42 U.S.C. §3614",
    disputedFacts: "The reason for the refusal.",
    reliefSought: "Civil penalty.",
    affected: "One family.",
  },
  filedTurn: base.turn,
  stage: "supreme-merits",
  nextTurn: base.turn + 4,
  history: [],
  calendar: scheduleSupremeArgument(base),
};

/** The opening campaign with one of every clock the fixture does not already carry. */
const loaded: Campaign = {
  ...base,
  bills: { ...base.bills, [deskBill.id]: deskBill },
  security: { ...base.security, warPowers: { obligations: [obligation] } },
  emergencies: { ...base.emergencies, [emergency.id]: emergency },
  judiciary: { ...base.judiciary, proceedings: [...(base.judiciary.proceedings ?? []), proceeding] },
};

describe("the calendar", () => {
  const events = buildCalendar(loaded);

  it("is sorted by date", () => {
    const ordered = events.every((event, index) => index === 0 || compareDates(events[index - 1]!.date, event.date) <= 0);
    expect(ordered).toBe(true);
  });

  it("hears from every source when each has something dated", () => {
    const kinds = new Set(events.map((event) => event.kind));
    const expected: readonly CalendarEventKind[] = [
      "milestone", "election", "foreign-election", "legislative", "appointment", "court", "war-powers", "emergency", "clock", "deadline",
    ];
    expect(expected.filter((kind) => !kinds.has(kind))).toEqual([]);
    expect(events.some((event) => event.id === `bill:${deskBill.id}:signing`)).toBe(true);
    expect(events.some((event) => event.id === `court:${proceeding.id}:argument`)).toBe(true);
    expect(events.some((event) => event.id.startsWith(`emergency:${emergency.id}`))).toBe(true);
  });

  it("dates the War Powers windows the statute sets and cites it", () => {
    const report = events.find((event) => event.id === `war-powers:${obligation.id}:report`);
    const sixty = events.find((event) => event.id === `war-powers:${obligation.id}:sixty`);
    expect(report?.date).toEqual(addDays(base.calendar, 2));
    expect(sixty?.date).toEqual(addDays(base.calendar, 62));
    expect(sixty?.authorityCite).toBe("50 U.S.C. §1544(b)");
    expect(sixty?.urgency).toBe("hard");
  });

  it("moves the live War Powers deadline to day ninety once the extension is certified", () => {
    const extended: Campaign = {
      ...loaded,
      security: { ...loaded.security, warPowers: { obligations: [{ ...obligation, extension: { certifiedDay: campaignDay(base), necessity: "Withdrawal." } }] } },
    };
    const war = buildCalendar(extended).filter((event) => event.kind === "war-powers");
    const ninety = war.find((event) => event.id.endsWith(":ninety"));
    expect(ninety).toMatchObject({ urgency: "hard", summons: "war-powers-termination" });
    expect(war.find((event) => event.id.endsWith(":sixty"))).toMatchObject({ urgency: "ambient" });
    expect(war.find((event) => event.id.endsWith(":sixty"))?.summons).toBeUndefined();
  });

  it("puts a national emergency's lapse on its anniversary", () => {
    const lapse = events.find((event) => event.id === `emergency:${emergency.id}:anniversary`);
    expect(lapse?.authorityCite).toBe("50 U.S.C. §1622(d)");
    expect(daysUntil(loaded, lapse!.date)).toBe(52 * 7);
  });

  it("names the midterms, the next presidential election and the term's end", () => {
    const titles = events.map((event) => event.title);
    expect(titles).toContain("Midterm elections");
    expect(titles).toContain("Presidential election");
    expect(titles).toContain("The term ends at noon");
  });

  it("holds only real calendar dates", () => {
    expect(events.filter((event) => !isValidDate(event.date))).toEqual([]);
  });

  it("gives the same ids on every read, and no id twice", () => {
    const ids = events.map((event) => event.id);
    expect(buildCalendar(loaded).map((event) => event.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is derived on read and never writes to the campaign", () => {
    const before = structuredClone(loaded);
    buildCalendar(loaded);
    buildCalendar(loaded, { horizonDays: 30, exclude: ["foreign-election"] });
    termTimeline(loaded);
    expect(loaded).toEqual(before);
  });

  it("reads only as far as asked, and leaves out excluded kinds", () => {
    const near = buildCalendar(loaded, { horizonDays: 14, exclude: ["foreign-election"] });
    expect(near.every((event) => daysUntil(loaded, event.date) <= 14)).toBe(true);
    expect(near.some((event) => event.kind === "foreign-election")).toBe(false);
  });
});

describe("calendar views", () => {
  const events = buildCalendar(loaded);

  it("lays a month out in whole weeks with each event on its day", () => {
    const month = calendarMonth(events, 2029, 1);
    expect(month.weeks.every((week) => week.length === 7)).toBe(true);
    const days = month.weeks.flat();
    expect(days.filter((day) => day.inMonth)).toHaveLength(31);
    const inauguration = days.find((day) => day.inMonth && day.date.day === 22);
    expect(inauguration?.events.some((event) => event.kind === "war-powers")).toBe(true);
  });

  it("groups an agenda by day, only the days that hold something", () => {
    const days = agenda(events, loaded.calendar, 90);
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((day) => day.events.length > 0 && daysUntil(loaded, day.date) < 90)).toBe(true);
  });

  it("measures the term from oath to end with today on it", () => {
    const timeline = termTimeline(loaded);
    expect(timeline.marks[0]?.kind).toBe("term-start");
    expect(timeline.marks.at(-1)?.kind).toBe("term-end");
    expect(timeline.marks.map((mark) => mark.kind)).toEqual(
      expect.arrayContaining(["hundred-days", "midterm-election", "presidential-election"]),
    );
    expect(timeline.progress).toBeGreaterThanOrEqual(0);
    expect(timeline.progress).toBeLessThan(1);
  });
});
