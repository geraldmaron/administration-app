import { describe, expect, it } from "vitest";
import { makeCampaignSeed, sealFounding, type Campaign } from "@admin/engine";
import { electorateView, emergencyBoard, foundingOptions, nationOverview, openingChoices } from "@admin/player-core";
import { worldDataset } from "@admin/world";
import { alignSeries } from "./economy/align";
import { economyParams, economySearch } from "./economy/search";
import { prioritizedIncidents } from "./emergency/emergency-acts";
import { gapText, signedPoints, signedTenths, valenceOf } from "./format";
import { nationParams, nationSearch } from "./home/search";
import { NO_FILTER, filterStates, focusCounts, sortStates, stateTableRows, weekPoints } from "./home/states-table";

const seed = makeCampaignSeed("nation-screens-test");
const choices = openingChoices(foundingOptions(seed));
const campaign: Campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Test President" } });

describe("figures", () => {
  it("signs moves with a real minus and reads a stance as a valence", () => {
    expect(signedPoints(-0.034)).toBe("−3 pts");
    expect(signedTenths(0.0012)).toBe("+0.1 pts");
    expect(gapText(0)).toBe("level");
    expect(gapText(0.051)).toBe("▲ +5 pts");
    expect(valenceOf("adverse")).toBe("bad");
    expect(valenceOf(undefined)).toBe("neutral");
  });
});

describe("the states table", () => {
  const overview = nationOverview(campaign);
  const rows = stateTableRows(campaign, overview, "approval", electorateView(campaign).states);

  it("carries every state the overview reads, each judged on approval against half", () => {
    expect(rows).toHaveLength(overview.rows.length);
    for (const row of rows) expect(row.valence).toBe(row.meter!.value >= 0.5 ? "good" : row.meter!.value >= 0.4 ? "watch" : "bad");
  });
  it("filters by name and sorts with a stable tie on the name", () => {
    expect(filterStates(rows, { ...NO_FILTER, query: "texas" }).map((row) => row.id)).toEqual(["TX"]);
    const sorted = sortStates(rows, "reading", "descending");
    expect(sorted).toHaveLength(rows.length);
    expect(sortStates(rows, "name", "ascending")[0]!.name.localeCompare(sortStates(rows, "name", "ascending")[1]!.name)).toBeLessThan(0);
  });
  it("reads each governor's standing and what waits on the President, never inventing one for DC", () => {
    for (const row of rows) {
      expect(row.needs).toBe(row.needTitles.length);
      if (row.disposition === undefined) expect(row.relationship).toBe("No governor");
    }
    const counts = focusCounts(rows);
    expect(filterStates(rows, { ...NO_FILTER, focus: "needs" })).toHaveLength(counts.needs);
    expect(filterStates(rows, { ...NO_FILTER, focus: "against" }).every((row) => row.leansAgainst)).toBe(true);
    const byStanding = sortStates(rows, "relationship", "ascending").filter((row) => row.disposition !== undefined);
    for (let i = 1; i < byStanding.length; i += 1) expect(byStanding[i - 1]!.disposition!).toBeLessThanOrEqual(byStanding[i]!.disposition!);
  });
  it("prints a flat week as no change", () => {
    expect(weekPoints(0.0001)).toBe("No change");
    expect(weekPoints(0.012)).toBe("+1.2 pts");
  });
});

describe("addresses", () => {
  it("keeps only validated Nation context and drops defaults", () => {
    const search = nationSearch({ view: "states", lens: "approval", state: "ca", flagged: "true", sort: "name", party: "whig" });
    expect(search).toEqual({ view: "states", state: "CA", flagged: true });
    expect(nationParams(search)).toMatchObject({ view: "states", state: "CA", flagged: "true", lens: undefined });
  });
  it("round-trips the needs-you focus and the relationship sort, and refuses an unknown focus", () => {
    const search = nationSearch({ view: "states", focus: "needs", sort: "relationship", direction: "descending" });
    expect(search).toEqual({ view: "states", focus: "needs", sort: "relationship", direction: "descending" });
    expect(nationParams(search)).toMatchObject({ focus: "needs", sort: "relationship", direction: "descending" });
    expect(nationSearch({ focus: "everyone" }).focus).toBeUndefined();
  });
  it("keeps the map's lens and a chosen state's matter, and drops a matter with no state", () => {
    expect(nationSearch({ lens: "governors", state: "tx", cause: "flood" })).toMatchObject({ lens: "governors", state: "TX" });
    expect(nationSearch({ lens: "astrology" }).lens).toBeUndefined();
    expect(nationSearch({ cause: "flood" }).cause).toBeUndefined();
    expect(nationParams({ cause: "flood" } as never).cause).toBeUndefined();
  });
  it("round-trips economy context and refuses an unknown basis", () => {
    const search = economySearch({ view: "markets", basis: "world", peers: "USA,GBR", observation: "3", sort: "change" });
    expect(search).toMatchObject({ view: "markets", basis: "world", observation: 3, sort: "change" });
    expect(economySearch(Object.fromEntries(Object.entries(economyParams(search)).filter(([, value]) => value !== undefined)))).toEqual(search);
    expect(economySearch({ basis: "astrology" }).basis).toBeUndefined();
  });
});

describe("alignSeries", () => {
  it("lines series up by position and leaves gaps as gaps", () => {
    const aligned = alignSeries([
      [{ at: 1, label: "Jan", value: 4 }, { at: 3, label: "Mar", value: 5 }],
      [{ at: 2, label: "Feb", value: 6 }, { at: 3, label: "Mar", value: undefined }],
    ]);
    expect(aligned.positions).toEqual([1, 2, 3]);
    expect(aligned.x).toEqual(["Jan", "Feb", "Mar"]);
    expect(aligned.values).toEqual([[4, null, 5], [null, 6, null]]);
  });
});

describe("the emergency board", () => {
  it("puts the most severe incident first", () => {
    const incidents = prioritizedIncidents(emergencyBoard(campaign));
    for (let index = 1; index < incidents.length; index++) expect(incidents[index - 1]!.severity.fraction).toBeGreaterThanOrEqual(incidents[index]!.severity.fraction);
  });
});
