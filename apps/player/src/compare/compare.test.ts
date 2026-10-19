import { describe, expect, it } from "vitest";
import { makeCampaignSeed, sealFounding, tickWeek, type Campaign } from "@admin/engine";
import { compareSeries, compareSnapshot, foundingOptions, openingChoices, type CompareSeriesView, type Subject } from "@admin/player-core";
import { worldDataset, type NationId, type StateId } from "@admin/world";
import { chartModel } from "./chart";
import { formatCompare, unitWords } from "./format";
import { hasSubject, matrixMetricIds, ownRecordTurns, snapshotRefusals, toggleSubject } from "./model";
import { MAX_SUBJECTS, compareHref, parseAddress, parseSubject, subjectToken } from "./subjects";

const seed = makeCampaignSeed("compare-workspace-test");
const choices = openingChoices(foundingOptions(seed));
const opening: Campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Test President" } });
const played = [1, 2, 3, 4, 5].reduce<Campaign>((campaign) => tickWeek(campaign), opening);
const nation = (id: string): Subject => ({ kind: "nation", id: id as NationId });
const state = (id: string): Subject => ({ kind: "state", id: id as StateId });

describe("formatCompare", () => {
  it("prints shares and scores as whole points, rates to a tenth, money in the player's format", () => {
    expect(formatCompare("share", 0.4249)).toBe("42%");
    expect(formatCompare("index", 0.617)).toBe("62");
    expect(formatCompare("percent", 0.0314)).toBe("3.1%");
    expect(formatCompare("usd-millions", 2_500_000)).toMatch(/\$2\.5T|\$2,500B|\$2\.50T/);
  });
  it("says a 0-to-1 score is printed out of 100", () => {
    expect(unitWords("index", "score, 0 to 1")).toBe("score out of 100");
    expect(unitWords("share", "share of the public")).toBe("share of the public");
  });
});

describe("the comparison address", () => {
  it("round-trips every subject kind through its token", () => {
    const subjects: readonly Subject[] = [{ kind: "self" }, { kind: "self-at", turn: 1 }, nation("GBR"), state("CA"), { kind: "history", benchmarkId: "us-record:2017-2019" }];
    for (const subject of subjects) expect(parseSubject(subjectToken(subject))).toEqual(subject);
  });
  it("drops tokens that name nothing and keeps the President first", () => {
    const address = parseAddress({ metric: "unemployment", with: "state:zz,nation:gbr,bogus,at:1", window: "52" });
    expect(address.metric).toBe("unemployment");
    expect(address.window).toBe(52);
    expect(address.subjects).toEqual([{ kind: "self" }, nation("GBR"), { kind: "self-at", turn: 1 }]);
  });
  it("falls back to approval over half a year for an unknown reading or window", () => {
    expect(parseAddress({ metric: "nonsense", window: "7" })).toEqual({ metric: "approval", subjects: [{ kind: "self" }], window: 26 });
  });
  it("writes an address the parser reads back", () => {
    const address = { metric: "growth" as const, subjects: [{ kind: "self" } as Subject, nation("DEU"), { kind: "history", benchmarkId: "us-record:2007-2012" } as Subject], window: "term" as const };
    const query = Object.fromEntries(new URLSearchParams(compareHref(address).split("?")[1]));
    expect(parseAddress(query)).toEqual(address);
  });
});

describe("choosing subjects", () => {
  it("adds and removes, never the President's own line, and caps the count", () => {
    const once = toggleSubject([{ kind: "self" }], nation("FRA"));
    expect(hasSubject(once, nation("FRA"))).toBe(true);
    expect(toggleSubject(once, nation("FRA"))).toEqual([{ kind: "self" }]);
    expect(toggleSubject(once, { kind: "self" })).toEqual(once);
    const many = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"].reduce<readonly Subject[]>((list, id) => toggleSubject(list, nation(id)), [{ kind: "self" }]);
    expect(many).toHaveLength(MAX_SUBJECTS);
  });
  it("offers the oath, four weeks and a quarter back only once they have happened", () => {
    expect(ownRecordTurns(1)).toEqual([]);
    expect(ownRecordTurns(6).map((entry) => entry.turn)).toEqual([1, 2]);
    expect(ownRecordTurns(20).map((entry) => entry.turn)).toEqual([1, 16, 7]);
  });
});

describe("the chart model", () => {
  it("draws available lines and turns refused subjects into words, never a line of nothing", () => {
    const view = compareSeries(played, "approval", [{ kind: "self" }, nation("GBR"), state("CA")], "term");
    const model = chartModel(view);
    expect(model.series.map((line) => line.id)).toContain("self");
    expect(model.series.some((line) => line.id === "nation:GBR")).toBe(false);
    const refusal = model.refusals.find((entry) => entry.id === "nation:GBR");
    expect(refusal?.reason).toMatch(/Other countries don't have approval/);
    expect(model.format(0.5)).toBe("50%");
  });
  it("keeps a benchmark's note beside it", () => {
    const view: CompareSeriesView = { metricId: "inflation", title: "Inflation", unit: "annual change in prices", format: "percent", better: "down", turns: [1], x: ["Week 1"], series: [], benchmarks: [{ id: "target:fed-goal", label: "Federal Reserve goal", value: 0.02, kind: "target", note: "Two percent a year." }] };
    expect(chartModel(view).notes).toEqual([{ id: "target:fed-goal", label: "Federal Reserve goal", note: "Two percent a year." }]);
  });
});

describe("the matrix", () => {
  it("leads with the chosen reading and keeps only readings some compared subject can carry", () => {
    const ids = matrixMetricIds("unemployment", [{ kind: "self" }, nation("GBR")]);
    expect(ids[0]).toBe("unemployment");
    expect(ids).not.toContain("approval");
    expect(ids.length).toBeLessThanOrEqual(6);
  });
  it("explains every empty cell in the engine's words", () => {
    const snapshot = compareSnapshot(played, ["approval", "unemployment"], [{ kind: "self" }, nation("GBR")]);
    const refusals = snapshotRefusals(snapshot);
    expect(refusals.some((entry) => entry.metric === "Approval" && /Other countries don't have approval/.test(entry.reason))).toBe(true);
  });
});
