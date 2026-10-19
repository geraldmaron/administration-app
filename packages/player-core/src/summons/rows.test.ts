import { describe, expect, it } from "vitest";
import { addDays, selectDateOfTurn, type Campaign, type GameDate } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { attentionItems } from "../desk/attention";
import { appropriationDue } from "./due-legislative";
import { dayCount, weekCount } from "./clock-math";
import { dueFigure, dueSentence, summonsItems } from "./rows";
import { SUMMONS_DUE } from "./due";
import type { SummonsDue } from "./types";

const base = openingCampaign();

/** A campaign whose appropriation ran out a week ago: the money clock, landed. */
function lapsed(): Campaign {
  return {
    ...base,
    turn: 11,
    congress: {
      ...base.congress,
      appropriation: { enactedTurn: 2, throughTurn: 9, onPriorYear: false, priorYear: [] },
    },
  };
}

function dueOn(today: GameDate, days: number): SummonsDue {
  return {
    dueTurn: 0,
    dueDate: addDays(today, days),
    urgency: days <= 0 ? "due" : "closing",
    subject: "probe",
    title: "A report",
  };
}

describe("the statutory clocks as rows of what needs the President", () => {
  it("reads two days and six days as different obligations", () => {
    // The conflation this replaced: a summons carried only `dueTurn`, so a
    // report owed inside forty-eight hours and one owed on Friday rounded to
    // the same week and printed the same figure.
    const today = base.calendar;
    expect(dueFigure(today, dueOn(today, 2))).toBe("2 days");
    expect(dueFigure(today, dueOn(today, 6))).toBe("6 days");
    expect(dueSentence(today, dueOn(today, 2))).not.toBe(dueSentence(today, dueOn(today, 6)));
  });

  it("counts a clock whose date has passed up rather than calling it overdue", () => {
    // A shutdown and an unratified treaty have no deadline to be past: what
    // they have is a start date and a length, and the reading says so.
    const today = base.calendar;
    expect(dueSentence(today, dueOn(today, -20))).toMatch(/^Running since /);
    expect(dueFigure(today, dueOn(today, -20))).toBe("Lapsed");
  });

  it("gives two weeks or more its figure in weeks, where the day is false precision", () => {
    const today = base.calendar;
    expect(dueFigure(today, dueOn(today, 90))).toBe("13 weeks");
  });

  it("stops the week only for a clock that has landed and can be answered", () => {
    const rows = new Map(summonsItems(lapsed()).map((row) => [row.id, row] as const));
    // Interruption class, due: the money has run out, and an appropriation is
    // something the President can actually go and get.
    expect(rows.get("summons:appropriation")?.urgency).toBe("hard");
  });

  it("keeps a date nobody can move out of the three, however close it is", () => {
    // The election is on the calendar and the office cannot move it. A matter
    // that stops the world and has no answer is a Continue that spends no time.
    const rows = new Map(summonsItems(base).map((row) => [row.id, row] as const));
    expect(rows.get("summons:election-milestone")?.urgency).toBe("ambient");
    expect(SUMMONS_DUE.find((spec) => spec.id === "election-milestone")?.answerable).toBe(false);
  });

  it("carries a subject, a title, a source and a day on every row it draws", () => {
    const rows = summonsItems(lapsed());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.subject.trim()).not.toBe("");
      expect(row.title.trim()).not.toBe("");
      expect(row.source.trim()).not.toBe("");
      expect(row.dueDate).toBeDefined();
      expect(row.summons).toBeDefined();
    }
  });
});

describe("the first appropriations deadline, said once", () => {
  it("dates the money running out on September 30, not on the week the doors would close", () => {
    const due = appropriationDue(base);
    expect(due?.dueDate).toEqual({ year: 2029, month: 9, day: 30 });
    // The clock still ranks on the week the lapse bites.
    expect(due?.dueTurn).toBe(base.congress.appropriation.throughTurn + 1);
  });

  it("puts one appropriations row on the Desk, under the calendar's name for it", () => {
    const rows = attentionItems(base).filter((item) => /appropriation/i.test(item.title));
    expect(rows.map((row) => row.title)).toEqual(["FY2030 appropriations due"]);
    expect(rows[0]!.dueDate).toEqual({ year: 2029, month: 9, day: 30 });
    expect(rows[0]!.summons).toBe("appropriation");
  });

  it("keeps a stopgap bought in weeks on the week its money runs out", () => {
    const stopgap: Campaign = {
      ...base,
      congress: { ...base.congress, appropriation: { enactedTurn: 2, throughTurn: 12, onPriorYear: true, priorYear: [] } },
    };
    expect(appropriationDue(stopgap)?.dueDate).toEqual(selectDateOfTurn(stopgap, 13));
  });
});

// A clock's figure is read beside dates and deadline tracks that say "days"
// and "weeks"; a bare "154 d" was the one place the app spoke in unit symbols.
describe("the count a clock prints", () => {
  it("spells days out, and turns to weeks at three of them", () => {
    expect(dayCount(1)).toBe("1 day");
    expect(dayCount(20)).toBe("20 days");
    expect(dayCount(21)).toBe("3 weeks");
    expect(dayCount(154)).toBe("22 weeks");
    expect(weekCount(1)).toBe("1 week");
    expect(weekCount(13)).toBe("13 weeks");
  });
});
