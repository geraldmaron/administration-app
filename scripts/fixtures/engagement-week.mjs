// A week in which the President has called and visited foreign governments,
// with the engagement filed on each edge and the replies weighed, and one
// week of the world's own calls and summits run after it.
//
// Every engagement goes through the engine's own `engagementPacket`, the path
// the country file's call and visit commit through, so the receiving
// government decides for itself and the refusal, where one comes, is the
// engine's. The ally, the partner and the rival are the ones a player reaches
// for first: London for a call, Tokyo for a state visit, Beijing for a summit.
import { apply } from "../../packages/engine/dist/effects.js";
import { engagementPacket } from "../../packages/engine/dist/engagement.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "engagement-week";

const OFFERS = [
  { target: "GBR", kind: "call" },
  { target: "JPN", kind: "visit" },
  { target: "CHN", kind: "summit" },
  { target: "CAN", kind: "envoy" },
];

function engage(campaign, { target, kind }) {
  const made = engagementPacket(campaign, { actor: campaign.founding.nation, target, kind }, createRngStreams(campaign.seed));
  if (!made.ok) throw new Error(`engagement-week: ${made.reason}`);
  return apply(campaign, made.packet);
}

export function build() {
  const founded = foundFixture({ seedText: "fixture-engagement-week", leaderName: "Fixture President" });
  const engaged = OFFERS.reduce((campaign, offer) => engage(campaign, offer), founded);
  return advanceWeeks(engaged, 1);
}
