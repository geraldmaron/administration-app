// The two saved campaigns this workstream owes the browser suite, proven here
// against source.
//
// The fixture modules build against the compiled packages, so they cannot be run
// from a test — and three other workstreams read `wildfire-colorado` by name.
// This asserts the same state from the same functions, so a change that would
// break either fixture fails here first instead of in somebody else's spec.
import { describe, expect, it } from "vitest";
import { conditionFlagsToSet, conditionId, openCondition } from "./condition-onset.js";
import { hazardNoun } from "./condition-impacts.js";
import { composeArticle } from "./article.js";
import { placeCaption } from "./us-placement.js";
import { nationName, sentenceCase } from "./naming.js";
import { markedFlags } from "./marked-flags.js";
import { createRngStreams } from "./rng.js";
import { obligationPhase, reliefSignature } from "./obligations.js";
import { responseOperationsFor } from "./response.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import type { StateId } from "@admin/world";
import type { ConditionKind, Campaign, FeedItem, NationCondition } from "./state.js";
import { selectActiveConditions } from "./state.js";

/** The onset the engine would have written, moved to a named state. */
function stagedOnset(campaign: Campaign, kind: ConditionKind, state: StateId, severity: number): NationCondition {
  const nation = campaign.founding.nation;
  const stream = createRngStreams(campaign.seed).stream("condition-open", nation, kind, campaign.turn);
  const drawn = openCondition(campaign, { nation, kind, chance: 1 }, stream);
  const country = sentenceCase(nationName(campaign.nations[nation]!.base.identity));
  const geo = campaign.nations[nation]!.base.geo;
  return {
    ...drawn,
    id: conditionId(kind, nation, campaign.turn, state),
    scope: "region",
    severity,
    place: state,
    city: undefined,
    state,
    beats: [
      {
        turn: campaign.turn,
        description: `${country} is struck by ${hazardNoun(kind, geo)} ${placeCaption(campaign, { state }, "region")}.`,
      },
    ],
  };
}

function fileOnset(campaign: Campaign, condition: NationCondition, facts: FeedItem["facts"]): Campaign {
  const headline = condition.beats[0]!.description;
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
          { turn: campaign.turn + 1, kind: "condition", visibility: "public", headline, target: condition.nation, facts },
        ],
      },
    ],
  });
}

describe("wildfire-colorado", () => {
  const { campaign: opening } = foundedForBalance("fixture-wildfire-colorado");
  const fire = stagedOnset(opening, "wildfire", "CO" as StateId, 0.62);
  const struck = fileOnset(opening, fire, { phase: "onset", dateline: "Colorado" });
  const campaign = obligationPhase(struck).reduce((state, packet) => apply(state, packet), struck);

  it("has a wildfire burning in Colorado, and it is a file rather than an afternoon", () => {
    const live = selectActiveConditions(campaign).find((entry) => entry.kind === "wildfire" && entry.state === "CO");
    expect(live).toBeTruthy();
    expect(live!.lifetime).toBeUndefined();
    expect(live!.place).toBe("CO");
  });

  it("names Colorado in the dispatch the onset filed", () => {
    const item = campaign.feed.find((entry) => entry.kind === "condition");
    expect(item?.headline).toMatch(/Colorado/);
    expect(item?.headline).toMatch(/wildfires/);
    expect(item?.facts?.dateline).toBe("Colorado");
  });

  it("carries Colorado's own request to Washington", () => {
    const claims = campaign.states.CO!.claims.filter((claim) => claim.signature === reliefSignature("wildfire"));
    expect(claims.length).toBeGreaterThan(0);
  });

  it("has FEMA leading the federal response", () => {
    const live = selectActiveConditions(campaign).find((entry) => entry.kind === "wildfire")!;
    const operations = responseOperationsFor(campaign, live);
    expect(operations.length).toBeGreaterThan(0);
    expect(operations[0]!.lead).toBe("INST-FEMA");
  });
});

describe("incident-home", () => {
  const { campaign: opening } = foundedForBalance("fixture-incident-home");
  const tornado = stagedOnset(opening, "tornado", "OK" as StateId, 0.55);
  const campaign = fileOnset(opening, tornado, { phase: "onset", dateline: "Oklahoma", topicTags: ["incident"] });

  it("has a tornado in Oklahoma marked as an incident from its onset", () => {
    const live = selectActiveConditions(campaign).find((entry) => entry.kind === "tornado");
    expect(live?.lifetime).toBe("incident");
    expect(live?.state).toBe("OK");
  });

  it("files exactly one dispatch for the incident", () => {
    const filed = campaign.feed.filter(
      (item) => item.kind === "condition" && item.facts?.topicTags?.includes("incident"),
    );
    expect(filed).toHaveLength(1);
  });

  it("writes that one dispatch in the incident register", () => {
    const filed = campaign.feed.find((item) => item.facts?.topicTags?.includes("incident"))!;
    const article = composeArticle(filed, {
      playerNation: campaign.founding.nation,
      playerNationName: "the United States",
    });
    expect(article.paragraphs[0]).toMatch(/tornado/);
    expect(article.paragraphs.join(" ")).not.toMatch(/developing/);
    expect(article.paragraphs.join(" ")).toMatch(/Oklahoma/);
  });
});
