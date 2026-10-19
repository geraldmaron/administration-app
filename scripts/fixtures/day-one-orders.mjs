// The oath with two orders signed on the first morning: what a President who
// picked orders at the transition opens on. Both are signed against the sealed
// campaign in the order picked, before a single week runs, so the records
// carry the inauguration week as the administration's first acts.
import { apply } from "../../packages/engine/dist/effects.js";
import { dayOneOrders, signOrder } from "../../packages/engine/dist/orders.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "day-one-orders";

const PICKS = ["order-border-controls", "order-clean-energy"];

export function build() {
  const sworn = foundFixture({ seedText: "fixture-day-one-orders", leaderName: "Fixture President" });
  const offered = new Set(dayOneOrders(sworn).map((order) => order.id));
  const charter = charterOf(sworn);
  const streams = createRngStreams(sworn.seed);
  return PICKS.reduce((campaign, id) => {
    if (!offered.has(id)) throw new Error(`${id} is not offered on the first morning of this fixture`);
    const signed = signOrder(campaign, charter, id, streams);
    if (!signed.ok) throw new Error(`${id} could not be signed on the first morning: ${signed.reason}`);
    return apply(campaign, signed.packet);
  }, sworn);
}
