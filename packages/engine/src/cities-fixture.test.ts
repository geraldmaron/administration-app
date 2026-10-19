import { describe, expect, it } from "vitest";
import type { CityId } from "@admin/world";
import { apply, type CityEffect, type EffectPacket } from "./effects.js";
import { commitReply, type ConversationScript, type ReplyOption } from "./conversations.js";
import { createRngStreams } from "./rng.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { selectCity } from "./cities.js";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import { shockPressure } from "./external-shocks.js";

/**
 * Acceptance path for the plant-holiday fixture numbers: A/B/C city
 * employment, holiday remaining, adminLean, treasury, and USA unemployment
 * must move through commitReply / apply. Not a content import — engine must
 * not depend on the content package.
 */

const PITTSBURGH = "CITY-USA-pittsburgh" as CityId;

const REPLIES: readonly {
  readonly id: string;
  readonly employment: number;
  readonly years: number;
  readonly lean: number;
  readonly treasury: number;
}[] = [
  { id: "approve-ten", employment: 4000, years: 10, lean: 0.05, treasury: -60 },
  { id: "approve-five", employment: 2800, years: 5, lean: 0.02, treasury: -35 },
  { id: "wage-subsidy", employment: 1200, years: 0, lean: 0.04, treasury: -48 },
];

function optionFor(row: (typeof REPLIES)[number]): ReplyOption {
  const city: CityEffect = {
    kind: "city",
    city: PITTSBURGH,
    deltas: { employment: row.employment, adminLean: row.lean },
    set: { taxHolidayTurns: row.years * TURNS_PER_YEAR },
    reason: `${row.id} keeps the plant`,
  };
  return {
    id: row.id,
    tone: "firm",
    text: "Give them the holiday they asked for.",
    commitment: {
      kind: "position",
      cost: { treasury: row.treasury },
      remembered: "The holiday was signed and the plants were promised.",
      resolved: [city],
    },
  };
}

function script(options: readonly ReplyOption[]): ConversationScript {
  return {
    id: "plant-holiday-pittsburgh",
    counterpart: nationA.id,
    subject: "Four plants waiting on Pittsburgh",
    opening: [{ speaker: { kind: "narrator" }, text: "Four companies want the holiday." }],
    options: [...options],
    scenarioClass: "economy",
  };
}

describe("plant-holiday city apply", () => {
  it("moves Pittsburgh employment, holiday, lean, treasury, and unemployment on A/B/C", () => {
    const campaign = buildCampaign();
    const opening = selectCity(campaign, PITTSBURGH)!;
    const openingJobs = opening.employment;
    const openingLean = opening.adminLean ?? 0;
    const openingHoliday = opening.taxHolidayTurns;
    const openingTreasury = campaign.player.metrics.treasury;
    const streams = createRngStreams(campaign.seed);
    const jobs: number[] = [];
    const holidays: number[] = [];
    const leans: number[] = [];

    for (const row of REPLIES) {
      const reply = optionFor(row);
      const result = commitReply(campaign, script([reply]), reply, streams);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const next = apply(campaign, result.packet);
      const city = selectCity(next, PITTSBURGH)!;
      jobs.push(city.employment);
      holidays.push(city.taxHolidayTurns);
      leans.push(city.adminLean ?? 0);
      expect(next.player.metrics.treasury).toBe(openingTreasury + row.treasury);
      if (row.id === "approve-ten") {
        expect(city.employment).not.toBe(openingJobs);
        expect(city.employment).toBe(openingJobs + 4000);
        expect(shockPressure(next, campaign.founding.nation).unemployment).toBeLessThan(0);
      }
    }

    expect(new Set(jobs).size).toBe(3);
    expect(holidays).toEqual([10 * TURNS_PER_YEAR, 5 * TURNS_PER_YEAR, 0]);
    expect(new Set(leans.map((lean) => lean.toFixed(3))).size).toBe(3);
    expect(leans[0]).not.toBe(openingLean);
    expect(holidays[0]).not.toBe(openingHoliday);
  });

  it("does not treat a metric-only packet as a city move", () => {
    const campaign = buildCampaign();
    const opening = selectCity(campaign, PITTSBURGH)!;
    const packet: EffectPacket = {
      source: "conversation",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "Nothing landed in the yards." },
      effects: [{ kind: "metric", deltas: { stability: 0.01 } }],
    };
    const next = apply(campaign, packet);
    const city = selectCity(next, PITTSBURGH)!;
    expect(city.employment).toBe(opening.employment);
    expect(city.taxHolidayTurns).toBe(opening.taxHolidayTurns);
    expect(city.adminLean).toBe(opening.adminLean);
  });
});
