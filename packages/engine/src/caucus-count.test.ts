/**
 * Each caucus votes its own reading of a bill that has a domestic signature.
 */
import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { projectPassage, restrainsThePresident, stanceOf } from "./bill-stages.js";
import { readingsFor, splitSupport } from "./caucus-count.js";
import { countVote } from "./congress-votes.js";
import { legislativeAct } from "./legislative-acts.js";

describe("caucus readings on the floor", () => {
  it("gives the two caucuses different support on the same bill", () => {
    const defense = legislativeAct("act-defense-authorization")!.domestic!;
    const readings = readingsFor(defense, "democrat");
    expect(readings.administration).not.toBe(readings.opposition);
    const split = splitSupport(0.6, readings);
    expect(split.own).not.toBe(split.opposition);
  });

  it("leaves a bill with no signature to the room, its appeal and whose bill it is", () => {
    const campaign = buildCampaign();
    const fiscal = legislativeAct("act-fiscal-responsibility")!;
    expect(fiscal.domestic).toBeUndefined();
    expect(restrainsThePresident(fiscal)).toBe(false);
    const counted = projectPassage(campaign, fiscal);
    const house = counted.find((vote) => vote.chamber === "house")!;
    const bare = countVote(
      campaign.congress,
      "house",
      fiscal.appeal,
      house.required,
      campaign.states,
      undefined,
      stanceOf(fiscal),
    );
    expect(house.yeas).toBe(bare.yeas);
    // And the sponsor is the whole of the difference from a measure nobody owns:
    // the opposition wrote this one, so their caucus is the one whipped for it.
    expect(stanceOf(fiscal)).toBe("opposition");
    const nobodys = countVote(campaign.congress, "house", fiscal.appeal, house.required, campaign.states);
    expect(house.byCaucus!.opposition.yeas).toBeGreaterThan(nobodys.byCaucus.opposition.yeas);
    expect(house.byCaucus!.administration.yeas).toBeLessThan(nobodys.byCaucus.administration.yeas);
  });

  it("reads a defense bill and a farm bill as different caucus positions", () => {
    const defense = readingsFor(legislativeAct("act-defense-authorization")!.domestic!, "republican");
    const farm = readingsFor(legislativeAct("act-agriculture-improvement")!.domestic!, "republican");
    expect(defense.administration).not.toBe(farm.administration);
  });
});
