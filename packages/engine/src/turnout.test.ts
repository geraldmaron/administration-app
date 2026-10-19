import { describe, expect, it } from "vitest";
import { COHORT_IDS, type CohortId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { TURNOUT_CEILING, TURNOUT_FLOOR, type CohortStrain } from "./demos.js";
import { BLOC_TURNOUT_CAP } from "./electorate.js";
import { projectVote } from "./elections.js";
import { MOMENTUM_CAP, momentumShift } from "./momentum.js";
import { selectBlocTurnout, selectCohortTurnout, turnoutShift } from "./turnout.js";
import type { Campaign } from "./state.js";

const { campaign: founded } = foundedForBalance("turnout-channel", "democrat");

function harm(turn: number, weight = 1): CohortStrain {
  return { createdTurn: turn, cause: "plant-closed", weight, valence: -1, decayRate: 0.06, reason: "The plant closed." };
}

function withStrain(campaign: Campaign, cohort: CohortId, strains: readonly CohortStrain[]): Campaign {
  return { ...campaign, cohorts: { ...campaign.cohorts, [cohort]: strains } };
}

describe("who shows up", () => {
  it("keeps every cell between the floor and the ceiling, whatever it remembers", () => {
    const battered = COHORT_IDS.reduce(
      (campaign, cohort, index) => withStrain(campaign, cohort, index % 2 === 0 ? Array.from({ length: 6 }, (_, turn) => harm(turn)) : []),
      founded,
    );
    for (const row of selectCohortTurnout(battered)) {
      expect(row.turnout).toBeGreaterThanOrEqual(TURNOUT_FLOOR);
      expect(row.turnout).toBeLessThanOrEqual(TURNOUT_CEILING);
    }
  });

  it("holds every bloc's displacement inside the cap however many overlapping groups are hurt", () => {
    const battered = COHORT_IDS.reduce((campaign, cohort) => withStrain(campaign, cohort, [harm(0), harm(1)]), founded);
    for (const row of selectBlocTurnout(battered)) expect(Math.abs(row.shift), row.bloc).toBeLessThanOrEqual(BLOC_TURNOUT_CAP + 1e-12);
  });

  it("is exactly zero while the administration has hurt nobody", () => {
    for (const row of selectBlocTurnout(founded)) expect(row.shift, row.bloc).toBe(0);
    expect(turnoutShift(founded)).toBe(0);
  });

  it("keeps the administration's own blocs home when its people are hurt, and brings the other side's out", () => {
    // Black voters are overwhelmingly Democratic identifiers and leaners, so
    // hurting them under a Democratic President costs that President's own blocs.
    const hurt = withStrain(founded, "race-black", [harm(founded.turn), harm(founded.turn)]);
    const shift = Object.fromEntries(selectBlocTurnout(hurt).map((row) => [row.bloc, row.shift]));
    expect(shift.ownId).toBeLessThan(0);
    expect(shift.oppId).toBeGreaterThan(0);
    expect(turnoutShift(hurt)).toBeLessThan(0);
  });

  it("reaches the count only through its one driver", () => {
    const strained = withStrain(founded, "race-black", [harm(founded.turn), harm(founded.turn)]);
    const driver = projectVote(strained).drivers.find((entry) => entry.reason === "who is going to turn out");
    expect(driver?.delta).toBe(turnoutShift(strained));
  });
});

describe("which way the country has been moving", () => {
  it("is nothing on a flat record and bounded on a collapse", () => {
    const flat: Campaign = {
      ...founded,
      player: { ...founded.player, metricHistory: founded.player.metricHistory.map(() => founded.player.metrics) },
    };
    expect(momentumShift(flat)).toBe(0);
    const collapsing: Campaign = {
      ...flat,
      player: { ...flat.player, metrics: { ...flat.player.metrics, approval: flat.player.metrics.approval - 0.3 } },
    };
    expect(momentumShift(collapsing)).toBe(-MOMENTUM_CAP);
  });

  it("fades as the weeks catch up with a shock nobody answered", () => {
    const shocked = { ...founded.player.metrics, approval: founded.player.metrics.approval - 0.06 };
    const fresh: Campaign = { ...founded, player: { ...founded.player, metrics: shocked, metricHistory: founded.player.metricHistory.map(() => founded.player.metrics) } };
    const settled: Campaign = {
      ...fresh,
      player: { ...fresh.player, metricHistory: [...fresh.player.metricHistory, ...Array.from({ length: 12 }, () => shocked)].slice(-24) },
    };
    expect(Math.abs(momentumShift(settled))).toBeLessThan(Math.abs(momentumShift(fresh)));
  });
});
