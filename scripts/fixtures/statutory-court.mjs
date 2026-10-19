// A Congress-originated authorization reaches the floor through the normal
// bill stages, is signed, and is then used in a production-priority order.
// The manufacturers' challenge is opened and advanced only by court phases.
import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { munitionsPhase, priorityOrder } from "../../packages/engine/dist/munitions.js";
import { advanceTurn, noopPhase } from "../../packages/engine/dist/turn-loop.js";
import { legislativeAct } from "../../packages/engine/dist/legislative-acts.js";
import { projectPassage } from "../../packages/engine/dist/bill-stages.js";
import { signBill } from "../../packages/engine/dist/legislation.js";
import { signOrder } from "../../packages/engine/dist/orders.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "statutory-court";
const ACT = "act-defense-authorization";
const ORDER = "order-defense-production";

function enacted(campaign) {
  const act = legislativeAct(ACT);
  if (!act) throw new Error(`no act ${ACT}`);
  const id = `bill:${ACT}:${campaign.turn}`;
  let state = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: "Congress refers its annual defense authorization to committee." },
    effects: [{ kind: "bill", set: { id, act: ACT, title: act.title, sponsor: act.sponsor,
      introducedTurn: campaign.turn, status: "in-progress", stage: "referral",
      passage: projectPassage(campaign, act) } }] });
  for (let week = 0; week < 20; week += 1) {
    const bill = state.bills[id];
    if (bill?.status === "on-the-desk") {
      const result = signBill(state, id);
      if (!result.ok) throw new Error(`signing ${id}: ${result.reason}`);
      return apply(state, result.packet);
    }
    if (bill?.status === "dead") throw new Error(`${id} died in Congress`);
    state = advanceWeeks(state, 1);
  }
  throw new Error(`${id} did not reach the desk`);
}

// A priority order needs an outstanding federal replenishment order to name.
// A brief U.S. war week through the real munitions phase creates that backlog,
// as the executive-defense fixtures do.
function withBacklog(campaign) {
  const war = { ...openConflict(campaign.founding.nation, "IRN", campaign.turn, "American forces strike Iran."), intensity: 0.45 };
  const fighting = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: war.cause }, effects: [{ kind: "conflict", set: war }] });
  const ready = advanceTurn(fighting, { simulate: [munitionsPhase], select: noopPhase });
  if (!priorityOrder(ready)) throw new Error("the munitions phase did not create a precision-fires backlog");
  return ready;
}

export function build() {
  let state = withBacklog(enacted(foundFixture({ seedText: "fixture-statutory-court", leaderName: "Fixture President" })));
  const signature = signOrder(state, charterOf(state), ORDER, createRngStreams(state.seed));
  if (!signature.ok) throw new Error(`signing ${ORDER}: ${signature.reason}`);
  state = apply(state, signature.packet);
  for (let week = 0; week < 4; week += 1) state = advanceWeeks(state, 1);
  const proceeding = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "statutory-authority");
  if (!proceeding?.matter) throw new Error("the manufacturer's statutory case did not open");
  return state;
}
