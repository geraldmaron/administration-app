import { describe, expect, it } from "vitest";
import { historicalBenchmarks, metricBenchmarks, type MetricBenchmark } from "./benchmarks.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { INHERITED_WEEKS } from "./inheritance.js";
import { METRIC_HISTORY_WINDOW } from "./turn-loop.js";
import { treasuryHealth } from "./metrics.js";
import { REMOVAL_METRIC_FLOOR } from "./removal.js";
import type { Campaign, MetricSet } from "./state.js";

const METRICS: readonly (keyof MetricSet)[] = [
  "approval",
  "treasury",
  "stability",
  "militaryReadiness",
  "standing",
];

/** The predecessor's quarter at a level no governed week reaches, so a test can tell whether it leaked into the term's marks. */
function inheritedQuarter(metrics: MetricSet): readonly MetricSet[] {
  return Array.from({ length: INHERITED_WEEKS }, () => ({ ...metrics, approval: 0.2, stability: 0.2, standing: 0.2, militaryReadiness: 0.2, treasury: 100_000 }));
}

/** A campaign with three governed weeks behind it after the inherited quarter, so the own-record marks have a term to read. */
function withHistory(): Campaign {
  const base = buildCampaign();
  const metrics = base.player.metrics;
  return {
    ...base,
    turn: 4,
    player: {
      ...base.player,
      metricHistory: [
        ...inheritedQuarter(metrics),
        // The opening reading is the term's high, which is what the last
        // assertion below is about. Above the live figure the fixture settles
        // at, because the live figure carries the honeymoon.
        { ...metrics, approval: 0.7, stability: 0.7, standing: 0.5, militaryReadiness: 0.6, treasury: 2_800_000 },
        { ...metrics, approval: 0.31, stability: 0.4, standing: 0.44, militaryReadiness: 0.52, treasury: 900_000 },
        { ...metrics, approval: 0.48, stability: 0.55, standing: 0.47, militaryReadiness: 0.58, treasury: 1_900_000 },
      ],
    },
  };
}

function kinds(marks: readonly MetricBenchmark[]): ReadonlySet<string> {
  return new Set(marks.map((mark) => mark.kind));
}

