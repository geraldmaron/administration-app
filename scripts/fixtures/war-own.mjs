// A war the United States is a principal of: Iran has struck first and the front
// is hot, with terms not yet on the table. The war screen's ending block reads
// the President's own war, which a join into somebody else's cannot: cooling the
// front, putting terms, and a settlement that is the President's to sign.
import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "war-own";

const IRAN = "IRN";

export function build() {
  const campaign = foundFixture({ seedText: "fixture-war-own", leaderName: "Fixture President" });
  const us = campaign.founding.nation;
  const war = { ...openConflict(IRAN, us, campaign.turn, "Iran strikes American forces in the Gulf."), intensity: 0.5 };
  const staged = apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: war.cause },
    effects: [{ kind: "conflict", set: war }],
  });
  const stored = Object.values(staged.conflicts).find((conflict) => conflict.defender === us && conflict.status === "active");
  if (!stored) throw new Error("the war on the United States is not on the board");
  return staged;
}
