import { describe, expect, it } from "vitest";
import { COHORT_AXES, COHORT_IDS, STATE_IDS, cohortsOfAxis, type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import { atCampaignTurn, buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { cohortSupport, type CohortStrain } from "./demos.js";
import { recomputeApproval } from "./opinion.js";
import { stateApprovals } from "./regional-opinion.js";
import { routedReach } from "./route-cohorts.js";
import { createSave, loadSave } from "./save.js";
import {
  RAKE_TOLERANCE,
  SENSITIVITY_JITTER_SHARE,
  cohortSensitivity,
  stateCohortOpinion,
  stateCohortSupport,
  strainTilt,
} from "./state-cohort-opinion.js";
import { STATE_COHORT_SENSITIVITY } from "./state-cohort-sensitivity.js";
import { stateShareShifts } from "./states.js";
import type { Campaign } from "./state.js";
import type { StateEffect } from "./effects.js";

const logit = (p: number): number => Math.log(p / (1 - p));
const founded = (seed: string, party: "democrat" | "republican" = "democrat"): Campaign => foundedForBalance(seed, party).campaign;

/** Every judgment set to one level and the headline settled on it, so the groups and the states move together. */
function withMood(campaign: Campaign, level: number): Campaign {
  const { polarization } = campaign.player.opinion;
  const opinion = { security: level, prosperity: level, services: level, integrity: level, unity: level, competence: level, polarization };
  return recomputeApproval({ ...campaign, player: { ...campaign.player, opinion } });
}

function withStrain(campaign: Campaign, cohort: CohortId, strain: CohortStrain): Campaign {
  return { ...campaign, cohorts: { ...campaign.cohorts, [cohort]: [...(campaign.cohorts[cohort] ?? []), strain] } };
}

const FIXTURES: readonly (readonly [string, () => Campaign])[] = [
  ["founded, Democratic", () => founded("rake-a")],
  ["founded, Republican", () => founded("rake-b", "republican")],
  ["founded, a public souring on the administration", () => withMood(founded("rake-c"), 0.25)],
  ["founded, a public warming to it", () => withMood(founded("rake-d", "republican"), 0.75)],
  ["the shared fixture, week 40", () => atCampaignTurn(buildCampaign(), 40)],
];

/** The state margin and the national margin recomputed from the table itself, the way a reader would. */
function stateMiss(campaign: Campaign, axis: CohortAxisId): number {
  const cohorts = cohortsOfAxis(axis);
  const approvals = stateApprovals(campaign);
  let worst = 0;
  for (const state of STATE_IDS) {
    const runtime = campaign.states[state]!;
    const mix = runtime.base.character.cohorts[axis] as Record<string, number>;
    const total = cohorts.reduce((sum, cohort) => sum + mix[cohort]!, 0);
    const mean = cohorts.reduce((sum, cohort) => sum + mix[cohort]! * stateCohortSupport(campaign, state, cohort)!, 0) / total;
    worst = Math.max(worst, Math.abs(mean - approvals[state]!));
  }
  return worst;
}

describe("state by group support", () => {
  it.each(FIXTURES)("reproduces every state's approval and every group's national figure on %s", (_, build) => {
    const campaign = build();
    const table = stateCohortOpinion(campaign);
    for (const axis of COHORT_AXES) {
      const fit = table.axes[axis];
      expect(fit.residuals.state, `${axis} state residual`).toBeLessThan(RAKE_TOLERANCE);
      expect(fit.residuals.national, `${axis} national residual`).toBeLessThan(RAKE_TOLERANCE);
      expect(stateMiss(campaign, axis), `${axis} recomputed`).toBeLessThan(1e-6);
      // The groups' and the states' totals are read by different rules; the shared step that reconciles them stays small.
      expect(Math.abs(fit.reconciliation), `${axis} reconciliation`).toBeLessThan(0.25);
    }
  });

  it("keeps each group's people-weighted national mean on the engine's own figure, moved only by the axis's shared step", () => {
    const campaign = founded("rake-national");
    const table = stateCohortOpinion(campaign);
    for (const axis of COHORT_AXES) {
      const fit = table.axes[axis];
      for (const cohort of cohortsOfAxis(axis)) {
        let people = 0;
        let sum = 0;
        for (const state of STATE_IDS) {
          const runtime = campaign.states[state]!;
          const share = (runtime.base.character.cohorts[axis] as Record<string, number>)[cohort]!;
          people += runtime.population * share;
          sum += runtime.population * share * fit.support[state]![cohort]!;
        }
        const expected = 1 / (1 + Math.exp(-(logit(cohortSupport(campaign, cohort)) + fit.reconciliation)));
        expect(sum / people, cohort).toBeCloseTo(expected, 6);
      }
    }
  });

  it("moves a group with a larger sensitivity further toward a state that leans further toward the administration", () => {
    const campaign = founded("rake-direction");
    const shifts = stateShareShifts(campaign);
    const beta = cohortSensitivity(campaign);
    const context = (state: StateId) => logit(0.5 + shifts[state]!);
    const gap = (state: StateId) => logit(stateCohortSupport(campaign, state, "race-white")!) - logit(stateCohortSupport(campaign, state, "race-black")!);
    for (const [high, low] of [["WV", "CA"], ["WY", "VT"], ["TX", "NY"]] as const) {
      const expected = (beta["race-white"] - beta["race-black"]) * (context(high) - context(low));
      expect(gap(high) - gap(low), `${high} against ${low}`).toBeCloseTo(expected, 6);
    }
  });

  it("reads rural support well apart in West Virginia and California, in the direction the states lean", () => {
    for (const party of ["democrat", "republican"] as const) {
      const campaign = founded(`rake-rural-${party}`, party);
      const wv = stateCohortSupport(campaign, "WV", "rural")!;
      const ca = stateCohortSupport(campaign, "CA", "rural")!;
      expect(Math.abs(wv - ca)).toBeGreaterThan(0.15);
      expect(party === "republican" ? wv > ca : wv < ca).toBe(true);
    }
  });

  it("is the same table for the same seed and a different draw for a different seed", () => {
    const first = founded("rake-same");
    const again = founded("rake-same");
    expect(first.cohortSensitivity).toEqual(again.cohortSensitivity);
    expect(stateCohortOpinion(first).axes.race.support).toEqual(stateCohortOpinion(again).axes.race.support);
    const other = founded("rake-other");
    expect(other.cohortSensitivity).not.toEqual(first.cohortSensitivity);
  });

  it("draws each sensitivity within the estimate's own error", () => {
    const draws = ["j1", "j2", "j3", "j4", "j5", "j6", "j7", "j8"].map((seed) => founded(seed).cohortSensitivity!);
    for (const cohort of COHORT_IDS) {
      const { beta, se } = STATE_COHORT_SENSITIVITY[cohort];
      for (const draw of draws) expect(Math.abs(draw[cohort] - beta), cohort).toBeLessThan(5 * se * SENSITIVITY_JITTER_SHARE + 0.001);
    }
  });

  it("reads an older save, which has no draw, on the sourced estimates and still calibrates", () => {
    const { cohortSensitivity: _drop, ...older } = founded("rake-older");
    const campaign = older as Campaign;
    const beta = cohortSensitivity(campaign);
    for (const cohort of COHORT_IDS) expect(beta[cohort]).toBe(STATE_COHORT_SENSITIVITY[cohort].beta);
    expect(stateCohortOpinion(campaign).axes.place.residuals.state).toBeLessThan(RAKE_TOLERANCE);
  });

  it("keeps the draw across a save and a load", () => {
    const campaign = founded("rake-save");
    expect(loadSave(JSON.parse(JSON.stringify(createSave(campaign)))).cohortSensitivity).toEqual(campaign.cohortSensitivity);
  });

  it("depends on the sourced table: with every sensitivity at zero, a group sits the same distance from its state everywhere", () => {
    const sourced = founded("rake-perturb");
    const flat: Campaign = { ...sourced, cohortSensitivity: Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, 0])) as Record<CohortId, number> };
    const spread = (campaign: Campaign) => {
      const gaps = STATE_IDS.map((state) => logit(stateCohortSupport(campaign, state, "race-white")!) - logit(stateCohortSupport(campaign, state, "race-black")!));
      return Math.max(...gaps) - Math.min(...gaps);
    };
    expect(spread(flat)).toBeLessThan(1e-6);
    expect(spread(sourced)).toBeGreaterThan(0.3);
  });

  it("holds the sourced pattern: Black and Asian voters follow their state least, veterans less than non-veterans", () => {
    const beta = (cohort: CohortId) => STATE_COHORT_SENSITIVITY[cohort].beta;
    expect(beta("race-black")).toBeLessThan(beta("race-white") - 0.4);
    expect(beta("race-asian")).toBeLessThan(beta("race-white") - 0.4);
    expect(beta("veteran")).toBeLessThan(beta("non-veteran"));
    expect(beta("degree")).toBeGreaterThan(beta("no-degree"));
  });
});

