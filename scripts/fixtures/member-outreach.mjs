import { foundFixture } from "./_campaign.mjs";
import { transmit, transmittableActs } from "../../packages/engine/dist/legislation.js";
import { apply } from "../../packages/engine/dist/effects.js";
export const name = "member-outreach";
export function build() {
  const campaign = foundFixture({ seedText: "fixture-member-outreach", leaderName: "Fixture President" });
  const act = transmittableActs(campaign)[0];
  if (!act) throw new Error("No actual administration proposal exists.");
  const result = transmit(campaign, act.id);
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}
