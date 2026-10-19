import { describe, expect, it } from "vitest";
import { apply, enableGodMode, hasIntelOnNation, liveTemperament, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { TEMPERAMENT_AXES, temperamentBand, temperamentReading, temperamentReadings } from "./temperament-words";

const campaign = openingCampaign({ seedText: "foreign-truth-gate" });
const god = apply(campaign, enableGodMode(campaign));
const foreign = (Object.keys(campaign.nations) as NationId[]).filter((id) => id !== campaign.founding.nation);

describe("a government's temperament in words", () => {
  it("says nothing about a government the services cannot read", () => {
    const unread = foreign.filter((id) => !hasIntelOnNation(campaign, id));
    expect(unread.length).toBeGreaterThan(0);
    for (const id of unread) expect(temperamentReadings(id, campaign), id).toEqual([]);
  });

  it("states a place in the world, never an absolute word", () => {
    for (const axis of TEMPERAMENT_AXES) {
      for (const id of foreign) {
        const text = temperamentBand(id, axis, god)!;
        expect(text, `${id} ${axis}`).toMatch(/(than|as) most governments$/);
        expect(text).not.toMatch(/\d/);
      }
    }
  });

  it("cuts each axis at the world's own fifths, so no band holds most of the world", () => {
    for (const axis of TEMPERAMENT_AXES) {
      const counts = [1, 2, 3, 4, 5].map((level) => foreign.filter((id) => temperamentReading(id, axis, god)?.level === level).length);
      expect(Math.max(...counts), axis).toBeLessThan(foreign.length / 2);
      expect(counts.filter((count) => count > 0).length, axis).toBeGreaterThanOrEqual(3);
    }
  });

  it("does not read one bloc's temperament as its identity: NATO's governments do not all land on one side", () => {
    const nato = foreign.filter((id) => campaign.nations[id]!.base.memberships.some((org) => (org as string) === "ORG-NATO"));
    expect(nato.length).toBeGreaterThan(10);
    const levels = new Set(nato.map((id) => temperamentReading(id, "isolationism", god)!.level));
    expect(levels.size).toBeGreaterThan(1);
  });
});

describe("how the leader in office leans their government", () => {
  const fidelityOf = (id: NationId) => god.nations[id]!.base.fidelity ?? "full";
  const midRange = (id: NationId) => god.nations[id]!.traits.aggression > 0.15 && god.nations[id]!.traits.aggression < 0.85;
  const full = foreign.find((id) => fidelityOf(id) === "full" && midRange(id))!;
  const fitted = foreign.find((id) => fidelityOf(id) !== "full" && midRange(id))!;

  // Stages the seat so the leader's whole lean on aggression comes to `target`,
  // whatever the leader already in office brings to it.
  function leaning(state: Campaign, id: NationId, target: number): Campaign {
    const seats = state.foreignPolitics?.seats ?? {};
    const seat = seats[id] ?? { since: state.calendar, offset: {}, provenance: "played" as const };
    const lean = liveTemperament(state, id)!.aggression - state.nations[id]!.traits.aggression;
    const offset = { ...seat.offset, aggression: (seat.offset.aggression ?? 0) + target - lean };
    return { ...state, foreignPolitics: { seats: { ...seats, [id]: { ...seat, offset } }, recent: state.foreignPolitics?.recent ?? [] } };
  }

  it("says which way the leader moves a researched government, against how it usually is", () => {
    const hawk = temperamentReading(full, "aggression", leaning(god, full, 0.08))!;
    expect(hawk.text).toMatch(/ most governments\. Under .+, it is quicker to use force than it usually is$/);
    const dove = temperamentReading(full, "aggression", leaning(god, full, -0.08))!;
    expect(dove.text).toMatch(/Under .+, it is slower to use force than it usually is$/);
    expect(hawk.level).toBe(dove.level);
  });

  it("stays quiet about a lean too small to change how the government reads", () => {
    const slight = temperamentReading(full, "aggression", leaning(god, full, 0.01))!;
    expect(slight.text).toMatch(/(than|as) most governments$/);
  });

  it("never claims a leader's lean on a government whose temperament is fitted rather than researched", () => {
    expect(fitted).toBeDefined();
    const reading = temperamentReading(fitted, "aggression", leaning(god, fitted, 0.08))!;
    expect(reading.text).toMatch(/(than|as) most governments$/);
  });

  it("says nothing at all where the services cannot read the government", () => {
    const unread = foreign.find((id) => !hasIntelOnNation(campaign, id) && midRange(id))!;
    expect(temperamentReadings(unread, leaning(campaign, unread, 0.08))).toEqual([]);
  });
});
