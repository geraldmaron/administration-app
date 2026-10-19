import { describe, expect, it } from "vitest";
import { ERA_POLARIZATION, POLARIZATION_DRIFT_MAX, POLARIZATION_DRIFT_MIN, valenceSlope, type ActionRecord, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { polarizationReading } from "./polarization-reading";

const base = openingCampaign();

function entry(turn: number, actor: ActionRecord["actor"], polarization: number, description: string): ActionRecord {
  return { turn, actor, description, mood: { polarization } };
}

/**
 * A term of divisive weeks: the administration split the country five times,
 * the world's own drift added a little, and two quiet weeks gave some back.
 */
function dividedTerm(): Campaign {
  const ledger: readonly ActionRecord[] = [
    entry(2, "player", 0.012, "The port closure is signed."),
    entry(3, "world", 0.004, "The country's cells pull further apart."),
    entry(4, "player", 0.03, "The deportation order is signed."),
    entry(6, "world", -0.004, "The week gives some of it back."),
    entry(9, "player", 0.008, "The veto is issued."),
    entry(11, "world", -0.004, "The week gives some of it back."),
  ];
  const added = ledger.reduce((sum, record) => sum + record.mood!.polarization!, 0);
  return {
    ...base,
    turn: 12,
    ledger: [...base.ledger, ...ledger],
    player: {
      ...base.player,
      opinion: { ...base.player.opinion, polarization: base.player.opinion.polarization + added },
    },
  };
}

describe("the division reading", () => {
  it("reads the figure the campaign actually carries, never a re-derived one", () => {
    const campaign = dividedTerm();
    expect(polarizationReading(campaign).value).toBeCloseTo(campaign.player.opinion.polarization, 10);
  });

  it("reads the era's level as the anchor and the administration's part as the drift", () => {
    const reading = polarizationReading(dividedTerm());
    expect(reading.anchor).toBe(ERA_POLARIZATION);
    expect(reading.drift).toBeCloseTo(reading.value - ERA_POLARIZATION, 10);
    expect([reading.driftMin, reading.driftMax]).toEqual([POLARIZATION_DRIFT_MIN, POLARIZATION_DRIFT_MAX]);
    expect(reading.againstEra).toBeCloseTo(reading.value / ERA_POLARIZATION - 1, 10);
    expect(reading.position).toBeGreaterThan(reading.anchorAt);
  });

  it("says how much of the division the administration's own decisions added", () => {
    const reading = polarizationReading(dividedTerm());
    expect(reading.addedByUs).toBeCloseTo(0.012 + 0.03 + 0.008, 10);
    expect(reading.addedByTheWorld).toBeCloseTo(0.004, 10);
    expect(reading.healed).toBeCloseTo(0.008, 10);
  });

  it("names the single most divisive act of the term", () => {
    const reading = polarizationReading(dividedTerm());
    expect(reading.heaviest?.description).toBe("The deportation order is signed.");
    expect(reading.heaviest?.turn).toBe(4);
  });

  it("names what division costs: how little the President's own identifiers move, and what the drift does to the headline", () => {
    const reading = polarizationReading(dividedTerm());
    expect(reading.ownIdentifierMovement.now).toBeCloseTo(valenceSlope(1, reading.value), 10);
    expect(reading.ownIdentifierMovement.atEra).toBeCloseTo(valenceSlope(1, ERA_POLARIZATION), 10);
    expect(reading.ownIdentifierMovement.now).toBeLessThan(reading.ownIdentifierMovement.atEra);
    expect(Number.isFinite(reading.headlineEffect)).toBe(true);
  });

  it("charges nothing to a country that sits at the era's level", () => {
    expect(polarizationReading(base).headlineEffect).toBeCloseTo(0, 6);
  });

  it("says nothing happened when a campaign has divided nobody", () => {
    const reading = polarizationReading(base);
    expect(reading.addedByUs).toBe(0);
    expect(reading.healed).toBe(0);
    expect(reading.heaviest).toBeUndefined();
    expect(reading.drift).toBeCloseTo(base.player.opinion.polarization - ERA_POLARIZATION, 10);
  });
});
