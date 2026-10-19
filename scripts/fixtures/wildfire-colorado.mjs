// A wildfire open in Colorado, with the state's request in and the federal
// response running.
//
// Read by three specs, so its name and its shape are load-bearing: the West
// regional masthead needs a home disaster with a state on it, the content bind
// needs a live condition whose place a decision can name, and this workstream's
// own spec needs the dispatch the onset filed.
//
// The condition is staged through the condition system's own shapes rather than
// written by hand — `openCondition` for the record, the hazard vocabulary for the
// sentence, `obligationPhase` for the state's claim — and then placed in
// Colorado, which is the one thing the draw cannot be asked to guarantee. A
// fixture whose headline came off its own pen would pass every spec while the
// engine wrote something else.
import { apply } from "../../packages/engine/dist/effects.js";
import { conditionFlagsToSet, conditionId, openCondition } from "../../packages/engine/dist/condition-onset.js";
import { hazardNoun } from "../../packages/engine/dist/condition-impacts.js";
import { obligationPhase } from "../../packages/engine/dist/obligations.js";
import { responseOperationsFor } from "../../packages/engine/dist/response.js";
import { placeCaption } from "../../packages/engine/dist/us-placement.js";
import { nationName, sentenceCase } from "../../packages/engine/dist/naming.js";
import { markedFlags } from "../../packages/engine/dist/marked-flags.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { selectActiveConditions } from "../../packages/engine/dist/state-selectors.js";
import { pendingConversation } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "wildfire-colorado";

const COLORADO = "CO";

/** The pack's decision bound to the fire that is burning, which is what the bind spec reads. */
const BOUND_DECISION = "the-ridge-above-the-reservoir";

/** The onset the engine would have written, moved to Colorado. */
export function coloradoWildfire(campaign) {
  const nation = campaign.founding.nation;
  const stream = createRngStreams(campaign.seed).stream("condition-open", nation, "wildfire", campaign.turn);
  const drawn = openCondition(campaign, { nation, kind: "wildfire", chance: 1 }, stream);
  const place = { state: COLORADO };
  const country = sentenceCase(nationName(campaign.nations[nation].base.identity));
  const geo = campaign.nations[nation].base.geo;
  return {
    ...drawn,
    id: conditionId("wildfire", nation, campaign.turn, COLORADO),
    scope: "region",
    severity: 0.62,
    place: COLORADO,
    city: undefined,
    state: COLORADO,
    beats: [
      {
        turn: campaign.turn,
        description: `${country} is struck by ${hazardNoun("wildfire", geo)} ${placeCaption(campaign, place, "region")}.`,
      },
    ],
  };
}

function onset(campaign) {
  const condition = coloradoWildfire(campaign);
  const headline = condition.beats[0].description;
  const struck = apply(campaign, {
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
            facts: { phase: "onset", dateline: "Colorado" },
          },
        ],
      },
    ],
  });
  // The state's request: the obligation phase opens a relief claim on the turn a
  // home condition opened, and only on that turn.
  return obligationPhase(struck).reduce((state, packet) => apply(state, packet), struck);
}

function onsetOn(seedText) {
  return onset(advanceWeeks(foundFixture({ seedText, leaderName: "Fixture President" }), 2));
}

/**
 * A seed on which the director draws the fire's own decision for the week. The
 * draw is weighted, not forced: the fire makes the disaster class likelier, but
 * the decision it binds is about one in forty of the week's draw against the
 * whole corpus, and on most seeds the week goes to something else, which is the
 * director doing its job. The fixture is a week where it went to the fire,
 * found rather than written.
 *
 * The search starts at the first such seed of the run, the sixty-ninth, so the
 * save builds from one founding; if the engine moves the draw, it walks on to
 * the next seed that stages the fire rather than silently keeping a week that
 * does not.
 */
const FIRST_FIRE_WEEK = 68;
const SEEDS_SEARCHED = 200;

function fireWeek() {
  for (let attempt = FIRST_FIRE_WEEK; attempt < FIRST_FIRE_WEEK + SEEDS_SEARCHED; attempt += 1) {
    const campaign = onsetOn(`fixture-wildfire-colorado-${attempt}`);
    if (pendingConversation(campaign)?.def.id === BOUND_DECISION) return campaign;
  }
  throw new Error(`no seed in the fixture's run stages ${BOUND_DECISION} in the week of the fire`);
}

export function build() {
  const campaign = fireWeek();

  const live = selectActiveConditions(campaign).find((entry) => entry.kind === "wildfire" && entry.state === COLORADO);
  if (!live) throw new Error("no wildfire is burning in Colorado");
  if (live.lifetime !== undefined) throw new Error("a wildfire is a file the government carries, not an incident");
  if (!campaign.feed.some((item) => item.kind === "condition" && /Colorado/.test(item.headline))) {
    throw new Error("the Colorado wildfire filed no dispatch");
  }
  const claims = campaign.states[COLORADO].claims.filter((claim) => claim.signature === "relief:wildfire");
  if (claims.length === 0) throw new Error("Colorado asked Washington for nothing");
  const operations = responseOperationsFor(campaign, live);
  if (operations.length === 0) throw new Error("no federal body is carrying the fire");
  if (operations[0].lead !== "INST-FEMA") throw new Error(`the response is led by ${operations[0].lead}, not FEMA`);
  return campaign;
}
