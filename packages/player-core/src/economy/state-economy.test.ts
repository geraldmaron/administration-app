import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { stateEconomyBoard } from "./state-economy";

// The state economy lenses read the country's live figures through each
// state's authored standing, and the states' output still sums to the nation.

const base = openingCampaign();
const us = base.founding.nation;

function withUnemployment(campaign: Campaign, rate: number): Campaign {
  const nation = campaign.nations[us]!;
  return { ...campaign, nations: { ...campaign.nations, [us]: { ...nation, stats: { ...nation.stats, economy: { ...nation.stats.economy, unemployment: rate } } } } };
}

describe("the economy by state", () => {
  it("reads every state, and their output sums to the nation's product", () => {
    const board = stateEconomyBoard(base);
    expect(board.rows.length).toBe(Object.keys(base.states).length);
    const total = board.rows.reduce((sum, row) => sum + row.output, 0);
    expect(total).toBeCloseTo(base.nations[us]!.stats.economy.gdp, 0);
  });

  it("moves every state's jobs with the country's and keeps each state's gap", () => {
    const before = stateEconomyBoard(base);
    const after = stateEconomyBoard(withUnemployment(base, before.nationalUnemployment + 0.02));
    const michigan = (board: typeof before) => board.rows.find((row) => row.state === "MI")!;
    expect(michigan(after).unemployment).toBeCloseTo(michigan(before).unemployment + 0.02, 6);
    expect(michigan(after).jobsGap).toBeCloseTo(michigan(before).jobsGap, 6);
  });

  it("carries the authored cost of living and federal dependence", () => {
    const dc = stateEconomyBoard(base).rows.find((row) => row.state === "DC")!;
    expect(dc.federalDependence).toBe(base.states.DC!.base.character.federalDependence);
    expect(dc.pricesGap).toBe(base.states.DC!.base.character.vitalAnchor.costOfLiving);
  });
});
