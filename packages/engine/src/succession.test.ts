import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { advanceRemovalArc, BEAT_THRESHOLDS } from "./removal.js";
import { nextInLine, section4Succession, successionHandover, successionOf } from "./succession.js";
import type { Campaign } from "./state.js";

const { campaign: founded, charter } = foundedForBalance("succession-line", "democrat");

function removed(campaign: Campaign): Campaign {
  return { ...campaign, removal: { ...campaign.removal, resolved: true } };
}

describe("the line of succession", () => {
  it("names nobody while the President serves", () => {
    expect(successionOf(founded)).toBeUndefined();
  });

  it("hands a removed President's office to the Vice President", () => {
    expect(founded.vicePresident).toBeDefined();
    expect(successionOf(removed(founded))).toEqual({ successor: founded.vicePresident, mechanism: "removal", from: "vice-president" });
  });

  it("passes to the Speaker when there is no living Vice President", () => {
    const noVicePresident: Campaign = { ...founded, people: { ...founded.people, [founded.vicePresident!]: { ...founded.people[founded.vicePresident!]!, alive: false } } };
    const speaker = founded.congress.leadership.find((figure) => figure.post === "post-house-speaker")?.person;
    expect(nextInLine(noVicePresident)).toEqual(speaker ? { successor: speaker, from: "speaker" } : undefined);
  });

  it("closes the removal's own ending on the successor taking the oath", () => {
    const name = founded.people[founded.vicePresident!]!.base.name;
    expect(successionHandover(founded)).toContain(`Vice President ${name} takes the oath`);
    const lastBeat = BEAT_THRESHOLDS.length - 1;
    const onTheBrink: Campaign = {
      ...founded,
      removal: {
        ...founded.removal,
        beats: Array.from({ length: lastBeat }, (_, turn) => ({ turn, description: "a step" })),
      },
    };
    const arc = advanceRemovalArc(onTheBrink, charter);
    if (arc.resolved) expect(arc.endingSummary).toContain(`Vice President ${name} takes the oath`);
  });

  it("answers the Twenty-fifth Amendment's fourth section only as a question, and writes nothing", () => {
    expect(section4Succession(founded)).toEqual({ successor: founded.vicePresident, mechanism: "incapacity", from: "vice-president" });
    expect(section4Succession(removed(founded))).toBeUndefined();
    expect(successionOf(founded)).toBeUndefined();
  });
});
