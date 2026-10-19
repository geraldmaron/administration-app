// A hurricane at home, staged the way `domestic-flood.mjs` stages a flood:
// through the conditions phase's own shapes (`openCondition`, on the stream
// key an actual onset roll would draw from this turn), so the headline and
// the place placeUsOnset picks are both the engine's, not the fixture's own
// pen. A US acute onset is a rare draw in an ordinary run, so this is staged
// rather than waited for.
//
// The point of this fixture is a hurricane request that carries its own due
// date. Staging the condition is only step one — the claim
// `governorRequestItems` reads does not exist until `obligationPhase` has
// actually run over it, which is why this fixture advances one week after the
// onset (the same turn the condition opened under, so `obligationPhase`'s
// `startedTurn === state.turn` guard still matches) and then asserts a claim
// landed, rather than assuming the onset alone was enough.
import { apply } from "../../packages/engine/dist/effects.js";
import { openCondition } from "../../packages/engine/dist/condition-onset.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { caseDetails } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture, withOpeningCommodities } from "./_campaign.mjs";

export const name = "hurricane-request";

export function cycloneCondition(campaign) {
  const nation = campaign.founding.nation;
  const stream = createRngStreams(campaign.seed).stream("condition-open", nation, "cyclone", campaign.turn);
  return openCondition(campaign, { nation, kind: "cyclone", chance: 1 }, stream);
}

function onset(campaign) {
  const nation = campaign.founding.nation;
  const condition = cycloneCondition(campaign);
  const headline = condition.beats[0].description;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: headline },
    effects: [
      { kind: "condition", set: condition },
      { kind: "feed", items: [{ turn: campaign.turn + 1, kind: "condition", visibility: "public", headline, target: nation }] },
    ],
  });
}

export function build() {
  const opening = advanceWeeks(foundFixture({ seedText: "fixture-hurricane-request", leaderName: "Fixture President" }), 1);
  const campaign = advanceWeeks(onset(opening), 1);
  const claims = Object.values(campaign.states).flatMap((state) => state.claims.filter((claim) => claim.signature.startsWith("relief:")));
  if (claims.length === 0) throw new Error("the cyclone onset opened no governor's relief claim");
  if (claims.some((claim) => claim.expiresTurn <= claim.openedTurn)) throw new Error("a relief claim carries no forward-dated expiry");
  // The relief request is the one matter this save stages, so a price case the
  // markets raised in the same two weeks would lead the Desk in its place.
  const calm = withOpeningCommodities(campaign);
  const priced = caseDetails(calm).filter((row) => row.id.startsWith("case:commodity:"));
  if (priced.length > 0) throw new Error(`the calmed markets still raise: ${priced.map((row) => row.id).join(", ")}`);
  return calm;
}
