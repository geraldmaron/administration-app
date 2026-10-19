import { describe, expect, it } from "vitest";
import {
  advanceTurn,
  advanceUntilAttention,
  campaignTurnPhases,
  type AttentionMatter,
  type Campaign,
  type GameDate,
  type MatterSource,
} from "@admin/engine";
import { worldDataset } from "@admin/world";
import { ScenarioClass, ScenarioDef } from "./scenario.js";
import { sealedCampaign, underStrain, withFlags } from "./preview-board.js";
import { deskClosedFlag, deskOpen } from "./desk-window.js";
import { directorPicks, stagingWarranted } from "./scenario-director.js";
import { memoryPool, stageFromResidentPool } from "./corpus/pool.js";

/**
 * The loop's pacing, measured rather than assumed.
 *
 * `advanceUntilAttention` stops the moment any source raises a matter. The
 * shipped corpus is deep enough that some scenario is live essentially every
 * week, so a director that always says yes turns the attention loop back into
 * the weekly loop: every Continue buys exactly one tick, and the ceremony that
 * announces the span is announcing a fixed week again.
 *
 * What this probe holds is that a quiet board no longer clears the bar.
 */

/** A pool nothing gates, so what is measured is the pacing rule rather than the corpus. */
const POOL: readonly ScenarioDef[] = ScenarioClass.options.map((scenarioClass) =>
  ScenarioDef.parse({
    id: `pacing-${scenarioClass}`,
    class: scenarioClass,
    severity: "serious",
    dilemmaShape: "containment",
    subject: `The week the ${scenarioClass} question reached the desk`,
    cast: { pick: "none" },
    locus: { site: "capital", ground: "home", descriptor: "the room where these things are decided" },
    conditions: [],
    weight: 1,
    boosts: [],
    particulars: [{ label: "Reached the desk at", value: "09:00" }],
    opening: [
      {
        speaker: { kind: "narrator" },
        text: "Something has happened, the building has spent the morning arguing about it, and the argument has now arrived at this desk for an answer.",
      },
    ],
    replies: [
      {
        id: "hold",
        tone: "firm",
        text: "We hold the line on this, and we say so in public before anybody else describes it for us.",
        commitment: {
          kind: "position",
          cost: { standing: -0.01 },
          remembered: "{{leader}} held the line on this one in public, and made a point of doing it first.",
          rejoinder: {
            speaker: { kind: "narrator" },
            text: "The line held all week, and the two offices that had asked for it to move have not written again since.",
          },
        },
      },
      {
        id: "yield",
        tone: "conciliatory",
        text: "We give them this one, and we take the credit for the week staying quiet.",
        commitment: {
          kind: "position",
          cost: { standing: -0.01 },
          remembered: "{{leader}} gave way on this one, and took the credit for the week staying quiet.",
          rejoinder: {
            speaker: { kind: "cabinet", roleHint: "interior" },
            text: "The week did stay quiet, and the people who wanted it to have been telling everybody it was their doing.",
          },
        },
      },
    ],
  }),
);

const pool = memoryPool(POOL);
const charter = worldDataset.charters[0]!;
const phases = campaignTurnPhases(charter);

/** A fictional year, which is the span a pacing claim has to survive. */
const WEEKS_MEASURED = 52;

/**
 * The app's own scenario source, restated at the seam it is wired at.
 *
 * `packages/player-core/src/conversation/scripts.ts` holds the production
 * copy. It reaches the corpus baked into player-core, so this is the same
 * three lines over a pool a test can control. What is under test is the
 * classification, and that is shared.
 */
const scenarioSource: MatterSource<Campaign> = (campaign: Campaign, date: GameDate): readonly AttentionMatter[] => {
  if (!deskOpen(campaign)) return [];
  return stageFromResidentPool(campaign, pool).map((cast) => ({
    id: `scenario:${cast.def.id}`,
    source: "scenario" as const,
    urgency: stagingWarranted(campaign, cast.def.class) ? ("soft" as const) : ("ambient" as const),
    title: cast.script.subject,
    reason: "Waiting on your answer.",
    subject: `scenario:${cast.def.class}`,
    date,
  }));
};