describe("metricBenchmarks", () => {
  it("returns marks inside [0,1], sorted ascending, for every player-facing metric", () => {
    const campaign = withHistory();
    for (const metric of METRICS) {
      const marks = metricBenchmarks(campaign, metric);
      expect(marks.length, metric).toBeGreaterThan(0);
      for (const mark of marks) {
        expect(mark.at, `${metric} ${mark.label}`).toBeGreaterThanOrEqual(0);
        expect(mark.at, `${metric} ${mark.label}`).toBeLessThanOrEqual(1);
        expect(mark.label.length, `${metric} ${mark.label}`).toBeLessThanOrEqual(32);
      }
      const positions = marks.map((mark) => mark.at);
      expect(positions, metric).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it("is deterministic — the same campaign gives the same marks", () => {
    const campaign = withHistory();
    for (const metric of METRICS) {
      expect(metricBenchmarks(campaign, metric)).toEqual(metricBenchmarks(campaign, metric));
    }
  });

  it("returns nothing for an id that is not a player-facing reading", () => {
    expect(metricBenchmarks(withHistory(), "removalPressure")).toEqual([]);
    expect(metricBenchmarks(withHistory(), "")).toEqual([]);
  });

  it("carries no own-record mark on the opening turn, where there is no term to read", () => {
    const opening = buildCampaign();
    expect(opening.player.metricHistory).toEqual([]);
    for (const metric of METRICS) {
      expect(kinds(metricBenchmarks(opening, metric)).has("own-record"), metric).toBe(false);
    }
  });

  it("reads the term's opening and extremes off the campaign's own series", () => {
    const marks = metricBenchmarks(withHistory(), "approval").filter((mark) => mark.kind === "own-record");
    const byLabel = Object.fromEntries(marks.map((mark) => [mark.label, mark.at]));
    expect(byLabel["Opening"]).toBe(0.7);
    expect(byLabel["Term low"]).toBe(0.31);
    // The term high is the opening here, and a track does not get the same
    // point labeled twice.
    expect(byLabel["Term high"]).toBeUndefined();
  });

  it("never reads the inherited quarter as this administration's own record", () => {
    const marks = metricBenchmarks(withHistory(), "approval").filter((mark) => mark.kind === "own-record");
    expect(marks.map((mark) => mark.at)).not.toContain(0.2);
  });

  it("drops the opening once the oath week has scrolled out of the kept history", () => {
    const base = withHistory();
    const governed = Array.from({ length: METRIC_HISTORY_WINDOW }, (_, i) => ({ ...base.player.metrics, approval: 0.4 + (i % 5) * 0.05 }));
    const late = { ...base, turn: METRIC_HISTORY_WINDOW + 10, player: { ...base.player, metricHistory: governed } };
    const labels = metricBenchmarks(late, "approval").filter((mark) => mark.kind === "own-record").map((mark) => mark.label);
    expect(labels).not.toContain("Opening");
    expect(labels).toEqual(expect.arrayContaining(["Term low", "Term high"]));
  });
});

describe("the honesty rule", () => {
  it("only approval and treasury carry a historical mark", () => {
    const campaign = withHistory();
    for (const metric of METRICS) {
      const hasHistorical = kinds(metricBenchmarks(campaign, metric)).has("historical");
      expect(hasHistorical, metric).toBe(metric === "approval" || metric === "treasury");
    }
  });

  it("stability, standing and readiness carry only own-record and gate marks", () => {
    const campaign = withHistory();
    for (const metric of ["stability", "standing", "militaryReadiness"] as const) {
      for (const kind of kinds(metricBenchmarks(campaign, metric))) {
        expect(["gate", "own-record"], `${metric} ${kind}`).toContain(kind);
      }
    }
  });

  it("approval's historical set is the authored Gallup landmark set", () => {
    expect(historicalBenchmarks("approval").map((mark) => [mark.label, mark.at])).toEqual([
      ["Truman, February 1952", 0.22],
      ["Nixon, August 1974", 0.24],
      ["Modern ceiling", 0.55],
      ["Typical honeymoon", 0.58],
      ["Post-9/11 peak", 0.9],
    ]);
    for (const mark of historicalBenchmarks("approval")) {
      expect(mark.kind).toBe("historical");
      expect(mark.note, mark.label).toBeDefined();
    }
  });

  it("treasury's historical marks are real federal outlays converted on the game's own scale", () => {
    const marks = historicalBenchmarks("treasury");
    expect(marks.map((mark) => mark.label)).toEqual(["A week of federal outlays", "A month of federal outlays"]);
    expect(marks[0]!.at).toBeCloseTo(treasuryHealth(7_000_000 / 52), 3);
    expect(marks[1]!.at).toBeCloseTo(treasuryHealth((7_000_000 * 4) / 52), 3);
  });

  it("approval carries no gate mark, because the engine deliberately floors every reading but approval", () => {
    expect(kinds(metricBenchmarks(withHistory(), "approval")).has("gate")).toBe(false);
  });

  it("gate marks sit on the lines the engine actually reads", () => {
    const campaign = withHistory();
    const gateAt = (metric: keyof MetricSet, label: string) =>
      metricBenchmarks(campaign, metric).find((mark) => mark.kind === "gate" && mark.label === label)?.at;
    expect(gateAt("stability", "Failing line")).toBeUndefined();
    expect(gateAt("standing", "Failing line")).toBeUndefined();
    expect(gateAt("militaryReadiness", "Failing line")).toBeUndefined();
    expect(gateAt("treasury", "Solvency line")).toBeUndefined();
    expect(gateAt("stability", "Collapse line")).toBe(REMOVAL_METRIC_FLOOR);
    expect(gateAt("standing", "Collapse line")).toBe(REMOVAL_METRIC_FLOOR);
  });
});
