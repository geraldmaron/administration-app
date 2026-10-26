// Political opposition is a signal of cooperation risk, not a lawsuit.

import { describe, expect, it } from "vitest";
import type { PersonId, StateId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { attorneyGeneralSelection, opposingAttorneyGeneral, statePartyName, statePlaintiffs, stateOppositionThisWeek, pickStateOpposition, type StateOppositionSeat } from "./state-suits.js";
import type { AdministrationParty, Campaign, UsMajorParty, UsParty } from "./state.js";

const AK = "AK" as StateId;
const AL = "AL" as StateId;
const CA = "CA" as StateId;
const WY = "WY" as StateId;

function seat(id: StateId, name: string, party: UsParty | undefined): StateOppositionSeat {
  return { id, name, party };
}

function withGovernors(campaign: Campaign, seats: readonly { id: StateId; party: UsParty }[]): Campaign {
  const states = { ...campaign.states };
  for (const entry of seats) {
    const runtime = states[entry.id];
    if (!runtime) throw new Error(`missing ${entry.id}`);
    states[entry.id] = {
      ...runtime,
      governor: { person: "PER-1" as PersonId, party: entry.party, disposition: 0.5 },
    };
  }
  return { ...campaign, states };
}

function withPresident(campaign: Campaign, party: AdministrationParty, caucusAnchor: UsMajorParty): Campaign {
  return {
    ...campaign,
    congress: { ...campaign.congress, administrationParty: party, caucusAnchor },
  };
}

function withoutCaucusAnchor(campaign: Campaign): Campaign {
  const { caucusAnchor: _anchor, ...congress } = campaign.congress;
  return { ...campaign, congress: congress as Campaign["congress"] };
}

describe("opposition governor signal", () => {
  const founded = buildCampaign();

  it("returns null when no governor is seated", () => {
    expect(stateOppositionThisWeek(founded)).toBeNull();
  });

  it("picks the first sorted state whose governor is the other major party", () => {
    expect(founded.congress.administrationParty).toBe("democrat");
    const suited = withGovernors(founded, [
      { id: WY, party: "republican" },
      { id: CA, party: "republican" },
      { id: AL, party: "democrat" },
      { id: AK, party: "republican" },
    ]);
    const alaska = suited.states.AK;
    const suit = stateOppositionThisWeek(suited);
    expect(suit).toEqual({
      stateId: AK,
      title: "An opposition governor is in office",
      reason: `${alaska!.base.name} has a governor from the other major party. Review their willingness to cooperate with federal action.`,
    });
    expect(JSON.stringify(suit)).not.toMatch(/Jordan|Vale|PER-1/);
    expect(stateOppositionThisWeek(suited)).toEqual(suit);
    expect(suited.states.AK).toBe(alaska);
  });

  it("returns null when every seated governor shares the President's party", () => {
    const aligned = withGovernors(founded, [
      { id: AK, party: "democrat" },
      { id: CA, party: "democrat" },
    ]);
    expect(stateOppositionThisWeek(aligned)).toBeNull();
  });

  it("skips an independent governor and still returns one opposition signal", () => {
    const mixed = withGovernors(founded, [
      { id: AK, party: "independent" },
      { id: WY, party: "republican" },
    ]);
    expect(stateOppositionThisWeek(mixed)?.stateId).toBe(WY);
  });

  it("compares an independent president with the caucus anchor", () => {
    const seated = withGovernors(founded, [
      { id: AK, party: "republican" },
      { id: CA, party: "democrat" },
    ]);
    const republicanAnchor = withPresident(seated, "independent", "republican");
    expect(stateOppositionThisWeek(republicanAnchor)).toEqual({
      stateId: CA,
      title: "An opposition governor is in office",
      reason: `${seated.states.CA!.base.name} has a governor from the other major party. Review their willingness to cooperate with federal action.`,
    });
    expect(stateOppositionThisWeek(withoutCaucusAnchor(republicanAnchor))).toBeNull();
  });

  it("orders seats by state id and stays quiet without an anchor", () => {
    const seats = [
      seat(WY, "Wyoming", "republican"),
      seat(CA, "California", "republican"),
      seat(AK, "Alaska", "independent"),
    ];
    const suit = pickStateOpposition(seats, "democrat");
    expect(suit).toEqual({
      stateId: CA,
      title: "An opposition governor is in office",
      reason: "California has a governor from the other major party. Review their willingness to cooperate with federal action.",
    });
    expect(pickStateOpposition(seats, "democrat")).toEqual(suit);
    expect(pickStateOpposition(seats, "republican")).toBeNull();
    expect(pickStateOpposition(seats, "independent")).toBeNull();
    expect(pickStateOpposition(seats, "independent", "democrat")?.stateId).toBe(CA);
  });
});

describe("state plaintiffs come from injury and the attorney general's office", () => {
  const withLean = (campaign: Campaign, id: StateId, lean: number): Campaign =>
    ({ ...campaign, states: { ...campaign.states, [id]: { ...campaign.states[id]!, lean } } });

  it("lets a governor's appointee follow the governor, and an elected one follow the state", () => {
    const base = withPresident(buildCampaign(), "republican", "republican");
    expect(attorneyGeneralSelection(WY)).toBe("governor");
    expect(attorneyGeneralSelection(CA)).toBe("elected");
    // A Democratic governor in Wyoming appoints a Democrat; a Democratic
    // governor of a strongly Republican elected-AG state does not supply one.
    const governors = withGovernors(base, [{ id: WY, party: "democrat" }, { id: AL, party: "democrat" }]);
    expect(opposingAttorneyGeneral(withLean(governors, WY, 0.6), WY)).toBe(1);
    expect(opposingAttorneyGeneral(withLean(governors, AL, 0.6), AL)).toBeLessThan(0.01);
    expect(opposingAttorneyGeneral(withLean(governors, CA, -0.4), CA)).toBeGreaterThan(0.99);
  });

  it("names no state without an injury it can claim, and ranks injured, opposed states first", () => {
    const base = withLean(withLean(withPresident(buildCampaign(), "republican", "republican"), CA, -0.4), AL, 0.5);
    expect(statePlaintiffs(base, { CA: 1, AL: 1 }, "none", 1)).toEqual([]);
    const named = statePlaintiffs(base, { CA: 1, AL: 1 }, "proprietary", 1);
    expect(named.map((entry) => entry.stateId)).toEqual([CA]);
    expect(statePlaintiffs(base, { CA: 1 }, "residents", 1)[0]!.weight).toBeLessThan(named[0]!.weight);
  });

  it("captions a state the way it styles itself", () => {
    expect(statePartyName(CA, "California")).toBe("State of California, by its Attorney General");
    expect(statePartyName("VA" as StateId, "Virginia")).toMatch(/^Commonwealth of Virginia/);
  });
});
