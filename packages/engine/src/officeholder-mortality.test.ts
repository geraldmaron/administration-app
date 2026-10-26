import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { campaignFoundingDate, compareDates } from "./clock.js";
import { createRngStreams } from "./rng.js";
import { JUDICIARY_SEAT_ROLE } from "./judiciary.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { deathDateIn, deathsThisWeek, lifeTableQx, occupiedOffices, officeholderDeathChance } from "./officeholder-mortality.js";
import type { Campaign } from "./state.js";

const founded = foundedForBalance("officeholder-mortality").campaign;

/** Members of Congress the draws kill in the two years of one Congress, with nobody replaced. */
function congressDeaths(campaign: Campaign): number {
  const streams = createRngStreams(campaign.seed);
  const year = campaignFoundingDate(campaign).year + 1;
  return (campaign.congress.members ?? []).filter((member) => {
    const age = campaign.people[member.person]!.base.age;
    return [0, 1].some((offset) => deathDateIn(streams, member.person, age + 1 + offset, year + offset) !== undefined);
  }).length;
}

describe("the life table", () => {
  it("reads the 2024 total-population qx and holds the oldest annual row past 99", () => {
    expect(lifeTableQx(18)).toBe(0.000583);
    expect(lifeTableQx(60)).toBe(0.008779);
    expect(lifeTableQx(85)).toBe(0.078467);
    expect(lifeTableQx(99)).toBe(0.311054);
    expect(lifeTableQx(104)).toBe(0.311054);
    expect(lifeTableQx(10)).toBe(0.000583);
    for (let age = 30; age < 99; age += 1) expect(lifeTableQx(age + 1)).toBeGreaterThan(lifeTableQx(age));
  });

  it("puts office-holders at the measured third of the population's rate", () => {
    expect(officeholderDeathChance(70)).toBeCloseTo(0.01811 * 0.35, 10);
  });
});

describe("who the mortality draw covers", () => {
  const holders = occupiedOffices(founded);
  const kinds = (kind: string) => holders.filter((holder) => holder.office.kind === kind).length;

  it("covers every occupied office once: Congress, the statehouses, the cabinet, the agencies and every foreign chair", () => {
    expect(kinds("congress")).toBe(535);
    expect(kinds("governor")).toBe(50);
    expect(kinds("cabinet")).toBe(Object.keys(founded.player.cabinet).length - 1);
    expect(kinds("foreign-leader")).toBe(Object.keys(founded.nations).length - 1);
    expect(kinds("agency")).toBe(40);
    expect(new Set(holders.map((holder) => holder.person)).size).toBe(holders.length);
  });

  it("draws the Vice President but never the President or a judge", () => {
    const people = new Set(holders.map((holder) => holder.person as string));
    expect(people.has(founded.player.cabinet[founded.founding.leadRole] as string)).toBe(false);
    // The Vice President is mortal so a death in that office empties the line of succession and forces a nomination.
    expect(people.has(founded.vicePresident as string)).toBe(true);
    const judges = Object.values(founded.people).filter((runtime) => runtime.currentRole === JUDICIARY_SEAT_ROLE);
    expect(judges.length).toBeGreaterThan(0);
    for (const judge of judges) expect(people.has(judge.base.id as string)).toBe(false);
  });

  it("covers nobody without an office", () => {
    const seated = new Set(holders.map((holder) => holder.person as string));
    const unseated = Object.values(founded.people).filter((runtime) => runtime.currentRole === undefined && !seated.has(runtime.base.id as string));
    expect(unseated.length).toBeGreaterThan(1000);
  });
});

describe("the draw", () => {
  it("is one keyed draw per person and year, landing on a day inside that year", () => {
    const streams = createRngStreams(founded.seed);
    const person = founded.congress.members![0]!.person;
    let found = 0;
    for (let year = 2030; year < 2330 && found < 3; year += 1) {
      const date = deathDateIn(streams, person, 95, year);
      expect(deathDateIn(createRngStreams(founded.seed), person, 95, year)).toEqual(date);
      if (!date) continue;
      found += 1;
      expect(date.year).toBe(year);
    }
    expect(found).toBe(3);
  });

  it("files each death in exactly one week", () => {
    const seen = new Map<string, number>();
    for (let week = 1; week <= 104; week += 1) {
      for (const death of deathsThisWeek(withWeeksElapsed(founded, week))) {
        expect(seen.has(death.holder.person as string)).toBe(false);
        seen.set(death.holder.person as string, week);
        const state = withWeeksElapsed(founded, week);
        expect(compareDates(death.date, state.calendar)).toBeLessThanOrEqual(0);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  // Wikipedia-listed deaths in office: 48 members of Congress
  // from 2000 to October 2026, 3.6 a Congress, and 5.5 a Congress at the
  // 2021-2026 rate; single Congresses ranged from none (108th) to eight (110th).
  it("kills a few members of Congress a Congress, inside the observed range, across twelve seeds", () => {
    const counts = Array.from({ length: 12 }, (_, index) => congressDeaths(foundedForBalance(`congress-mortality-${index}`).campaign));
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    expect(mean).toBeGreaterThanOrEqual(2.5);
    expect(mean).toBeLessThanOrEqual(6.5);
    expect(Math.max(...counts)).toBeLessThanOrEqual(14);
  }, 120_000);
});
