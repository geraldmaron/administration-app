import { describe, expect, it } from "vitest";
import { GOVERNOR_ASSENT_FLOOR, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { stateRelationship } from "./state-relationship";

const base = openingCampaign();

function withGovernor(disposition: number): Campaign {
  const governor = base.states.CO!.governor!;
  return { ...base, states: { ...base.states, CO: { ...base.states.CO!, governor: { ...governor, disposition } } } };
}

describe("stateRelationship", () => {
  it("reads nothing for a state the campaign does not carry", () => {
    const { CO: _dropped, ...rest } = base.states;
    expect(stateRelationship({ ...base, states: rest } as Campaign, "CO")).toBeUndefined();
  });

  it("names the governor and carries the disposition the engine holds", () => {
    const standing = base.states.CO!.governor!;
    const reading = stateRelationship(base, "CO")!;
    expect(reading.governor?.person).toBe(standing.person);
    expect(reading.governor?.party).toBe(standing.party);
    expect(reading.disposition).toBe(standing.disposition);
  });

  it("puts the lean-against line where the governor stops assenting", () => {
    expect(stateRelationship(withGovernor(GOVERNOR_ASSENT_FLOOR), "CO")!.leansAgainst).toBe(false);
    expect(stateRelationship(withGovernor(GOVERNOR_ASSENT_FLOOR - 0.01), "CO")!.leansAgainst).toBe(true);
  });

  it("orders the words from allied down to opposed", () => {
    expect(stateRelationship(withGovernor(0.9), "CO")!.word).toBe("Allied");
    expect(stateRelationship(withGovernor(0.5), "CO")!.word).toBe("Cooperative");
    expect(stateRelationship(withGovernor(0.3), "CO")!.word).toBe("Guarded");
    expect(stateRelationship(withGovernor(0.05), "CO")!.word).toBe("Opposed");
  });

  it("says plainly when there is no governor instead of inventing a standing", () => {
    const unseated = { ...base, states: { ...base.states, CO: { ...base.states.CO!, governor: undefined } } } as Campaign;
    const reading = stateRelationship(unseated, "CO")!;
    expect(reading.governor).toBeUndefined();
    expect(reading.disposition).toBeUndefined();
    expect(reading.band).toBeUndefined();
    expect(reading.word).toBe("No governor");
    expect(reading.leansAgainst).toBe(false);
  });

  it("reads the District of Columbia without a governor", () => {
    const reading = stateRelationship(base, "DC");
    if (!reading) return;
    expect(reading.governor).toBeUndefined();
    expect(reading.meaning).toMatch(/no governor/i);
  });

  it("counts a state with nothing running as needing nothing", () => {
    const reading = stateRelationship(base, "CO")!;
    expect(reading.needsCount).toBe(reading.needs.length);
    if (reading.needsCount === 0) expect(reading.actCount).toBe(0);
  });

  it("counts an open request as a matter that needs the President, requests first", () => {
    const claim = { signature: "relief:wildfire", openedTurn: base.turn, expiresTurn: base.turn + 4, weight: 0.5, reason: "Colorado asked for help with the fire." };
    const campaign = { ...base, states: { ...base.states, CO: { ...base.states.CO!, claims: [claim] } } } as Campaign;
    const reading = stateRelationship(campaign, "CO")!;
    expect(reading.needs[0]).toMatchObject({ cause: "wildfire", requested: true });
    expect(reading.needsCount).toBeGreaterThan(0);
    expect(reading.actCount).toBeGreaterThan(0);
  });
});