describe("a remembered act's geography", () => {
  it("spreads a routed strain so the group's people-weighted mean intensity is one", () => {
    const campaign = founded("reach-mean");
    const routed: StateEffect[] = (["MI", "OH", "PA", "IN"] as const).map((state) => ({ kind: "state", state, deltas: { lean: 0.01 }, reason: "test" }));
    const where = routedReach(campaign, "goods-producing", routed)!;
    let people = 0;
    let weighted = 0;
    for (const state of STATE_IDS) {
      const runtime = campaign.states[state]!;
      const count = runtime.base.population * (runtime.base.character.cohorts.work as Record<string, number>)["goods-producing"]!;
      people += count;
      weighted += count * (where[state] ?? 0);
    }
    expect(weighted / people).toBeCloseTo(1, 1);
    expect(Object.keys(where).sort()).toEqual(["IN", "MI", "OH", "PA"]);
  });

  it("moves the group more in the states the act reached, and leaves its national figure where it was", () => {
    const base = founded("reach-move");
    const routed: StateEffect[] = (["MI", "OH"] as const).map((state) => ({ kind: "state", state, deltas: { lean: 0.01 }, reason: "test" }));
    const where = routedReach(base, "goods-producing", routed)!;
    const strain: CohortStrain = { createdTurn: base.turn, cause: "plant-closed", weight: 0.3, valence: -1, decayRate: 0.06, reason: "A plant closed.", where };
    const hit = withStrain(base, "goods-producing", strain);
    const plain = withStrain(base, "goods-producing", { ...strain, where: undefined });
    expect(strainTilt(hit.cohorts["goods-producing"], "MI")).toBeLessThan(0);
    expect(strainTilt(hit.cohorts["goods-producing"], "CA")).toBeGreaterThan(0);
    const drop = (campaign: Campaign, state: StateId) => stateCohortSupport(campaign, state, "goods-producing")! - stateCohortSupport(campaign, state, "professional-technical")!;
    expect(drop(hit, "MI")).toBeLessThan(drop(plain, "MI") - 0.02);
    expect(drop(hit, "CA")).toBeGreaterThan(drop(plain, "CA"));
    expect(cohortSupport(hit, "goods-producing")).toBe(cohortSupport(plain, "goods-producing"));
    expect(stateCohortOpinion(hit).axes.work.residuals.national).toBeLessThan(RAKE_TOLERANCE);
  });
});
