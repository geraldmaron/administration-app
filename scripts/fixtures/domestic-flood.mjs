// A flood at home, filed as a domestic dispatch: the desk that opens it reads
// it as the country's own news, not as a foreign government's move. The same
// wire carries a restricted read beside it, so the two things the wire has to
// tell apart from a newspaper are both on it: home news, and intelligence.
//
// A home onset is a rare draw (one of three seeds reaches any home condition
// inside thirty weeks, and none of them a flood), so the onset is staged with
// the conditions phase's own shapes: the condition is opened through the
// phase's own `openCondition`, on the stream key `openOnsets` would draw from
// if a flood had actually won its roll this turn, so the headline, the scope
// and the place all come out of the engine rather than off the fixture's own
// pen. The public dispatch is then filed against the player's own nation with
// nobody foreign in it, and the phase runs its week over it. Nothing new is
// stored on the item, so this is also the shape every save written before
// scope was inferred already holds.
import { apply } from "../../packages/engine/dist/effects.js";
import { openCondition } from "../../packages/engine/dist/condition-onset.js";
import { composeArticle } from "../../packages/engine/dist/article.js";
import { resolveAction } from "../../packages/engine/dist/resolution.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { hasIntelOnNation } from "../../packages/engine/dist/state-selectors.js";
import { wireActFor } from "../../packages/engine/dist/npc-turn.js";
import { wireLine, wireStake } from "../../packages/engine/dist/wire.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "domestic-flood";

export function floodCondition(campaign) {
  const nation = campaign.founding.nation;
  const stream = createRngStreams(campaign.seed).stream("condition-open", nation, "flood", campaign.turn);
  return openCondition(campaign, { nation, kind: "flood", chance: 1 }, stream);
}

function onset(campaign) {
  const nation = campaign.founding.nation;
  const condition = floodCondition(campaign);
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

// A covert move by a government the services read, filed the way the world's
// week files one: restricted circulation, because nobody published it. The
// idle world rarely produces one (none inside forty weeks on the fixture
// seeds), so one surveillance move is resolved through the same resolver and
// filed with the same rule; the move and its outcome are the engine's.
const WATCHERS = ["CAN", "DEU", "BRA", "MEX", "ITA"];
const WATCHED = ["VEN", "CUB", "NIC", "BOL"];
// The NPC phase's own rule: a government this open publishes its own moves,
// and a move the target exposed is news, not intelligence.
const SELF_EXPOSING_TRANSPARENCY = 0.7;

function quietSurveillance(campaign) {
  for (const actor of WATCHERS) {
    if (!hasIntelOnNation(campaign, actor) || (campaign.nations[actor]?.traits.transparency ?? 1) >= SELF_EXPOSING_TRANSPARENCY) continue;
    for (const target of WATCHED) {
      const result = resolveAction(campaign, { actor, target, instrument: "covert", rung: 1 }, createRngStreams(campaign.seed), "simulate");
      if (result.ok && result.success) return result;
    }
  }
  throw new Error("no government the services read lands a quiet surveillance move");
}

function restrictedRead(campaign) {
  const result = quietSurveillance(campaign);
  const act = wireActFor(campaign, result, campaign.turn + 1);
  const { actor, target } = result.projection.request;
  const item = {
    turn: campaign.turn + 1,
    kind: "npc-action",
    visibility: "intelligence",
    headline: wireLine(act),
    actor,
    target,
    facts: { instrument: result.projection.rungName, stake: wireStake(act) },
  };
  return apply(campaign, { ...result.packet, effects: [...result.packet.effects, { kind: "feed", items: [item] }] });
}

export function build() {
  const opening = advanceWeeks(foundFixture({ seedText: "fixture-domestic-flood", leaderName: "Fixture President" }), 1);
  const campaign = restrictedRead(advanceWeeks(onset(opening), 1));
  const item = campaign.feed.find((entry) => entry.kind === "condition" && /struck by flooding/.test(entry.headline));
  if (!item || item.actor !== undefined || item.target !== campaign.founding.nation) throw new Error("the flood dispatch is not filed at home");
  const article = composeArticle(item, { playerNation: campaign.founding.nation, playerNationName: campaign.founding.nationName });
  if (!article.domestic) throw new Error("the flood dispatch does not read as domestic");
  if (!campaign.feed.slice(-14).some((entry) => entry.visibility === "intelligence")) throw new Error("the wire carries no restricted read");
  return campaign;
}
