import { describe, expect, it } from "vitest";
import { SCENE_CLASS_VALUES } from "@admin/engine";
import type { CoverageRow } from "@admin/player-core";
import { frontPage, namingNation, nationsInCoverage } from "./front-page";
import { leanWords } from "./outlet-lean";
import { coverageFilterOf, filterCount, pressParams, routerParams } from "./press-params";
import { SCENE_KEYS, sceneKeyFor } from "./scene-key";

function row(index: number, patch: Partial<CoverageRow> = {}): CoverageRow {
  return { index, headline: `Story ${index}`, week: 3, when: "March 1, 2029", genre: "journalism", source: "Desk", topic: "press", topicLabel: "Incidents", nations: [], ...patch };
}

describe("press params", () => {
  it("keeps recognized keys and drops the rest", () => {
    expect(pressParams({ view: "feed", topic: "conflict", tone: "critical", week: "4", outlet: "outlet-a", nation: "FRA", junk: "x" })).toEqual({ view: "feed", topic: "conflict", tone: "critical", week: 4, outlet: "outlet-a", nation: "FRA" });
  });

  it("drops the default view, an unknown topic and a week that is not a whole number", () => {
    expect(pressParams({ view: "front", topic: "gossip", week: "2.5", tone: "angry" })).toEqual({});
  });

  it("reads the first of a repeated key", () => {
    expect(pressParams({ outlet: ["outlet-a", "outlet-b"] })).toEqual({ outlet: "outlet-a" });
  });

  it("counts a government filter beside the selector's filter, which leaves it out", () => {
    const params = pressParams({ week: "0", nation: "DEU" });
    expect(coverageFilterOf(params)).toEqual({ week: 0 });
    expect(filterCount(params)).toBe(2);
  });

  it("clears every unset key for the router", () => {
    expect(routerParams({ view: "feed" })).toEqual({ view: "feed", outlet: undefined, topic: undefined, tone: undefined, week: undefined, nation: undefined });
  });
});

describe("front page", () => {
  const reach = new Map([
    ["wide", 0.4],
    ["narrow", 0.05],
  ]);

  it("leads with the widest-read desk's story of the newest week", () => {
    const rows = [row(9, { outletId: "narrow" }), row(8, { outletId: "wide" }), row(7, { week: 2, outletId: "wide" })];
    const page = frontPage(rows, reach);
    expect(page.week).toBe(3);
    expect(page.lead?.index).toBe(8);
    expect(page.top.map((entry) => entry.index)).toEqual([9]);
  });

  it("leads with a notice only when no desk filed that week, and sections what is left by topic", () => {
    const rows = [row(5, { genre: "official", topic: "governance", topicLabel: "Government and rules" }), row(4, { genre: "intelligence", topic: "operator", topicLabel: "Crime and markets" })];
    const page = frontPage(rows, reach);
    expect(page.lead?.index).toBe(5);
    expect(page.top).toEqual([]);
    expect(page.sections.map((section) => section.topic)).toEqual(["operator"]);
  });

  it("is empty with nothing filed", () => {
    expect(frontPage([], reach)).toEqual({ top: [], sections: [] });
  });

  it("ranks the governments the press names and filters to one", () => {
    const fra = { id: "FRA", name: "France", href: "/world/nation/FRA" };
    const deu = { id: "DEU", name: "Germany", href: "/world/nation/DEU" };
    const rows = [row(1, { nations: [fra] }), row(2, { nations: [fra, deu] })];
    expect(nationsInCoverage(rows)).toEqual([
      { id: "FRA", name: "France", count: 2 },
      { id: "DEU", name: "Germany", count: 1 },
    ]);
    expect(namingNation(rows, "DEU").map((entry) => entry.index)).toEqual([2]);
    expect(namingNation(rows, undefined)).toHaveLength(2);
  });
});

describe("outlet lean", () => {
  it("names each pronounced axis", () => {
    expect(leanWords({ economicLeftRight: -0.45, authLibertarian: -0.8, nationalistGlobalist: -0.35 })).toBe("Leans left on the economy · Strongly distrusts presidential power · Favors working with other countries");
  });

  it("says centrist when no axis is pronounced", () => {
    expect(leanWords({ economicLeftRight: 0.1, authLibertarian: -0.1, nationalistGlobalist: 0 })).toBe("Centrist");
  });
});

describe("scene stills", () => {
  it("uses a register's variant where one is painted", () => {
    expect(sceneKeyFor({ kind: "war", register: "damaged" })).toBe("war_chokepoint_damaged");
    expect(sceneKeyFor({ kind: "war", register: "intact" })).toBe("war");
  });

  it("maps every scene class with a hyphen to its file name", () => {
    expect(sceneKeyFor({ kind: "foreign-crisis" })).toBe("foreign_crisis");
    expect(sceneKeyFor({ kind: "public-health" })).toBe("public_health");
    expect(sceneKeyFor({})).toBeUndefined();
  });

  it("has a still for every scene class the engine names", () => {
    for (const kind of SCENE_CLASS_VALUES) expect(SCENE_KEYS).toContain(sceneKeyFor({ kind }));
  });
});
