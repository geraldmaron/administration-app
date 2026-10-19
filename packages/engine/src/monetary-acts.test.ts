/**
 * The chair's tilt, leaning on the Fed through the act path, the lean counting
 * at one meeting only, and the meeting going on the record the same week the
 * rate moves.
 */
import { describe, expect, it } from "vitest";
import type { NationId, PersonId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { addDays, compareDates, weekdayOf } from "./clock.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { macroStep } from "./macro-drivers.js";
import {
  FED_CHAIR_TILT_SCALE,
  FED_PRESSURE_TILT,
  chairTilt,
  fedChair,
  fedDecision,
  fedRecord,
  fomcDecisionInWeekEnding,
  leanStanding,
  nextFomcDecision,
} from "./monetary.js";
import { leanOnTheFed, projectFedLean } from "./monetary-acts.js";
import { restingProgram } from "./governance.js";
import { weekOpenDate } from "./feed-cap.js";
import type { Campaign } from "./state.js";

const { campaign: FOUNDED } = foundedForBalance("fed-acts", "democrat", {}, { carriedWorld: false });

function withChairOutlook(campaign: Campaign, outlook: number): Campaign {
  const chair = fedChair(campaign);
  if (!chair) throw new Error("the fixture seats no Fed chair");
  const base = { ...chair.base, ideology: { ...chair.base.ideology, economicLeftRight: outlook } };
  return { ...campaign, people: { ...campaign.people, [chair.base.id as PersonId]: { ...chair, base } } };
}

/** Weeks forward until the week holds a decision. */
function toDecisionWeek(campaign: Campaign): Campaign {
  let working = campaign;
  for (let week = 0; week < 12 && !fomcDecisionInWeekEnding(weekOpenDate(working)); week += 1) working = withWeeksElapsed(working, 1);
  return working;
}

describe("the chair's tilt", () => {
  it("reads the seated chair's economic outlook, bounded by the rule's tilt limit", () => {
    expect(fedChair(FOUNDED)).toBeDefined();
    expect(chairTilt(withChairOutlook(FOUNDED, 1))).toBeCloseTo(FED_CHAIR_TILT_SCALE, 9);
    expect(chairTilt(withChairOutlook(FOUNDED, -1))).toBeCloseTo(-FED_CHAIR_TILT_SCALE, 9);
    expect(chairTilt(withChairOutlook(FOUNDED, 0))).toBe(0);
  });
});

describe("leaning on the Fed", () => {
  it("is priced before it is taken and commits through the ordinary act path", () => {
    const projection = projectFedLean(FOUNDED, "ease");
    expect(projection.ok).toBe(true);
    if (!projection.ok) return;
    expect(projection.bound).toBe(-FED_PRESSURE_TILT);
    expect(projection.cost.standing).toBeLessThan(0);
    const result = leanOnTheFed(FOUNDED, "ease");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.actor).toBe("player");
    const leaned = apply(FOUNDED, result.packet);
    expect(leaned.markets?.fed?.pressure?.bound).toBe(-FED_PRESSURE_TILT);
    expect(projectFedLean(leaned, "tighten").ok).toBe(false);
  });

  it("counts at the next meeting and at no meeting after it", () => {
    const result = leanOnTheFed(FOUNDED, "tighten");
    if (!result.ok) throw new Error(result.reason);
    const leaned = apply(FOUNDED, result.packet);
    const next = nextFomcDecision(leaned.calendar);
    expect(leanStanding(leaned, next)).toBe(1);
    const recorded = { ...leaned, markets: { ...leaned.markets!, fed: { ...leaned.markets!.fed!, meetings: [{ date: next, target: 0.04, rate: 0.04 }] } } };
    const following = nextFomcDecision(addDays(next, 1));
    expect(leanStanding(recorded, following)).toBe(0);
  });

  it("moves the rule by at most the stated bound, at the first meeting after the lean", () => {
    let quiet = FOUNDED;
    while (fomcDecisionInWeekEnding(weekOpenDate(quiet))) quiet = withWeeksElapsed(quiet, 1);
    const result = leanOnTheFed(quiet, "tighten");
    if (!result.ok) throw new Error(result.reason);
    const plainWeek = toDecisionWeek(quiet);
    const leanedWeek = toDecisionWeek(apply(quiet, result.packet));
    const us = plainWeek.founding.nation as NationId;
    const plain = macroStep(plainWeek, plainWeek.nations[us]!, us, restingProgram(plainWeek, us)).rule;
    const leaned = macroStep(leanedWeek, leanedWeek.nations[us]!, us, restingProgram(leanedWeek, us)).rule;
    expect(Math.abs(leaned - plain)).toBeLessThanOrEqual(FED_PRESSURE_TILT + 0.0025 + 1e-9);
    expect(leaned).not.toBe(plain);
  });
});

describe("the meeting on the record", () => {
  it("records the rate the rule sets, on the day the calendar holds the meeting", () => {
    const week = toDecisionWeek(FOUNDED);
    const decision = fedDecision(week);
    expect(decision).toBeDefined();
    expect(weekdayOf(decision!.date)).toBe(4);
    const record = fedRecord(week);
    expect(record?.meetings?.at(-1)).toEqual({ date: decision!.date, target: decision!.target, rate: decision!.rate });
  });

  it("holds no meeting in a week without one", () => {
    let week = FOUNDED;
    while (fomcDecisionInWeekEnding(weekOpenDate(week))) week = withWeeksElapsed(week, 1);
    expect(fedDecision(week)).toBeUndefined();
    expect(fedRecord(week)?.meetings ?? []).toEqual([]);
  });

  it("files one meeting per date: a second decision on the same day replaces the first", () => {
    const week = toDecisionWeek(FOUNDED);
    const decision = fedDecision(week)!;
    const seeded = { date: decision.date, target: decision.target + 0.01, rate: decision.rate + 0.01 };
    const markets = week.markets ?? ({} as NonNullable<Campaign["markets"]>);
    const filedTwice = { ...week, markets: { ...markets, fed: { rate: seeded.rate, chairTilt: 0, meetings: [seeded] } } } as Campaign;
    const meetings = fedRecord(filedTwice)?.meetings ?? [];
    expect(meetings.filter((meeting) => compareDates(meeting.date, decision.date) === 0)).toHaveLength(1);
    expect(meetings.at(-1)).toEqual({ date: decision.date, target: decision.target, rate: decision.rate });
  });
});