describe("the scenario director as a source of presidential attention", () => {
  /** Weeks of a fictional year on which the board earned an interruption. */
  function stagedWeeks(start: Campaign, carrying: (campaign: Campaign) => Campaign = (campaign) => campaign): number {
    let campaign = carrying(start);
    let staged = 0;
    for (let week = 0; week < WEEKS_MEASURED; week += 1) {
      const picks = directorPicks(campaign, pool.selectors);
      // Something is always live: the probe pool gates on nothing, which is the
      // shipped corpus's own condition at three hundred scenarios.
      expect(picks.length).toBeGreaterThan(0);
      if (picks.some((pick) => stagingWarranted(campaign, pick.selector.class))) staged += 1;
      campaign = carrying(advanceTurn(campaign, phases));
    }
    return staged;
  }

  it("does not stage every week, so a quiet board is allowed to be quiet", () => {
    // The finding, in one number. Before the floor this was 52 of 52 on every
    // board, because the director had no representation of a quiet week.
    expect(stagedWeeks(sealedCampaign("pacing-rate"))).toBeLessThan(WEEKS_MEASURED);
    expect(stagedWeeks(sealedCampaign("pacing-runs"))).toBeLessThan(WEEKS_MEASURED);
  });

  const BOARDS = ["pacing-rate", "pacing-runs", "pacing-cap"];
  const quietWeeks = () => BOARDS.reduce((total, seed) => total + stagedWeeks(sealedCampaign(seed)), 0);
  // The strain is held every week rather than written once at the oath. The
  // country's order now settles back toward where its institutions hold it, so
  // a strain written once fades within a season and the year that follows is a
  // quiet one; what the director has to respect is a presidency that stays in
  // trouble, which is what holding it measures.
  const strainedWeeks = () => BOARDS.reduce((total, seed) => total + stagedWeeks(sealedCampaign(seed), underStrain), 0);

  it("still stages on a board that is actually carrying something", () => {
    // The other wall, and the one that stops the floor being raised until the
    // corpus reaches nobody.
    expect(strainedWeeks()).toBeGreaterThan(0);
  });

  // A presidency in trouble is asked more often than a comfortable one, which
  // is the reading `boardPressure` exists to carry; summed over three boards
  // because one board is too thin a margin. It reads 156 held under strain
  // against 18 quiet (52 and 7 on pacing-rate, 52 and 6 on pacing-runs, 52 and
  // 5 on pacing-cap).
  it("stages more on strained boards than on the same boards quiet", () => {
    expect(strainedWeeks()).toBeGreaterThan(quietWeeks());
  });

  // The single-board reading the property was first held to: 52 held under
  // strain against 7 quiet on pacing-rate.
  it("stages more on one strained board than on the same board quiet", () => {
    expect(stagedWeeks(sealedCampaign("pacing-rate"), underStrain)).toBeGreaterThan(stagedWeeks(sealedCampaign("pacing-rate")));
  });

  it("lets a president spend a fortnight or more without being interrupted", () => {
    let campaign = sealedCampaign("pacing-runs");
    const runs: number[] = [];
    let ticks = 0;
    let guard = 0;
    while (ticks < WEEKS_MEASURED && guard < WEEKS_MEASURED * 2) {
      guard += 1;
      const result = advanceUntilAttention(campaign, { phases, matterSources: [scenarioSource] });
      if (result.stopReason === "ended") break;
      runs.push(result.elapsedDays);
      campaign = result.campaign;
      ticks += result.turnsRun;
      // The president answers what they were stopped for, which is what closes
      // the desk for that tick. Without it the harness models a president who
      // never answers, and the next look re-raises the same decision at zero
      // days spent — a spin rather than a run.
      if (result.stopReason === "attention") {
        campaign = withFlags(campaign, { [deskClosedFlag(campaign.turn)]: true });
        campaign = advanceTurn(campaign, phases);
        ticks += 1;
      }
    }
    expect(runs.length).toBeGreaterThan(0);
    // A fortnight of world with nobody needing the President. A director that
    // always says yes cannot produce this figure: every run is seven days.
    expect(Math.max(...runs)).toBeGreaterThanOrEqual(14);
  });

  it("keeps the cap at three picks: the floor moved, not the ceiling", () => {
    const campaign = sealedCampaign("pacing-cap");
    expect(directorPicks(campaign, pool.selectors).length).toBeLessThanOrEqual(3);
  });
});
