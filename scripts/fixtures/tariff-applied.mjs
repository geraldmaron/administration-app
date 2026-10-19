// A tariff in force on a named partner, with the customs line running and its
// consumer-price step part way through the phase-in.
//
// A quarter on Chinese consumer electronics, signed at the oath and three weeks
// old: long enough for the customs to have come in every week and for the
// economy room's applied reading to be mid-phase, short enough that the step is
// still moving the inflation target. The same sector and rate typed into the
// tariff form must preview the figure the room reads, which is what the spec
// opening this save checks.
import { apply } from "../../packages/engine/dist/effects.js";
import { selectCustomsReceipts } from "../../packages/engine/dist/trade.js";
import { imposeSection301Tariff } from "./_tariff.mjs";
import { projectTariffPrices } from "../../packages/engine/dist/tariff-prices.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "tariff-applied";

export const PARTNER = "CHN";
export const SECTOR = "consumer-electronics";
export const RATE = 0.25;
const WEEKS = 3;

export function build() {
  const opening = foundFixture({ seedText: "fixture-tariff-applied", leaderName: "Fixture President" });
  const imposed = imposeSection301Tariff(opening, PARTNER, SECTOR, RATE);
  if (!imposed.ok) throw new Error(`the tariff was refused: ${imposed.reason}`);
  const campaign = advanceWeeks(apply(imposed.campaign, imposed.packet), WEEKS);
  const live = Object.values(campaign.trade.measures).filter((measure) => measure.kind === "tariff" && measure.liftedTurn === undefined);
  if (live.length !== 1) throw new Error(`expected one tariff in force, found ${live.length}`);
  if (!(selectCustomsReceipts(campaign) > 0)) throw new Error("no customs are coming in on the tariff");
  const prices = projectTariffPrices(campaign);
  if (!(prices.step > 0) || prices.measures[0]?.weeksIn !== WEEKS) throw new Error(`the price step is not phasing in: ${JSON.stringify(prices)}`);
  return campaign;
}
