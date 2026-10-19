import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { PRESS_OUTLETS, outletSpreadAt } from "./press-outlets.js";
import { scandalClosedFlag, scandalPhase, selectScandals } from "./press-scandal.js";
import { apply } from "./effects.js";
import type { Campaign } from "./state.js";

/**
 * A scandal that has resolved must stay resolved.
 *
 * The lifecycle is derived from the corps as it reads *this* week rather than
 * accumulated week by week, which buys it a real simplification and risks a
 * real defect: nothing in the derivation remembers that a story already died,
 * so a corps that turns hostile later could re-judge a finished story as a
 * live one. A story the player watched die and then saw return, with no new
 * fact behind it, is the player-visible form of that bug.
 */
function withLeak(turn: number): Campaign {
  const base = buildCampaign();
  return {
    ...base,
    turn,
    press: {
      ...base.press,
      engagements: [
        { id: "eng-leak-1", kind: "leak", turn: 1, wentWell: false } as never,
      ],
    },
  };
}

/** Push every masthead to one end of the dial. */
function withCorps(campaign: Campaign, standing: number): Campaign {
  return {
    ...campaign,
    press: { ...campaign.press, standing, dispositions: outletSpreadAt(standing) },
  };
}

describe("scandal continuity", () => {
  it("has outlets to read", () => {
    expect(PRESS_OUTLETS.length).toBeGreaterThan(0);
  });

  it("a story that resolved under a friendly corps does not come back when the corps turns", () => {
    // Week 2, every desk as friendly as the dial goes: the story dies.
    const quiet = withCorps(withLeak(2), 1);
    expect(selectScandals(quiet)[0]?.stage).toBe("resolved");

    // The week it died is the week the closure is written.
    const closed = (scandalPhase(quiet) ?? []).reduce(
      (state, packet) => apply(state, packet),
      quiet,
    );

    // A later week, with the corps swung to maximum hostility. Nothing new has
    // happened — only the room has changed — so the story must stay finished.
    const later = withCorps({ ...closed, turn: 3 }, 0);
    expect(selectScandals(later)[0]?.stage).toBe("resolved");
    expect(selectScandals(later)[0]?.intensity).toBe(0);
  });

  it("stamps the closure as assessed — nothing measures that a country is done with a story", () => {
    const quiet = withCorps(withLeak(2), 1);
    const packet = (scandalPhase(quiet) ?? [])[0];
    expect(packet?.provenance?.confidence).toBe("assessed");
    expect(packet?.provenance?.visibility).toBe("public");
  });

  it("a story the corps is still chasing is not closed", () => {
    const hostile = withCorps(withLeak(2), 0);
    const story = selectScandals(hostile)[0]!;
    expect(story.stage).toBe("developing");
    const closes = (scandalPhase(hostile) ?? []).flatMap((packet) =>
      packet.effects.flatMap((effect) => (effect.kind === "flag" ? (effect.set ?? []) : [])),
    );
    expect(closes).not.toContain(scandalClosedFlag(story.id));
  });
});
