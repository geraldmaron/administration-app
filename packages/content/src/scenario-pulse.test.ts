import { describe, expect, it } from "vitest";
import { CYCLE_MIN_DWELL_WEEKS, openingCommodityIndex, type Campaign, type NationRuntime } from "@admin/engine";
import { sealedCampaign } from "./preview-board.js";
import { pulseBoards } from "./preview-board-pulse.js";
import { auditReachability } from "./scenario-reachability.js";
import { scenarioLive } from "./scenario-cast.js";
import {
  CYCLE_PHASES,
  commodityBandOf,
  commodityIndex,
  costOfLivingBandOf,
  crimeTrendOf,
  inflationBandOf,
  pulseMet,
  unemploymentBandOf,
} from "./scenario-pulse.js";
import { ScenarioCondition, ScenarioDef } from "./scenario.js";

function gatedOn(id: string, conditions: readonly ScenarioCondition[]): ScenarioDef {
  return ScenarioDef.parse({
    id,
    class: "economy",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A week the country's own readings are the thing on the desk",
    cast: { pick: "none" },
    conditions,
    weight: 1,
    locus: { site: "capital", ground: "home", descriptor: "the room where the monthly figures are read out" },
    opening: [
      { speaker: { kind: "cabinet", roleHint: "finance" }, text: "The figures came in this morning and they are the story of the week, whatever else is on the schedule." },
    ],
    replies: [
      {
        id: "answer-it",
        tone: "firm",
        text: "Answer it this week, on the record, and say what it costs.",
        commitment: {
          kind: "position",
          cost: { stability: -0.05 },
          remembered: "The government answered the figures the week they landed.",
          rejoinder: { speaker: { kind: "narrator" }, text: "The department has been told to plan around the number as it stands." },
        },
      },
      {
        id: "wait-it-out",
        tone: "conciliatory",
        text: "Say nothing this week, and let the next release speak first.",
        commitment: {
          kind: "position",
          cost: { stability: -0.02 },
          remembered: "The government said nothing and waited for the next release.",
          rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "Nothing was said, and the markets read that as an answer of its own." },
        },
      },
    ],
  });
}

function withHome(campaign: Campaign, economy: Partial<NationRuntime["stats"]["economy"]>): Campaign {
  const id = campaign.founding.nation;
  const runtime = campaign.nations[id]!;
  return { ...campaign, nations: { ...campaign.nations, [id]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } } } } };
}

describe("the pulse bands", () => {
  it("read inflation against the Fed's two percent", () => {
    expect([0.004, 0.02, 0.041, 0.09].map(inflationBandOf)).toEqual(["below-target", "near-target", "elevated", "high"]);
  });

  it("read unemployment, the cost of living and crime in words a household uses", () => {
    expect([0.035, 0.045, 0.07, 0.1].map(unemploymentBandOf)).toEqual(["tight", "normal", "slack", "severe"]);
    expect([98, 101, 105, 110].map((now) => costOfLivingBandOf(now, 100))).toEqual(["easing", "steady", "rising", "straining"]);
    expect([0.2, 0.25, 0.3].map((now) => crimeTrendOf(now, 0.25))).toEqual(["falling", "steady", "rising"]);
    expect([0.7, 1, 1.2, 1.5].map(commodityBandOf)).toEqual(["slumped", "normal", "elevated", "spiking"]);
  });

  it("names every phase the business cycle has, and no other", () => {
    expect([...CYCLE_PHASES].sort()).toEqual(Object.keys(CYCLE_MIN_DWELL_WEEKS).sort());
  });

  it("reads a commodity at its sourced opening index until a market state is stored", () => {
    const campaign = sealedCampaign();
    expect(commodityIndex(campaign, "crude")).toBe(openingCommodityIndex("crude"));
    expect(pulseMet(campaign, { kind: "commodityBand", commodity: "crude", in: ["normal"] })).toBe(true);
    expect(pulseMet(campaign, { kind: "commodityBand", commodity: "crude", in: ["spiking"] })).toBe(false);
  });

  it("gates a scenario on the player's own readings", () => {
    const campaign = withHome(sealedCampaign(), { inflation: 0.06 });
    const def = gatedOn("prices-high", [{ kind: "inflationBand", in: ["high"] }]);
    expect(scenarioLive(campaign, def, campaign.founding.nation)).toBe(true);
    expect(scenarioLive(withHome(campaign, { inflation: 0.02 }), def, campaign.founding.nation)).toBe(false);
  });
});

describe("pulse gates and the reachability gate", () => {
  it("parses band gates and refuses a figure or an invented commodity", () => {
    expect(ScenarioCondition.safeParse({ kind: "unemploymentBand", in: ["slack"] }).success).toBe(true);
    expect(ScenarioCondition.safeParse({ kind: "inflationBand", atLeast: 0.05 }).success).toBe(false);
    expect(ScenarioCondition.safeParse({ kind: "commodityBand", commodity: "unobtainium", in: ["spiking"] }).success).toBe(false);
    expect(ScenarioCondition.safeParse({ kind: "cyclePhase", in: [] }).success).toBe(false);
  });

  it("brings a board for every band a batch asks for, so an honest gate is reachable", () => {
    const def = gatedOn("the-layoffs-arrive", [{ kind: "unemploymentBand", in: ["slack", "severe"] }, { kind: "turn", atLeast: 4 }]);
    expect(pulseBoards([def])).toHaveLength(2);
    expect(auditReachability([def])).toEqual([]);
  });

  it("rejects the deliberate dead gate: two readings no single week is written to carry", () => {
    // Prices running hot while the cost of living falls: each band has a board,
    // and no board carries both, which is the defect this fixture stands for.
    const def = gatedOn("the-impossible-week", [
      { kind: "inflationBand", in: ["high"] },
      { kind: "costOfLivingBand", in: ["easing"] },
    ]);
    expect(auditReachability([def]).map((finding) => finding.scenario)).toEqual(["the-impossible-week"]);
  });
});
