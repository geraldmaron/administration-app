// A completed campaign with retained deflation observations; no scenario or content publication.
import { selectDateOfTurn } from "../../packages/engine/dist/index.js";
import { foundFixture } from "./_campaign.mjs";
export const name = "legacy-negative-rates";
export function build() {
  const base = foundFixture({ seedText: "fixture-legacy-negative-rates", leaderName: "Fixture President" });
  return { ...base, turn: 2, calendar: selectDateOfTurn(base, 2), termClock: { ...base.termClock, outcome: "term-limited" }, economyHistory: [
    { turn: 1, growth: 0.02, inflation: 0.02, unemployment: 0.05, costOfLiving: 1 },
    { turn: 2, growth: -0.01, inflation: -0.03, unemployment: 0.06, costOfLiving: 0.97 },
  ] };
}
