import { describe, expect, it } from "vitest";
import { formatReading, legacyDomain, legacyPosition, monthlyActivity, termActivity, termCourse } from "./course";
import { entryInstitutions, entryMark, entryTone } from "./entry-view";
import { filterOf, isFiltered, matchCount, patched, recordHref, recordParams } from "./record-params";

describe("record params", () => {
  it("keeps recognized keys and drops the default view and unknown values", () => {
    expect(recordParams({ view: "acts", actor: "developer", outcome: "helped", q: "tariff", entry: "evt-1", junk: "x" })).toEqual({ outcome: "helped", q: "tariff", entry: "evt-1" });
  });

  it("reads the filter the selector wants, search words as its query", () => {
    expect(filterOf({ actor: "world", q: "flood", entry: "evt-2" })).toEqual({ actor: "world", query: "flood" });
    expect(isFiltered({ entry: "evt-2" })).toBe(false);
  });

  it("patches by clearing what is set to undefined", () => {
    expect(patched({ q: "oil", domain: "Economy" }, { domain: undefined, entry: "evt-3" })).toEqual({ q: "oil", entry: "evt-3" });
  });

  it("links to the list or an entry beside it", () => {
    expect(recordHref({})).toBe("/record");
    expect(recordHref({ view: "promises" })).toBe("/record?view=promises");
    expect(recordHref({ q: "a b", entry: "e" })).toBe("/record?q=a+b&entry=e");
  });

  it("counts matches in words", () => {
    expect(matchCount(0, 0, false)).toBe("No entries yet");
    expect(matchCount(3, 1200, true)).toBe("3 of 1,200 entries match");
    expect(matchCount(1, 1, false)).toBe("1 entry");
  });
});

describe("term course", () => {
  it("splits the kept history at the oath, joining the lines at the oath week", () => {
    const course = termCourse([0.4, 0.42, 0.5, 0.55], (i) => i < 2, 1);
    expect(course.inheritedWeeks).toBe(2);
    expect(course.inherited).toEqual([0.4, 0.42, 0.5, null]);
    expect(course.own).toEqual([null, null, 0.5, 0.55]);
    expect(course.x).toEqual(["2w before", "1w before", "W0", "W1"]);
  });

  it("draws one line when the predecessor's rows have scrolled out", () => {
    const course = termCourse([0.5, 0.51], () => false, 40);
    expect(course.inherited).toEqual([0.5, null]);
    expect(course.own).toEqual([0.5, 0.51]);
    expect(course.x).toEqual(["W39", "W40"]);
  });
});

describe("monthly activity", () => {
  it("counts each side by month and keeps empty months between", () => {
    const rows = [
      { date: { year: 2029, month: 1, day: 20 }, actor: "player" },
      { date: { year: 2029, month: 1, day: 22 }, actor: "world" },
      { date: { year: 2029, month: 3, day: 2 }, actor: "player" },
    ];
    expect(monthlyActivity(rows)).toEqual([
      { key: String(2029 * 12), label: "Jan 29", player: 1, world: 1 },
      { key: String(2029 * 12 + 1), label: "Feb 29", player: 0, world: 0 },
      { key: String(2029 * 12 + 2), label: "Mar 29", player: 1, world: 0 },
    ]);
    expect(monthlyActivity([])).toEqual([]);
  });

  it("reads a young term week by week from its first entry", () => {
    const rows = [
      { date: { year: 2029, month: 1, day: 20 }, actor: "player" },
      { date: { year: 2029, month: 2, day: 3 }, actor: "world" },
    ];
    const activity = termActivity(rows);
    expect(activity.grain).toBe("week");
    expect(activity.columns.map((column) => [column.label, column.player, column.world])).toEqual([["Jan 20", 1, 0], ["Jan 27", 0, 0], ["Feb 3", 0, 1]]);
  });
});

describe("formatting and scales", () => {
  it("writes each format in its own unit", () => {
    expect(formatReading("share", 0.423)).toBe("42%");
    expect(formatReading("percent", 0.0345)).toBe("3.5%");
    expect(formatReading("usd-millions", -2500)).toBe("−$2.5B");
    expect(formatReading("usd-millions", 1_900_000)).toBe("$1.9T");
  });

  it("keeps negative rates on the scale and clamps positions", () => {
    expect(legacyDomain([50, 60], true)).toEqual([0, 100]);
    const domain = legacyDomain([-1, 3]);
    expect(domain[0]).toBeLessThan(-1);
    expect(legacyPosition(-100, domain)).toBe(0);
    expect(legacyPosition(0, [0, 10])).toBe(0);
  });
});

describe("entry marks", () => {
  it("draws the first subsystem with a glyph, force in red whoever acted", () => {
    expect(entryMark(["opinion", "congress"], "world")).toBe("ballot");
    expect(entryMark(["unknown"], "player")).toBe("decision");
    expect(entryTone(entryMark(["war-powers"], "player"), "player")).toBe("red");
    expect(entryTone("ballot", "world")).toBe("blue");
    expect(entryInstitutions(["military", "war-powers", "congress"]).map((body) => body.id)).toEqual(["INST-DOD", "INST-CONGRESS"]);
  });
});
