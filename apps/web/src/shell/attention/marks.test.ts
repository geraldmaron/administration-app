import { describe, expect, it } from "vitest";
import type { BriefMatter } from "@admin/player-core";
import { attentionMarks, countsByPlace, isFresh, marksOnPage, withSeen, type AttentionMark } from "./marks";

function matter(id: string, href: string | undefined, extra: Partial<BriefMatter> = {}): BriefMatter {
  return { id, kind: "row", kindLabel: "Row", kindIcon: "brief", title: id, reason: "", urgency: "soft", stance: "neutral", holds: false, ...(href ? { href } : {}), ...extra } as BriefMatter;
}

describe("attentionMarks", () => {
  it("counts each matter under the destination its answer lives in, with its section", () => {
    const marks = attentionMarks([matter("b1", "/washington/congress/bill/b1#bill-desk"), matter("c1", "/washington/courts/case/c1?tab=x"), matter("p1", "/washington/person/p1"), matter("none", undefined)], []);
    expect(countsByPlace(marks, {})).toEqual({ congress: { fresh: 1, waiting: 1 }, courts: { fresh: 1, waiting: 1 }, washington: { fresh: 1, waiting: 1 } });
    expect(marks[0]).toMatchObject({ path: "/washington/congress/bill/b1", anchor: "bill-desk" });
    expect(marks[1]?.anchor).toBeUndefined();
  });

  it("keeps the Brief's count to what holds time and never counts the Desk's own pages", () => {
    const marks = attentionMarks([matter("d1", "/brief/decision/d1", { holds: true }), matter("d2", "/brief/digest")], []);
    expect(countsByPlace(marks, {})).toEqual({ brief: { fresh: 1, waiting: 1 } });
  });

  it("adds standing work to what the Desk routes to the same place", () => {
    const standing: AttentionMark = { id: "standing:budget", place: "budget", title: "Funding runs out in 6 weeks", href: "/nation/budget#budget-status", path: "/nation/budget", anchor: "budget-status", version: "short" };
    const marks = attentionMarks([matter("f1", "/nation/budget#budget-status")], [standing]);
    expect(countsByPlace(marks, {}).budget).toEqual({ fresh: 2, waiting: 2 });
  });
});

describe("seen state", () => {
  const due = { year: 2029, month: 5, day: 3 };
  const [bill] = attentionMarks([matter("b1", "/washington/congress/bill/b1#bill-desk", { due })], []);

  it("clears the new count once seen and keeps the work waiting", () => {
    const ledger = withSeen({}, [bill!], [bill!]);
    expect(isFresh(bill!, ledger)).toBe(false);
    expect(countsByPlace([bill!], ledger).congress).toEqual({ fresh: 0, waiting: 1 });
  });

  it("turns new again when the deadline or the urgency changes", () => {
    const ledger = withSeen({}, [bill!], [bill!]);
    const [moved] = attentionMarks([matter("b1", "/washington/congress/bill/b1#bill-desk", { due: { ...due, day: 10 } })], []);
    const [sharper] = attentionMarks([matter("b1", "/washington/congress/bill/b1#bill-desk", { due, urgency: "hard" })], []);
    expect(isFresh(moved!, ledger)).toBe(true);
    expect(isFresh(sharper!, ledger)).toBe(true);
  });

  it("forgets marks that no longer exist", () => {
    const [other] = attentionMarks([matter("o1", "/nation/budget")], []);
    expect(withSeen({ gone: "x" }, [other!], [other!])).toEqual({ o1: other!.version });
  });

  it("finds the marks a page shows", () => {
    expect(marksOnPage([bill!], "/washington/congress/bill/b1/").map((mark) => mark.id)).toEqual(["b1"]);
    expect(marksOnPage([bill!], "/washington/congress")).toEqual([]);
  });
});
