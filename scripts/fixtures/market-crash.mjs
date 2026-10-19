// An equity crash in the week it happened: the index down past the crash line,
// the Fed's next meeting ahead, and the pause on the Desk.
//
// A crash is rare by design, so the fixture sets the market record the way the
// markets phase would leave it the week the index fell a tenth, after half a
// year of ordinary weeks: every other part of the record is the week's own.
import { apply } from "../../packages/engine/dist/effects.js";
import { CRASH_DROP, selectMarketShock } from "../../packages/engine/dist/markets.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "market-crash";

const WEEKS_BEFORE = 26;
const FALL = 0.1;

function crash(campaign) {
  const markets = campaign.markets;
  if (!markets) throw new Error("the markets record never opened");
  const level = markets.equity.level;
  const fallen = Math.round(level * (1 - FALL) * 1_000_000) / 1_000_000;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    background: true,
    narration: { summary: "Stocks fall a tenth in a week." },
    effects: [{ kind: "markets", set: { ...markets, equity: { level: fallen, series: [...markets.equity.series, fallen] } } }],
  });
}

export function build() {
  const campaign = crash(advanceWeeks(foundFixture({ seedText: "fixture-market-crash", leaderName: "Fixture President" }), WEEKS_BEFORE));
  const shock = selectMarketShock(campaign);
  if (!shock || shock.drop < CRASH_DROP) throw new Error("the index did not fall past the crash line");
  return campaign;
}
