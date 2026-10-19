// A war in the Gulf that has taken crude well above its opening level, with the
// pump price following it up two to five weeks behind and the public naming
// gasoline as the reason the economy weighs on it.
//
// Built the way the world would get there: a quiet month, then Iran attacks
// Saudi Arabia, which puts Iran, a custodian of the Strait of Hormuz, at war and
// cuts Saudi output; then six weeks of the ordinary turn, in which the markets
// price the lost barrels and the contested strait. The United States is not a
// party, so every cent the war adds to US prices arrives through crude and
// nothing else.
import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { selectSalience } from "../../packages/engine/dist/opinion.js";
import { oathPumpPrice, selectPumpPrice } from "../../packages/engine/dist/household-prices.js";
import { referenceIndex } from "../../packages/engine/dist/commodity-registry.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "gulf-oil-shock";

const IRAN = "IRN";
const SAUDI_ARABIA = "SAU";
const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 6;
const INTENSITY = 0.8;

function gulfWar(campaign) {
  const war = { ...openConflict(IRAN, SAUDI_ARABIA, campaign.turn, "Iran strikes Saudi oil facilities and threatens shipping in the Strait of Hormuz."), intensity: INTENSITY };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "Iran attacks Saudi Arabia, and tankers stop moving through the Strait of Hormuz." },
    effects: [{ kind: "conflict", set: war }],
  });
}

export function build() {
  const quiet = advanceWeeks(foundFixture({ seedText: "fixture-gulf-oil-shock", leaderName: "Fixture President" }), WEEKS_BEFORE);
  const campaign = advanceWeeks(gulfWar(quiet), WEEKS_AFTER);

  const crude = campaign.markets?.commodities.crude?.index ?? 0;
  if (crude < referenceIndex("crude") * 1.2) throw new Error(`crude reads ${crude.toFixed(3)}, under a fifth above its opening level`);
  if (selectPumpPrice(campaign) <= oathPumpPrice() * 1.08) throw new Error("the pump price has not followed crude up");
  if (!selectSalience(campaign).includes("pumpShock")) throw new Error("the public is not naming gasoline");
  return campaign;
}
