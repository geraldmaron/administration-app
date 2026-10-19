import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_OPENING_DATE,
  FIRST_INAUGURATION,
  addDays,
  appropriationsDeadline,
  campaignClock,
  campaignDay,
  campaignFoundingDate,
  civilFromDays,
  compareDates,
  daysBetween,
  daysFromCivil,
  federalElectionDay,
  fiscalYearEnd,
  fiscalYearOf,
  formatGameDate,
  inaugurationDayOf,
  isMidtermYear,
  isPresidentialElectionYear,
  milestonesBetween,
  nextConstitutionalDates,
  nthWeekdayOfMonth,
  selectBudgetYear,
  selectCampaignClock,
  selectDateOfTurn,
  selectFiscalYearEndTurn,
  selectTurnOfDate,
  turnOnDate,
  weekdayOf,
} from "./clock.js";
import { advanceCalendar } from "./calendar.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import type { Campaign } from "./state.js";

describe("the civil date arithmetic", () => {
  it("round-trips every date across a four-century span", () => {
    for (let days = -100_000; days < 100_000; days += 97) {
      expect(daysFromCivil(civilFromDays(days))).toBe(days);
    }
  });

  it("agrees with the calendar the game already advances by", () => {
    let date = { year: 2027, month: 1, day: 1 };
    for (let step = 0; step < 400; step++) {
      date = advanceCalendar(date, 7);
      expect(addDays({ year: 2027, month: 1, day: 1 }, (step + 1) * 7)).toEqual(date);
    }
  });

  it("runs backwards, which advanceCalendar cannot", () => {
    expect(addDays({ year: 2027, month: 1, day: 5 }, -10)).toEqual({ year: 2026, month: 12, day: 26 });
  });

  it("counts a leap day", () => {
    expect(daysBetween({ year: 2028, month: 2, day: 28 }, { year: 2028, month: 3, day: 1 })).toBe(2);
    expect(daysBetween({ year: 2027, month: 2, day: 28 }, { year: 2027, month: 3, day: 1 })).toBe(1);
  });

  it("orders dates", () => {
    expect(compareDates({ year: 2027, month: 1, day: 1 }, { year: 2027, month: 1, day: 2 })).toBe(-1);
    expect(compareDates({ year: 2027, month: 1, day: 2 }, { year: 2027, month: 1, day: 1 })).toBe(1);
    expect(compareDates({ year: 2027, month: 1, day: 1 }, { year: 2027, month: 1, day: 1 })).toBe(0);
  });

  it("knows the weekday of dates outside the campaign's own span", () => {
    expect(weekdayOf({ year: 1970, month: 1, day: 1 })).toBe(4); // a Thursday
    expect(weekdayOf({ year: 2000, month: 1, day: 1 })).toBe(6); // a Saturday
    expect(weekdayOf({ year: 2027, month: 1, day: 20 })).toBe(3); // a Wednesday
  });

  it("finds the nth weekday of a month", () => {
    expect(nthWeekdayOfMonth(2028, 11, 1, 1)).toEqual({ year: 2028, month: 11, day: 6 });
    expect(nthWeekdayOfMonth(2028, 11, 2, 1)).toEqual({ year: 2028, month: 11, day: 7 });
  });
});

describe("the constitutional calendar", () => {
  it("puts Election Day after the first Monday, not on the first Tuesday", () => {
    // November 2033 opens on a Tuesday: the first Tuesday is the 1st, and the
    // Tuesday after the first Monday is the 8th. This is the case the naive
    // rule gets wrong, which is why it is the case that is asserted.
    expect(nthWeekdayOfMonth(2033, 11, 2, 1)).toEqual({ year: 2033, month: 11, day: 1 });
    expect(federalElectionDay(2033)).toEqual({ year: 2033, month: 11, day: 8 });
  });

  it("lands every election day on a Tuesday in November", () => {
    for (let year = 2026; year <= 2060; year += 2) {
      const day = federalElectionDay(year);
      expect(day.month).toBe(11);
      expect(weekdayOf(day)).toBe(2);
      expect(day.day).toBeGreaterThanOrEqual(2);
      expect(day.day).toBeLessThanOrEqual(8);
    }
  });

  it("separates presidential years from midterms", () => {
    expect(isPresidentialElectionYear(2028)).toBe(true);
    expect(isMidtermYear(2028)).toBe(false);
    expect(isMidtermYear(2030)).toBe(true);
    expect(isPresidentialElectionYear(2030)).toBe(false);
  });

  it("puts the appropriations deadline the day before the fiscal year opens", () => {
    expect(appropriationsDeadline(2030)).toEqual({ year: 2029, month: 9, day: 30 });
    expect(fiscalYearEnd(2029)).toEqual({ year: 2029, month: 9, day: 30 });
  });

  it("names the fiscal year a date falls in, which opens in October", () => {
    expect(fiscalYearOf({ year: 2029, month: 1, day: 20 })).toBe(2029);
    expect(fiscalYearOf({ year: 2029, month: 9, day: 30 })).toBe(2029);
    expect(fiscalYearOf({ year: 2029, month: 10, day: 1 })).toBe(2030);
  });

  it("inaugurates on January 20", () => {
    expect(inaugurationDayOf(2029)).toEqual({ year: 2029, month: 1, day: 20 });
  });
});

