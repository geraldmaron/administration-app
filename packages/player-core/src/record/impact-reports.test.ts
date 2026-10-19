import { describe, expect, it } from "vitest";
import { addDays, apply, createRngStreams, NO_IMPACT_RESPONSE, openImpactEvent, routeCohorts, routeDomestic, stepImpactEvent, type Campaign, type ImpactEvent, type ImpactReport } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { impactReports } from "./impact-reports";

const opening = openingCampaign();

function report(date: Campaign["calendar"], deaths: readonly [number, number], stage: ImpactReport["stage"]): ImpactReport {
  const zero = { low: 0, high: 0 };
  return {
    date,
    revision: 1,
    confidence: "medium",
    stage,
    deaths: { low: deaths[0], high: deaths[1] },
    injured: { low: 10, high: 30 },
    infections: zero,
    displaced: zero,
    lossUSDm: { low: 120, high: 400 },
    serviceDisruption: { low: 2000, high: 5000 },
    compromisedRecords: zero,
    basis: "Hospital admissions and local officials' counts.",
  };
}

function incident(id: string, causedBy: string | undefined, updatedDaysAgo: number, reports: readonly ImpactReport[]): ImpactEvent {
  const lastUpdated = addDays(opening.calendar, -updatedDaysAgo);
  return {
    ...(causedBy ? { causedBy } : {}),
    spec: {
      version: 1,
      id,
      nation: "MEX" as NationId,
      title: `Incident ${id}`,
      source: "action",
      exposure: { population: 1000, assetsUSDm: 50, dailyOutputUSDm: 2, serviceUsers: 800, careCapacity: 40, vulnerability: 0.3, resilience: 0.5, evidence: "regional-estimate", basis: "Census tract." },
      mechanism: { kind: "industrial", hazard: "fire", intensity: 0.4, fatalityRate: 0.01, injuryRatio: 3, damageShare: 0.2, displacementShare: 0.1, durationDays: 10 },
      accounting: { population: "self", economy: "self" },
      calibration: { status: "provisional", basis: "Analog incidents.", sourceRefs: [] },
    },
    revision: 1,
    started: addDays(lastUpdated, -5),
    lastUpdated,
    elapsedDays: 5,
    status: "active",
    state: { susceptible: 0, exposed: 0, infected: 0, recovered: 0, careDemand: 0, disruptedShare: 0.2, displacedNow: 50 },
    // The running totals the reports estimate; nothing the selector returns may carry them.
    totals: { deaths: 9137, childDeaths: 0, injured: 0, infections: 0, displaced: 0, servicePersonDays: 0, assetLossUSDm: 0, outputLossUSDm: 0, compromisedRecords: 0 },
    reports,
  };
}

const campaign: Campaign = {
  ...opening,
  impactEvents: {
    a: incident("a", "event-1", 20, [report(addDays(opening.calendar, -20), [3, 9], "final")]),
    b: incident("b", "event-2", 2, [report(addDays(opening.calendar, -6), [1, 1], "initial"), report(addDays(opening.calendar, -2), [4, 12], "update")]),
    c: incident("c", undefined, 1, []),
  },
};

describe("impact reports", () => {
  it("lists only incidents with a filed report, the most recently updated first", () => {
    expect(impactReports(campaign).map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("reads the latest report's ranges, never the simulation's running totals", () => {
    const row = impactReports(campaign).find((entry) => entry.id === "b")!;
    expect(row.figures[0]).toEqual({ label: "Reported deaths", range: "4 to 12" });
    expect(row.stage).toBe("Still being assessed");
    expect(row.revisions).toBe(2);
    expect(JSON.stringify(impactReports(campaign))).not.toContain("9137");
  });

  it("filters by the entry that caused it and by how recent it is", () => {
    expect(impactReports(campaign, { causedBy: "event-1" }).map((row) => row.id)).toEqual(["a"]);
    expect(impactReports(campaign, { withinDays: 7 }).map((row) => row.id)).toEqual(["b"]);
    expect(impactReports(campaign, { causedBy: "event-1" })[0]?.stage).toBe("Recovery complete");
  });

  it("reports an overlapping domestic incident without billing political reactions as more casualties", () => {
    const nation = opening.founding.nation;
    const stateTotal = (state: Campaign) => Object.values(state.states).reduce((sum, row) => sum + row.population, 0);
    const baseNation = opening.nations[nation]!;
    const before: Campaign = { ...opening, nations: { ...opening.nations, [nation]: { ...baseNation, stats: {
      ...baseNation.stats, demography: { ...baseNation.stats.demography, population: stateTotal(opening), birthRate: 0, deathRate: 0, netMigration: 0 },
    } } } };
    const id = "impact:overlapping-domestic";
    const source = incident(id, "event:overlap", 0, []).spec;
    const spec = { ...source, id, nation, title: "Port explosion", exposure: { ...source.exposure, population: 10000, serviceUsers: 8000,
      careCapacity: 20, assetsUSDm: 500, evidence: "site-assessment" as const },
      mechanism: { kind: "strike" as const, intensity: 1, civilianHarmChance: 1, casualtyRate: 0.01,
        injuryRatio: 2, damageShare: 0.2, recoveryDays: 14 } };
    const streams = createRngStreams(before.seed);
    const event = { ...stepImpactEvent(openImpactEvent(spec, before.calendar), addDays(before.calendar, 1), NO_IMPACT_RESPONSE, streams.stream("overlap")),
      causedBy: "event:overlap" };
    expect(event.totals.deaths).toBeGreaterThan(0);
    const harmed = apply(before, { source: "simulate", actor: "world", turn: before.turn,
      narration: { summary: "The port incident is reported." }, effects: [{ kind: "impactEvent", event, expectedRevision: null }] });
    const signature = { magnitude: "moderate" as const, signature: "incident-response", reason: "The response was noticed.", axes: { industrial: 1 } };
    const routed = routeDomestic(harmed, signature);
    const cohortEffects = routeCohorts(harmed, signature, routed);
    expect(routed.length).toBeGreaterThan(0);
    expect(cohortEffects.length).toBeGreaterThan(0);
    const reacted = apply(harmed, { source: "simulate", actor: "world", turn: harmed.turn,
      narration: { summary: "The public reacts to the response." }, effects: [...routed, ...cohortEffects] });
    expect(stateTotal(before) - stateTotal(reacted)).toBeCloseTo(event.totals.deaths, 6);
    expect(before.nations[nation]!.stats.demography.population - reacted.nations[nation]!.stats.demography.population).toBe(event.totals.deaths);
    expect(reacted.player.metrics).toEqual(harmed.player.metrics);
    expect(reacted.cohorts).not.toEqual(harmed.cohorts);
    expect(Object.keys(reacted.states).some((key) => reacted.states[key as keyof typeof reacted.states]!.lean !== harmed.states[key as keyof typeof harmed.states]!.lean)).toBe(true);
    const row = impactReports(reacted, { causedBy: "event:overlap" })[0]!;
    const filed = event.reports.at(-1)!;
    const deathRange = filed.deaths.low === filed.deaths.high ? filed.deaths.low.toLocaleString("en-US")
      : `${filed.deaths.low.toLocaleString("en-US")} to ${filed.deaths.high.toLocaleString("en-US")}`;
    expect(row.figures[0]).toEqual({ label: "Reported deaths", range: deathRange });
    expect(filed.deaths.low).toBeLessThanOrEqual(event.totals.deaths);
    expect(filed.deaths.high).toBeGreaterThanOrEqual(event.totals.deaths);
  });
});
