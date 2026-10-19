import { describe, expect, it } from "vitest";
import { worldCities } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { cityMayorSeat } from "./municipal-offices.js";
import { apply } from "./effects.js";
import { createSave, loadSave } from "./save.js";

const { campaign } = foundedForBalance("municipal-continuity");

describe("named municipal officeholders", () => {
  it("draws a distinct stable identity for every US economic city without changing the campaign", () => {
    const before = JSON.stringify(campaign);
    const seats = worldCities.filter((city) => city.nation === "USA").map((city) => cityMayorSeat(campaign, city.id)!);
    expect(seats).toHaveLength(200);
    expect(seats.every((seat) => seat.person.alive && seat.person.municipalCity)).toBe(true);
    expect(new Set(seats.map((seat) => seat.person.base.id)).size).toBe(200);
    expect(JSON.stringify(campaign)).toBe(before);
    const first = seats[0]!;
    expect(cityMayorSeat(campaign, first.person.municipalCity!)).toEqual(first);
  });

  it("materializes through the existing person effect once and survives save/reload", () => {
    const city = worldCities.find((entry) => entry.nation === "USA")!;
    const seat = cityMayorSeat(campaign, city.id)!;
    const after = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn,
      narration: { summary: "The municipal officeholder was identified." }, effects: seat.effects });
    expect(after.player.metrics).toEqual(campaign.player.metrics);
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(after))));
    expect(cityMayorSeat(restored, city.id)).toEqual({ person: seat.person, effects: [] });
    const dead = { ...restored, people: { ...restored.people, [seat.person.base.id]: { ...seat.person, alive: false } } };
    expect(cityMayorSeat(dead, city.id)).toBeUndefined();
  });
});