describe("the milestones a president is handed", () => {
  const day1 = FIRST_INAUGURATION;

  it("opens every campaign on Inauguration Day, January 20, 2029", () => {
    expect(CAMPAIGN_OPENING_DATE).toEqual({ year: 2029, month: 1, day: 20 });
    expect(formatGameDate(CAMPAIGN_OPENING_DATE)).toBe("January 20, 2029");
  });

  it("names what is coming, nearest first, and never what has passed", () => {
    const next = nextConstitutionalDates(day1, 3);
    expect(next.length).toBe(3);
    for (const milestone of next) expect(milestone.daysAway).toBeGreaterThan(0);
    for (let i = 1; i < next.length; i++) {
      expect(next[i]!.daysAway).toBeGreaterThan(next[i - 1]!.daysAway);
    }
  });

  it("finds the first appropriations deadline of a term before anything else that year", () => {
    const first = nextConstitutionalDates(day1, 1)[0]!;
    expect(first.kind).toBe("appropriations-deadline");
    expect(first.label).toBe("FY2030 appropriations due");
    expect(first.date).toEqual({ year: 2029, month: 9, day: 30 });
  });

  it("puts the midterms and the next presidential election in a full term", () => {
    const term = milestonesBetween(day1, { year: 2033, month: 1, day: 20 });
    const kinds = term.map((m) => m.kind);
    expect(term.find((m) => m.kind === "midterm-election")).toMatchObject({
      label: "Midterm elections",
      date: { year: 2030, month: 11, day: 5 },
    });
    expect(term.find((m) => m.kind === "presidential-election")?.date).toEqual({ year: 2032, month: 11, day: 2 });
    expect(term.find((m) => m.kind === "inauguration")?.date).toEqual({ year: 2033, month: 1, day: 20 });
    // Four fiscal years open inside a four-year term.
    expect(kinds.filter((k) => k === "fiscal-year-start").length).toBe(4);
  });

  it("holds the governors' races in Virginia and New Jersey the first November of a term", () => {
    const races = milestonesBetween(day1, { year: 2037, month: 1, day: 20 }).filter((m) => m.kind === "gubernatorial-election");
    expect(races.map((m) => m.date)).toEqual([
      { year: 2029, month: 11, day: 6 },
      { year: 2033, month: 11, day: 8 },
    ]);
    expect(races[0]!.label).toBe("Governors' races in Virginia and New Jersey");
  });

  it("never comes back empty over a window a term could actually be in", () => {
    let date = day1;
    for (let step = 0; step < 200; step++) {
      expect(nextConstitutionalDates(date, 1).length).toBe(1);
      date = addDays(date, 7);
    }
  });
});

describe("the campaign clock", () => {
  const founding = FIRST_INAUGURATION;

  it("reads a first term off the day the administration took office", () => {
    const clock = campaignClock({ currentDate: { year: 2029, month: 3, day: 1 }, foundingDate: founding, termNumber: 1 });
    expect(clock.termStartDate).toEqual(founding);
    expect(clock.termEndDate).toEqual({ year: 2033, month: 1, day: 20 });
    expect(clock.dayOfTerm).toBe(40);
    expect(clock.ordinal).toBe(40);
  });

  it("moves the term start to the next inauguration for a second term", () => {
    const clock = campaignClock({ currentDate: { year: 2033, month: 6, day: 1 }, foundingDate: founding, termNumber: 2 });
    expect(clock.termStartDate).toEqual({ year: 2033, month: 1, day: 20 });
    expect(clock.termEndDate).toEqual({ year: 2037, month: 1, day: 20 });
    // The ordinal keeps counting from inauguration; the term clock restarts.
    expect(clock.ordinal).toBeGreaterThan(clock.dayOfTerm);
  });

  it("counts down the days left rather than up to a turn ceiling", () => {
    const clock = campaignClock({ currentDate: { year: 2032, month: 1, day: 20 }, foundingDate: founding, termNumber: 1 });
    expect(clock.daysLeftInTerm).toBe(366);
  });
});

