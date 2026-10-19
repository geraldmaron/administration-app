import { describe, expect, it } from "vitest";
import type { CityId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import {
  CITY_LEAN_DRIFT,
  cityPhase,
  openingAdminLean,
  selectCity,
  selectUsCityVoteDriver,
} from "./cities.js";
import { apply, type CityEffect, type EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
import { shockPressure } from "./external-shocks.js";

const PITTSBURGH = "CITY-USA-pittsburgh" as CityId;
const HAMBURG = "CITY-DEU-hamburg" as CityId;

function cityPacket(effect: CityEffect, summary = "The city moves."): EffectPacket {
  return { source: "action", actor: "player", turn: 1, narration: { summary }, effects: [effect] };
}

function applyCity(state: Campaign, effect: Omit<CityEffect, "kind" | "reason">, reason = "the plant stays"): Campaign {
  return apply(state, cityPacket({ kind: "city", reason, ...effect }));
}

describe("apply city", () => {
  it("moves employment, lean, and remaining tax holiday", () => {
    const state = buildCampaign();
    const opening = selectCity(state, PITTSBURGH)!;
    const next = applyCity(state, {
      city: PITTSBURGH,
      deltas: { employment: 4000, adminLean: 0.05 },
      set: { taxHolidayTurns: 520 },
    });
    const city = selectCity(next, PITTSBURGH)!;
    expect(city.employment).toBe(opening.employment + 4000);
    expect(city.adminLean).toBeCloseTo((opening.adminLean ?? 0) + 0.05, 3);
    expect(city.taxHolidayTurns).toBe(520);
    expect(city.lastMovedTurn).toBe(state.turn);
    expect(city.lastMovedReason).toBe("the plant stays");
    expect(city.base).toEqual(opening.base);
    expect(city.taxBase).toBe(opening.taxBase);
  });

  it("moves taxBase and demShare on a US city", () => {
    const state = buildCampaign();
    const opening = selectCity(state, PITTSBURGH)!;
    const next = applyCity(state, { city: PITTSBURGH, deltas: { taxBase: 12, demShare: 0.02 } });
    const city = selectCity(next, PITTSBURGH)!;
    expect(city.taxBase).toBe(opening.taxBase + 12);
    expect(city.demShare).toBeCloseTo((opening.demShare ?? opening.base.demShare ?? 0) + 0.02, 3);
    expect(city.base.state).toBe("PA");
  });

  it("clamps employment, lean, and holiday remaining", () => {
    const state = buildCampaign();
    const floor = applyCity(state, {
      city: PITTSBURGH,
      deltas: { employment: -1_000_000_000, adminLean: -10 },
      set: { taxHolidayTurns: -4 },
    });
    const pitt = selectCity(floor, PITTSBURGH)!;
    expect(pitt.employment).toBe(0);
    expect(pitt.adminLean).toBe(-1);
    expect(pitt.taxHolidayTurns).toBe(0);

    const ceiling = applyCity(state, { city: PITTSBURGH, deltas: { adminLean: 10 } });
    expect(selectCity(ceiling, PITTSBURGH)!.adminLean).toBe(1);
  });

  it("throws on a city the campaign does not have", () => {
    const state = buildCampaign();
    expect(() => applyCity(state, { city: "CITY-NOWHERE" as CityId, deltas: { employment: 1 } })).toThrow(/no city/);
  });

  it("ignores an adminLean delta on a foreign city", () => {
    const state = buildCampaign();
    expect(selectCity(state, HAMBURG)?.adminLean).toBeUndefined();
    const next = applyCity(state, { city: HAMBURG, deltas: { adminLean: 0.4 } });
    expect(selectCity(next, HAMBURG)?.adminLean).toBeUndefined();
    expect("adminLean" in (selectCity(next, HAMBURG) ?? {})).toBe(false);
  });

  it("dates new jobs as a fall in where national unemployment is headed, without touching player metrics", () => {
    const state = buildCampaign();
    const next = applyCity(state, { city: PITTSBURGH, deltas: { employment: 4000 } });
    const shift = shockPressure(next, state.founding.nation).unemployment;
    expect(shift).toBeLessThan(0);
    expect(-shift).toBeLessThan(0.01);
    expect(next.nations[state.founding.nation]!.stats.economy.unemployment).toBe(state.nations[state.founding.nation]!.stats.economy.unemployment);
    expect(next.player.metrics).toEqual(state.player.metrics);
  });
});

describe("cityPhase", () => {
  it("emits nothing on an unmoved opening table", () => {
    expect(cityPhase(buildCampaign())).toEqual([]);
    expect(selectUsCityVoteDriver(buildCampaign())).toBe(0);
  });

  it("mean-reverts US lean toward opening", () => {
    const state = buildCampaign();
    const opening = selectCity(state, PITTSBURGH)!.adminLean!;
    const shocked = applyCity(state, { city: PITTSBURGH, deltas: { adminLean: 0.05 } });
    const afterShock = selectCity(shocked, PITTSBURGH)!.adminLean!;
    const drifted = cityPhase(shocked).reduce((acc, packet) => apply(acc, packet), shocked);
    const afterDrift = selectCity(drifted, PITTSBURGH)!.adminLean!;
    expect(Math.abs(afterDrift - opening)).toBeLessThan(Math.abs(afterShock - opening));
    expect(afterShock - afterDrift).toBeCloseTo(CITY_LEAN_DRIFT, 3);
  });

  it("counts a tax holiday down through apply of its packets", () => {
    const state = applyCity(buildCampaign(), { city: PITTSBURGH, set: { taxHolidayTurns: 3 } });
    expect(selectCity(state, PITTSBURGH)!.taxHolidayTurns).toBe(3);
    const week = cityPhase(state).reduce((acc, packet) => apply(acc, packet), state);
    expect(selectCity(week, PITTSBURGH)!.taxHolidayTurns).toBe(2);
    expect(cityPhase(state).some((packet) => packet.narration.summary.includes("Pittsburgh"))).toBe(true);
    expect(cityPhase(state).every((packet) => packet.source === "simulate" && packet.actor === "world")).toBe(true);

    let running = week;
    running = cityPhase(running).reduce((acc, packet) => apply(acc, packet), running);
    running = cityPhase(running).reduce((acc, packet) => apply(acc, packet), running);
    expect(selectCity(running, PITTSBURGH)!.taxHolidayTurns).toBe(0);
    expect(cityPhase(running).some((packet) => packet.effects.some((effect) => effect.kind === "city" && effect.set))).toBe(
      false,
    );
  });
});

describe("opening lean", () => {
  it("signs demShare toward the sealed administration ticket", () => {
    const pitt = selectCity(buildCampaign(), PITTSBURGH)!;
    expect(openingAdminLean(pitt.base, "democrat")).toBeCloseTo(2 * (pitt.base.demShare ?? 0) - 1, 3);
    expect(openingAdminLean(pitt.base, "republican")).toBeCloseTo(1 - 2 * (pitt.base.demShare ?? 0), 3);
    expect(pitt.adminLean).toBe(openingAdminLean(pitt.base, "democrat"));
  });
});
