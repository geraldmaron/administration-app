import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { munitionsPhase, priorityOrder } from "../../packages/engine/dist/munitions.js";
import { executiveOrder, orderMinister, signOrder } from "../../packages/engine/dist/orders.js";
import { rescindOrder } from "../../packages/engine/dist/order-lifecycle.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { advanceTurn, noopPhase } from "../../packages/engine/dist/turn-loop.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

const PHASES = { simulate: [munitionsPhase], select: noopPhase };
let cached;

function week(campaign) { return advanceTurn(campaign, PHASES); }

function prepare(seed) {
  const founded = foundFixture({ seedText: seed, leaderName: "Fixture President" });
  if (!orderMinister(founded, executiveOrder("order-defense-production"))) return undefined;
  const us = founded.founding.nation;
  // Setup assumptions: a funded standing military allocation and a brief
  // U.S. war week. The engine's own munitions phase creates the federal backlog.
  const funded = { ...founded, player: { ...founded.player,
    budget: { ...founded.player.budget, military: Math.max(0.01, founded.player.budget.military ?? 0) } } };
  const war = { ...openConflict(us, "IRN", funded.turn, "American forces strike Iran."), intensity: 0.45 };
  const fighting = apply(funded, { source: "simulate", actor: "world", turn: funded.turn,
    narration: { summary: war.cause }, effects: [{ kind: "conflict", set: war }] });
  const ready = week(fighting);
  const backlog = priorityOrder(ready);
  if (!backlog || backlog.count <= 0) throw new Error("The real munitions phase did not create a precision-fires backlog");
  if (ready.turn > ready.congress.appropriation.throughTurn) return undefined;
  const signature = signOrder(ready, charterOf(ready), "order-defense-production", createRngStreams(ready.seed));
  if (!signature.ok) throw new Error(`The funded priority cannot be signed: ${signature.reason}`);
  // Select an unchallenged signature; the court suite exercises adverse review.
  if (signature.record.review) return undefined;
  const signed = apply(ready, signature.packet);
  const delivering = week(signed);
  const tagged = delivering.munitions?.us["precision-fires"]?.onOrder
    .find((order) => order.priorityContractId === signature.record.id);
  if (!tagged || tagged.count >= backlog.count) throw new Error("The named federal order did not receive bounded fulfillment");
  const withdrawal = rescindOrder(delivering, signature.record.id);
  if (!withdrawal.ok) throw new Error(withdrawal.reason);
  const ended = week(apply(delivering, withdrawal.packet));
  if (!ended.munitions?.us["precision-fires"]?.onOrder.some((order) => order.priorityContractId === signature.record.id)) {
    throw new Error("Rescission erased the vested defense backlog");
  }
  return { ready, delivering, ended };
}

export function executiveDefense(stage) {
  if (!cached) {
    for (let attempt = 0; attempt < 48 && !cached; attempt += 1) {
      cached = prepare(`executive-defense-${attempt}`);
    }
  }
  if (!cached) throw new Error("No funded seed reached an unchallenged named defense priority");
  return cached[stage];
}
