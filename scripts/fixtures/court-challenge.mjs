// An executive order under a court challenge, pending before the bench.
//
// Signed through the engine's own `signOrder`, whose challenge roll is seeded
// on (campaign seed, order, turn): on any one oath a given signature either is
// or is not contested, and no single oath is guaranteed to draw one. So the
// fixture walks a fixed run of seeds, and on each signs the orders a challenge
// can reach, highest odds first, until a signature comes back contested — the
// way `contested-nominee.mjs` looks for the oath whose Senate argues.
import { apply } from "../../packages/engine/dist/effects.js";
import { EXECUTIVE_ORDERS, projectOrder, signOrder } from "../../packages/engine/dist/orders.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "court-challenge";

const SEEDS = 20;

export function contestedOn(campaign) {
  const charter = charterOf(campaign);
  const streams = createRngStreams(campaign.seed);
  const reachable = EXECUTIVE_ORDERS.map((order) => ({ order, chance: projectOrder(campaign, charter, order).challengeChance }))
    .filter((entry) => entry.chance > 0)
    .sort((a, b) => b.chance - a.chance || a.order.id.localeCompare(b.order.id));
  for (const { order } of reachable) {
    const signed = signOrder(campaign, charter, order.id, streams);
    if (signed.ok && signed.contested) return apply(campaign, signed.packet);
  }
  return undefined;
}

export function build() {
  for (let attempt = 0; attempt < SEEDS; attempt += 1) {
    const sworn = foundFixture({ seedText: attempt === 0 ? "fixture-court-challenge" : `fixture-court-challenge-${attempt}`, leaderName: "Fixture President" });
    const campaign = contestedOn(sworn);
    if (campaign) {
      const pending = campaign.orders.filter((record) => record.contested && record.review?.status === "pending");
      if (pending.length !== 1) throw new Error(`expected one order before the Court, found ${pending.length}`);
      return campaign;
    }
  }
  throw new Error(`no oath in ${SEEDS} seeds drew a court challenge on any order`);
}
