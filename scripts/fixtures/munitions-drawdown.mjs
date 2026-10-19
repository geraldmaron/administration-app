// A war the United States is fighting with its stocks drawn down, restock
// orders placed and not yet arrived. The war opens hot but under the decisive
// line, and four of the campaign's own weeks draw every class the war spends.
import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { openingMunitions, selectMunitions } from "../../packages/engine/dist/munitions.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "munitions-drawdown";

const IRAN = "IRN";

function openWar(campaign) {
  const war = { ...openConflict(campaign.founding.nation, IRAN, campaign.turn, "American forces strike Iran."), intensity: 0.45 };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: war.cause },
    effects: [{ kind: "conflict", set: war }],
  });
}

function assertStocks(campaign) {
  const opening = openingMunitions();
  const reading = selectMunitions(campaign);
  const drawn = reading.classes.filter((row) => row.index < opening.us[row.id].count && row.onOrder > 0);
  if (drawn.length === 0) throw new Error(`no class was drawn below its opening with an order placed: ${JSON.stringify(reading)}`);
  const today = campaign.calendar;
  for (const row of drawn) {
    const arrives = row.nextArrival;
    if (!arrives || arrives.year * 10000 + arrives.month * 100 + arrives.day <= today.year * 10000 + today.month * 100 + today.day) {
      throw new Error(`${row.id}'s restock has already arrived`);
    }
  }
}

export function build() {
  const campaign = advanceWeeks(openWar(foundFixture({ seedText: "fixture-munitions-drawdown", leaderName: "Fixture President" })), 4);
  assertStocks(campaign);
  return campaign;
}
