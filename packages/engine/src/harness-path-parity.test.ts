import { describe, expect, it } from "vitest";
import { advanceUntilAttention, DEFAULT_HORIZON_DAYS } from "./advance.js";
import { foundedForBalance, playCampaign } from "./balance-harness.js";
import { DAYS_PER_TURN } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
import type { Campaign } from "./state.js";

// The harness measures what anyone plays only if it drives the loop the app
// drives. Its figures are read as the game's, so a harness that stepped the
// week its own way (skipping the day resolvers, or ticking before the calendar
// turned) would be calibrating a game nobody plays. An idle President is the
// case where the two paths can be compared state for state: the proxy does
// nothing, so everything that differs is the loop.

const IDLE_WEEKS = 26;
const SEED = "balance-0";

/** The first path at which two plain-data trees disagree, or undefined when they agree byte for byte. */
function firstDivergence(a: unknown, b: unknown, path = "$"): string | undefined {
  if (Object.is(a, b)) return undefined;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return `${path}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: an array against an object`;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const key of keys) {
    const found = firstDivergence((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
    if (found) return found;
  }
  return JSON.stringify(a) === JSON.stringify(b) ? undefined : `${path}: key order`;
}

function harnessWeeks(): readonly Campaign[] {
  const weeks: Campaign[] = [];
  playCampaign(SEED, "passive", IDLE_WEEKS, "democrat", {}, { observeWeek: (state) => weeks.push(state) });
  return weeks;
}

/** The app's Continue, pressed with the given horizon until the idle weeks are spent. */
function appPresses(horizonDays: number): ReadonlyMap<number, Campaign> {
  const { campaign, charter } = foundedForBalance(SEED);
  const phases = campaignTurnPhases(charter, true);
  const byWeek = new Map<number, Campaign>();
  let working = campaign;
  let daysLeft = IDLE_WEEKS * DAYS_PER_TURN;
  while (daysLeft > 0) {
    const result = advanceUntilAttention(working, { phases, horizonDays: Math.min(horizonDays, daysLeft) });
    expect(result.stopReason).toBe("horizon");
    working = result.campaign;
    daysLeft -= result.elapsedDays;
    byWeek.set(working.turn - campaign.turn, working);
  }
  return byWeek;
}

describe("the harness and the app drive one loop", () => {
  const harness = harnessWeeks();

  it("runs the idle weeks it was asked for", () => {
    expect(harness).toHaveLength(IDLE_WEEKS);
  });

  it("leaves an idle President, week by week, where a week-long Continue does", () => {
    const app = appPresses(DAYS_PER_TURN);
    for (let week = 1; week <= IDLE_WEEKS; week++) {
      expect(firstDivergence(harness[week - 1], app.get(week)), `week ${week}`).toBeUndefined();
    }
  });

  it("leaves an idle President where the app's own Continue does at every stop", () => {
    const app = appPresses(DEFAULT_HORIZON_DAYS);
    expect([...app.keys()].at(-1)).toBe(IDLE_WEEKS);
    for (const [week, state] of app) {
      expect(firstDivergence(harness[week - 1], state), `week ${week}`).toBeUndefined();
    }
  });
});