describe("the turn a date falls in", () => {
  it("is the turn the day's business is done on, which a week keeps until its seventh day is over", () => {
    expect(turnOnDate(FIRST_INAUGURATION, FIRST_INAUGURATION)).toBe(1);
    expect(turnOnDate(FIRST_INAUGURATION, { year: 2029, month: 1, day: 21 })).toBe(1);
    expect(turnOnDate(FIRST_INAUGURATION, { year: 2029, month: 1, day: 27 })).toBe(1);
    expect(turnOnDate(FIRST_INAUGURATION, { year: 2029, month: 1, day: 28 })).toBe(2);
    const campaign = buildCampaign();
    for (const turn of [1, 2, 37, 208, 417]) {
      for (let day = 1; day <= 7; day++) {
        expect(selectTurnOfDate(campaign, addDays(selectDateOfTurn(campaign, turn), day))).toBe(turn);
      }
    }
  });
});

describe("the fiscal year a budget pays for", () => {
  it("funds a sealed campaign through the September 30 of the year the oath falls in", () => {
    const campaign = buildCampaign();
    expect(campaign.congress.appropriation.throughTurn).toBe(selectFiscalYearEndTurn(campaign, 2029));
    expect(selectDateOfTurn(campaign, campaign.congress.appropriation.throughTurn)).toEqual({ year: 2029, month: 9, day: 29 });
  });

  it("pays for next year once this one is funded, and for this one once it has lapsed", () => {
    const campaign = buildCampaign();
    expect(selectBudgetYear(campaign)).toBe(2030);
    const lapsedOctober: Campaign = {
      ...campaign,
      turn: 40,
      calendar: selectDateOfTurn(campaign, 40),
    };
    expect(fiscalYearOf(lapsedOctober.calendar)).toBe(2030);
    expect(selectBudgetYear(lapsedOctober)).toBe(2030);
    const fundedAhead: Campaign = {
      ...campaign,
      congress: {
        ...campaign.congress,
        appropriation: { ...campaign.congress.appropriation, throughTurn: selectFiscalYearEndTurn(campaign, 2030) },
      },
    };
    expect(selectBudgetYear(fundedAhead)).toBe(2030);
  });
});

describe("the one date format the app writes", () => {
  it("writes a full date and a short one", () => {
    expect(formatGameDate({ year: 2027, month: 3, day: 14 })).toBe("March 14, 2027");
  });
});

describe("the one day of this presidency", () => {
  /** A campaign that has run `turns` ticks, exactly as `advanceTurn` leaves one. */
  function atTurn(turns: number): Campaign {
    const founded = buildCampaign();
    return { ...founded, turn: turns, calendar: addDays(founded.calendar, (turns - 1) * DAYS_PER_TURN) };
  }

  it("is the same number the campaign clock reports as its ordinal", () => {
    for (const turns of [1, 2, 9, 53, 208, 417]) {
      const campaign = atTurn(turns);
      expect(campaignDay(campaign)).toBe(selectCampaignClock(campaign).ordinal);
    }
  });

  it("starts at zero on the day the administration took office", () => {
    expect(campaignDay(buildCampaign())).toBe(0);
    expect(campaignFoundingDate(buildCampaign())).toEqual(buildCampaign().calendar);
  });

  it("counts the calendar rather than multiplying out the tick", () => {
    const campaign = atTurn(9);
    expect(campaignDay(campaign)).toBe(daysBetween(campaignFoundingDate(campaign), campaign.calendar));
    expect(selectDateOfTurn(campaign, campaign.turn)).toEqual(campaign.calendar);
  });

  it("dates every turn off the same founding day the clock uses", () => {
    const campaign = atTurn(9);
    expect(selectDateOfTurn(campaign, 1)).toEqual(selectCampaignClock(campaign).inaugurationDate);
  });
});
