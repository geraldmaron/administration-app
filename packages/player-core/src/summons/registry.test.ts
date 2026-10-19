import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { daysBetween, selectSigningWindow, type Campaign } from "@admin/engine";
import { dueClocks, dueSummonses, stopsTheWeek, summonsReading } from "./registry";
import { CLOCKS } from "./clocks";

/** The clocks that stop the week rather than waiting in the inbox. */
function interrupting(campaign: Campaign) {
  return dueClocks(campaign).filter(stopsTheWeek);
}
import type { SummonsBrief } from "./types";



const campaign = openingCampaign();
const CAMPAIGN = campaign;

/** Every string a brief puts on screen, so one sweep can prove none of them is a formatting failure. */
function briefText(brief: SummonsBrief): string {
  return [
    brief.title,
    brief.clockLine,
    brief.figure,
    brief.counsel,
    brief.door.label,
    ...brief.history.flatMap((line) => [line.label, line.detail]),
    ...brief.posture.flatMap((cell) => [cell.caption, cell.figure]),
  ].join(" | ");
}

describe("the summons registry", () => {
  it("covers every clock the campaign state carries", () => {
    expect(CLOCKS.map((spec) => spec.id).sort()).toEqual(
      [
        "acting-authority",
        "appropriation",
        "aumf-expiry",
        "bill-desk",
        "departure-transition",
        "election-milestone",
        "nomination-stage",
        "removal-beat",
        "rule-disapproval",
        "rule-effective",
        "ruling-due",
        "shutdown",
        "treaty-ratification",
        "war-powers-report",
        "war-powers-termination",
      ].sort(),
    );
  });

  it("gives every clock exactly one spec", () => {
    const ids = CLOCKS.map((spec) => spec.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names every clock in a short label of its own", () => {
    // The context bar's narrowest caption holds about 18 characters; a label
    // past that is cut to an ellipsis, and two clocks sharing one would read
    // as the same obligation.
    const labels = CLOCKS.map((spec) => spec.label);
    for (const label of labels) {
      expect(label.trim()).not.toBe("");
      expect(label.length, label).toBeLessThanOrEqual(18);
    }
    expect(new Set(labels).size).toBe(labels.length);
  });

  describe.each(CLOCKS.map((spec) => [spec.id, spec] as const))("%s", (_id, spec) => {
    it("either has no subject at founding or names a real turn", () => {
      const due = spec.due(campaign);
      if (due === undefined) return;
      expect(Number.isFinite(due.dueTurn)).toBe(true);
      expect(Number.isNaN(due.dueTurn)).toBe(false);
      expect(["due", "closing", "standing"]).toContain(due.urgency);
      // Day-precise, so a report owed in two days and one owed in six are not
      // the same figure, and named, so a matter can say what it is about.
      expect(Number.isFinite(due.dueDate.year)).toBe(true);
      expect(due.subject.trim()).not.toBe("");
      expect(due.title.trim()).not.toBe("");
    });

    it("composes a brief that never throws and states no non-figure", () => {
      const brief = spec.compose(campaign);
      const text = briefText(brief);
      expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(brief.title.trim()).not.toBe("");
      expect(brief.clockLine.trim()).not.toBe("");
      expect(brief.counsel.trim()).not.toBe("");
      expect(brief.figure.trim()).not.toBe("");
    });

    it("names an owning room, a class and a source of presidential attention", () => {
      expect(spec.owner).toBeTruthy();
      expect(["interruption", "document"]).toContain(spec.class);
      expect(spec.source).toBeTruthy();
    });
  });

  it("ranks a lapsed clock above one that is merely closing", () => {
    const ranked = dueSummonses(campaign);
    const urgencies = ranked.map((summons) => summons.due.urgency);
    const firstStanding = urgencies.indexOf("standing");
    const lastDue = urgencies.lastIndexOf("due");
    if (firstStanding !== -1 && lastDue !== -1) expect(lastDue).toBeLessThan(firstStanding);
  });

  it("interrupts only for a clock that has actually landed", () => {
    for (const clock of interrupting(campaign)) {
      expect(clock.spec.class).toBe("interruption");
      expect(clock.due.urgency).toBe("due");
    }
  });

  it("gives every running clock a subject, which is what replaced badgedBy", () => {
    // The badge ownership law used to be a field naming the attention row a
    // clock must not double-count. It is a subject now: two readings of one
    // fact carry one subject, and the composer shows one of them.
    for (const clock of interrupting(campaign)) {
      expect(clock.due.subject.trim()).not.toBe("");
    }
    expect(CLOCKS.every((spec) => !("badgedBy" in spec))).toBe(true);
  });
});

describe("the window behind a clock", () => {
  it("gives the desk window its own length rather than only the week it closes", () => {
    const bill = {
      id: "bill-x",
      title: "The farm bill",
      introducedTurn: CAMPAIGN.turn - 1,
      sponsor: "bipartisan",
      passage: [],
      status: "on-the-desk",
    } as unknown as Campaign["bills"][string];
    const campaign: Campaign = { ...CAMPAIGN, bills: { ...CAMPAIGN.bills, "bill-x": bill } };
    const reading = summonsReading(campaign, "bill-desk");
    const window = reading?.brief.window;
    expect(window, "a bill on the desk is the one clock a rule gives a length").toBeDefined();
    // Ten days, Sundays excepted, counted in the days the Constitution counts.
    const signing = selectSigningWindow(campaign, bill);
    expect(window!.unit).toBe("day");
    expect(window!.length).toBe(signing.windowDays);
    // Never pre-divided: the folio is handed the window and the consumption so
    // it cannot lose the denominator on the way in.
    expect(window!.consumed).toBe(daysBetween(signing.presentedOn, campaign.calendar));
  });

  it("leaves a dated obligation with no countdown without a window at all", () => {
    const reading = summonsReading(CAMPAIGN, "election-milestone");
    expect(reading?.brief.window, "an election has a date, not a window").toBeUndefined();
  });
});
