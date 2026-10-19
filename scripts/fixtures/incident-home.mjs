// A home incident: one bad afternoon in one place, with nothing developing
// afterwards.
//
// A tornado, because a tornado is the one thing on the hazard list that is over
// before the next week starts, and the record says so from its onset:
// `lifetime: "incident"`. What this fixture exists to prove is that one incident
// files one article and opens one Desk row — so it is sealed on the week the
// tornado touched down, with the incident still live and its single dispatch on
// the wire.
//
// Staged through the condition system's own shapes, and placed in Oklahoma
// because the draw cannot be asked to guarantee a place.
import { apply } from "../../packages/engine/dist/effects.js";
import { conditionFlagsToSet, conditionId, openCondition } from "../../packages/engine/dist/condition-onset.js";
import { hazardNoun } from "../../packages/engine/dist/condition-impacts.js";
import { composeArticle } from "../../packages/engine/dist/article.js";
import { placeCaption } from "../../packages/engine/dist/us-placement.js";
import { nationName, sentenceCase } from "../../packages/engine/dist/naming.js";
import { markedFlags } from "../../packages/engine/dist/marked-flags.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { selectActiveConditions } from "../../packages/engine/dist/state-selectors.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "incident-home";

const OKLAHOMA = "OK";

/** The onset the engine would have written, moved to Oklahoma. */
export function homeTornado(campaign) {
  const nation = campaign.founding.nation;
  const stream = createRngStreams(campaign.seed).stream("condition-open", nation, "tornado", campaign.turn);
  const drawn = openCondition(campaign, { nation, kind: "tornado", chance: 1 }, stream);
  const place = { state: OKLAHOMA };
  const country = sentenceCase(nationName(campaign.nations[nation].base.identity));
  const geo = campaign.nations[nation].base.geo;
  return {
    ...drawn,
    id: conditionId("tornado", nation, campaign.turn, OKLAHOMA),
    scope: "region",
    severity: 0.55,
    place: OKLAHOMA,
    city: undefined,
    state: OKLAHOMA,
    beats: [
      {
        turn: campaign.turn,
        description: `${country} is struck by ${hazardNoun("tornado", geo)} ${placeCaption(campaign, place, "region")}.`,
      },
    ],
  };
}

function touchdown(campaign) {
  const condition = homeTornado(campaign);
  const headline = condition.beats[0].description;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: headline },
    effects: [
      { kind: "condition", set: condition },
      { kind: "flag", set: markedFlags(conditionFlagsToSet(condition), campaign.turn) },
      {
        kind: "feed",
        items: [
          {
            turn: campaign.turn + 1,
            kind: "condition",
            visibility: "public",
            headline,
            target: condition.nation,
            // The tag is what routes the piece to the incident register, and the
            // engine writes it for any condition marked as an incident.
            facts: { phase: "onset", dateline: "Oklahoma", topicTags: ["incident"] },
          },
        ],
      },
    ],
  });
}

export function build() {
  const opening = advanceWeeks(foundFixture({ seedText: "fixture-incident-home", leaderName: "Fixture President" }), 2);
  const campaign = touchdown(opening);

  const live = selectActiveConditions(campaign).find((entry) => entry.kind === "tornado");
  if (!live) throw new Error("no tornado is on the board");
  if (live.lifetime !== "incident") throw new Error("the tornado is not marked as an incident");
  if (live.state !== OKLAHOMA) throw new Error(`the tornado landed in ${live.state}, not Oklahoma`);

  const filed = campaign.feed.filter((item) => item.kind === "condition" && item.facts?.topicTags?.includes("incident"));
  if (filed.length !== 1) throw new Error(`the incident filed ${filed.length} dispatches, not one`);

  const article = composeArticle(filed[0], {
    playerNation: campaign.founding.nation,
    playerNationName: campaign.founding.nationName,
  });
  if (!/tornado/.test(article.paragraphs[0])) throw new Error("the incident piece does not lead on what happened");
  if (/developing/.test(article.paragraphs.join(" "))) {
    throw new Error("the incident piece hedges about a situation that is already over");
  }
  return campaign;
}
