import { describe, expect, it } from "vitest";
import {
  MAX_PEERS,
  PEER_MEASURES,
  normalizePeers,
  peerComparisonView,
} from "./peer-comparison";

describe("countries beside each other in the published record", () => {
  it("draws each country over the same calendar years from the World Bank figures", () => {
    const view = peerComparisonView(
      "inflation",
      ["USA", "GBR", "JPN"],
      "2007-2012",
    );
    expect(view.unavailable).toBeUndefined();
    expect(view.series.map((s) => s.id)).toEqual(["USA", "GBR", "JPN"]);
    for (const s of view.series)
      expect(s.points.map((p) => p.year)).toEqual([
        2007, 2008, 2009, 2010, 2011, 2012,
      ]);
    const us2022 = peerComparisonView(
      "inflation",
      ["USA", "GBR"],
      "2020-2022",
    ).series[0]!.points.find((p) => p.year === 2022)!;
    expect(us2022.value).toBeCloseTo(8.0028, 3);
  });

  it("offers a window only where every chosen country is covered, and says why not", () => {
    const view = peerComparisonView(
      "unemployment",
      ["USA", "DEU"],
      "2007-2012",
    );
    expect(
      Object.fromEntries(view.windows.map((w) => [w.id, w.available])),
    ).toEqual({
      "1973-1982": false,
      "2007-2012": true,
      "2015-2019": true,
      "2017-2019": true,
      "2020-2022": true,
    });
    expect(view.windows[0]!.reason).toMatch(/covers 1991/);
    expect(
      peerComparisonView("growth", ["USA", "DEU"], "1973-1982").windows[0]!
        .available,
    ).toBe(true);
  });

  it("refuses an uncovered window rather than drawing another, and needs two countries", () => {
    const uncovered = peerComparisonView(
      "unemployment",
      ["USA", "DEU"],
      "1973-1982",
    );
    expect(uncovered.series).toEqual([]);
    expect(uncovered.unavailable).toMatch(/outside it/);
    expect(
      peerComparisonView("inflation", ["USA"], "2007-2012").unavailable,
    ).toMatch(/at least 2/);
  });

  it("keeps peers to the pack, without repeats and within the line limit", () => {
    expect(
      normalizePeers(["USA", "USA", "ZZZ", "GBR", "DEU", "FRA", "JPN", "CAN"]),
    ).toEqual(["USA", "GBR", "DEU", "FRA"]);
    expect(normalizePeers(["USA", "GBR", "DEU", "FRA", "JPN"]).length).toBe(
      MAX_PEERS,
    );
  });

  it("labels the unemployment series as an estimate", () => {
    expect(
      peerComparisonView(
        "unemployment",
        ["USA", "GBR"],
        "2017-2019",
      ).series.every((s) => s.evidence === "estimated"),
    ).toBe(true);
    expect(
      peerComparisonView("inflation", ["USA", "GBR"], "2017-2019").series.every(
        (s) => s.evidence === "observed",
      ),
    ).toBe(true);
  });

  it("sets countries beside each other on population growth, labeled as an estimate", () => {
    const view = peerComparisonView("population", ["USA", "JPN", "CAN"], "2017-2019");
    expect(view.unavailable).toBeUndefined();
    expect(view.series.every((s) => s.evidence === "estimated")).toBe(true);
    const us = view.series[0]!.points.find((p) => p.year === 2017)!;
    expect(us.value).toBeGreaterThan(0);
    expect(PEER_MEASURES).toContain("population");
    expect(peerComparisonView("population", ["USA", "JPN"], "1973-1982").windows[0]!.available).toBe(true);
  });
});
