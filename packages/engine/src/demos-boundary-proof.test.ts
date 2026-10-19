import { describe, expect, it } from "vitest";
import { COHORT_AXES, COHORT_IDS, cohortsOfAxis } from "@admin/world";
import { OPINION_DRIVERS, OPINION_WEIGHTS, salientWeights, selectApproval, selectOpinionReading } from "./opinion.js";
import { apply, type Effect } from "./effects.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { applyCohort, cohortLens, cohortWeights, nationalCohortShares, type CohortEffect, type CohortStrain } from "./demos.js";
import type { Campaign } from "./state.js";

// The boundary proof suite is THE UNSKIPPABLE GATE for cohorts. Every other
// cohort piece can be individually wrong and only misprice a cohort; this suite
// is what stands between a cohort bug and the one number every other surface
// in the game quotes as the country's judgment of the president. It is deliberately exhaustive rather
// than illustrative: a single passing example proves nothing about the next
// sequence a player's save will actually produce.

// A small deterministic PRNG (mulberry32) rather than Math.random(): the
// engine is replay-sensitive, and a proof suite that cannot reproduce its own
// counterexample on a re-run is not a proof.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]!;
}

function randomStrain(rng: () => number, turn: number): CohortStrain {
  return {
    createdTurn: turn,
    cause: `cause-${Math.floor(rng() * 1000)}`,
    weight: rng(),
    valence: rng() > 0.5 ? 1 : -1,
    decayRate: 0.02 + rng() * 0.1,
    reason: "a randomized boundary-proof strain",
  };
}

/** One arbitrary CohortEffect — either an append or a full replacement. */
function randomCohortEffect(rng: () => number, turn: number): CohortEffect {
  const cohort = pick(rng, COHORT_IDS);
  if (rng() > 0.5) {
    return { kind: "cohort", cohort, addStrain: randomStrain(rng, turn), reason: "boundary-proof append" };
  }
  const count = 1 + Math.floor(rng() * 6);
  const replaceStrains = Array.from({ length: count }, () => randomStrain(rng, turn));
  return { kind: "cohort", cohort, replaceStrains, reason: "boundary-proof replace" };
}

function packetFor(effect: CohortEffect, turn: number): Parameters<typeof apply>[1] {
  return {
    source: "action",
    actor: "player",
    turn,
    narration: { summary: "a randomized cohort effect" },
    effects: [effect as Effect],
  };
}

const SEEDS = [1, 2, 3, 7, 11, 99];
const LENGTHS = [1, 5, 20, 60];

describe("boundary law 1 — applyCohort touches campaign.cohorts and nothing else", () => {
  it("changes only the effect's own cohort's strains, leaving every other field of Campaign untouched", () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      let state = buildCampaign();
      for (let i = 0; i < 40; i++) {
        const effect = randomCohortEffect(rng, state.turn);
        const next = applyCohort(state, effect);
        const { cohorts: nextCohorts, ...nextRest } = next;
        const { cohorts: prevCohorts, ...prevRest } = state;
        // Every non-cohorts field is byte-identical: applyCohort is a pure
        // spread over one key. Anything else moving is a boundary-law-1 defect.
        expect(nextRest).toEqual(prevRest);
        // Every cohort other than the one this effect names is untouched.
        for (const id of COHORT_IDS) {
          if (id === effect.cohort) continue;
          expect(nextCohorts[id]).toBe(prevCohorts[id]);
        }
        state = next;
      }
    }
  });

  it("no sequence of cohort effects, of any length, moves selectApproval by any amount", () => {
    for (const seed of SEEDS) {
      for (const length of LENGTHS) {
        const rng = mulberry32(seed * 1000 + length);
        let state: Campaign = buildCampaign();
        const openingApproval = selectApproval(state);
        for (let i = 0; i < length; i++) {
          const effect = randomCohortEffect(rng, state.turn);
          state = apply(state, packetFor(effect, state.turn));
          // Exact equality, not a tolerance: cohorts have no channel to
          // PublicMood or metrics.approval, so any drift at all is a defect,
          // not noise to be bounded away.
          expect(selectApproval(state)).toBe(openingApproval);
        }
      }
    }
  });

  it("no sequence of cohort effects, of any length, moves selectOpinionReading by any amount", () => {
    for (const seed of SEEDS) {
      for (const length of LENGTHS) {
        const rng = mulberry32(seed * 2000 + length);
        let state: Campaign = buildCampaign();
        const openingReading = selectOpinionReading(state);
        for (let i = 0; i < length; i++) {
          const effect = randomCohortEffect(rng, state.turn);
          state = apply(state, packetFor(effect, state.turn));
          expect(selectOpinionReading(state)).toEqual(openingReading);
        }
      }
    }
  });

  it("no sequence of cohort effects moves player.metrics or player.opinion by any amount", () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed * 3000);
      let state: Campaign = buildCampaign();
      const openingMetrics = state.player.metrics;
      const openingOpinion = state.player.opinion;
      for (let i = 0; i < 50; i++) {
        const effect = randomCohortEffect(rng, state.turn);
        state = apply(state, packetFor(effect, state.turn));
        expect(state.player.metrics).toEqual(openingMetrics);
        expect(state.player.opinion).toEqual(openingOpinion);
      }
    }
  });

  it("holds under a single very long sequence, not merely under short ones", () => {
    const rng = mulberry32(424242);
    let state: Campaign = buildCampaign();
    const openingApproval = selectApproval(state);
    for (let i = 0; i < 400; i++) {
      const effect = randomCohortEffect(rng, state.turn);
      state = apply(state, packetFor(effect, state.turn));
    }
    expect(selectApproval(state)).toBe(openingApproval);
    expect(selectOpinionReading(state)).toEqual(selectOpinionReading(buildCampaign()));
  });
});

// The `recomputeMandate` / `player.metrics.mandate` once named as an
// acceptance target no longer exists in the tree: `mandate` was retired in
// favor of `approval` as the sole headline (see the doc comment at the top of
// packages/engine/src/metrics.ts). `selectApproval` / `recomputeApproval` are
// that headline's current name, and are exercised above and below in its
// place — there is no `mandate` field left for a cohort effect to move.

describe("boundary law 3 — the axis aggregation identity (cohort-lens-centered)", () => {
  it("holds to <= LENS_CENTERING_TOLERANCE at base weights, on every axis and every driver", () => {
    const campaign = buildCampaign();
    const shares = nationalCohortShares(campaign);
    for (const axis of COHORT_AXES) {
      const cells = cohortsOfAxis(axis);
      const aggregate = {} as Record<(typeof OPINION_DRIVERS)[number], number>;
      for (const driver of OPINION_DRIVERS) aggregate[driver] = 0;
      for (const cohort of cells) {
        const lens = cohortLens(cohort);
        for (const driver of OPINION_DRIVERS) {
          aggregate[driver] += shares[cohort] * lens[driver];
        }
      }
      for (const driver of OPINION_DRIVERS) {
        expect(Math.abs(aggregate[driver] - OPINION_WEIGHTS[driver])).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it("holds to <= 0.02 under an arbitrary live salience combination", () => {
    // Push every salience multiplier live at once — war, an active condition,
    // economic pain, disorder and a standing scandal — the worst case the
    // nonlinear renormalization has to survive.
    const base = buildCampaign();
    const campaign: Campaign = {
      ...base,
      player: { ...base.player, flags: { ...base.player.flags, "scandal:boundary-proof": true } },
      nations: {
        ...base.nations,
        [base.founding.nation]: {
          ...base.nations[base.founding.nation]!,
          stats: {
            ...base.nations[base.founding.nation]!.stats,
            economy: { ...base.nations[base.founding.nation]!.stats.economy, unemployment: 0.15, inflation: 0.12 },
            security: { ...base.nations[base.founding.nation]!.stats.security, insurgencyPressure: 0.4 },
            politics: { ...base.nations[base.founding.nation]!.stats.politics, protestPressure: 0.6 },
          },
        },
      },
    };
    const shares = nationalCohortShares(campaign);
    const salient = salientWeights(campaign);
    // Confirm this fixture actually shifted salience away from base weights —
    // otherwise the test would pass by accident rather than by exercising the
    // nonlinear renormalization it claims to.
    expect(salient).not.toEqual(OPINION_WEIGHTS);
    for (const axis of COHORT_AXES) {
      const cells = cohortsOfAxis(axis);
      const aggregate = {} as Record<(typeof OPINION_DRIVERS)[number], number>;
      for (const driver of OPINION_DRIVERS) aggregate[driver] = 0;
      for (const cohort of cells) {
        const weights = cohortWeights(campaign, cohort);
        for (const driver of OPINION_DRIVERS) {
          aggregate[driver] += shares[cohort] * weights[driver];
        }
      }
      for (const driver of OPINION_DRIVERS) {
        expect(Math.abs(aggregate[driver] - salient[driver])).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it("holds to <= 0.02 across many randomized salience-bearing campaigns", () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed * 5000);
      const base = buildCampaign();
      const nation = base.nations[base.founding.nation]!;
      const campaign: Campaign = {
        ...base,
        player: {
          ...base.player,
          flags: { ...base.player.flags, "scandal:random": rng() > 0.5 },
        },
        nations: {
          ...base.nations,
          [base.founding.nation]: {
            ...nation,
            stats: {
              ...nation.stats,
              economy: { ...nation.stats.economy, unemployment: rng() * 0.2, inflation: rng() * 0.15 },
              security: { ...nation.stats.security, insurgencyPressure: rng() * 0.5 },
              politics: { ...nation.stats.politics, protestPressure: rng() * 0.7 },
            },
          },
        },
      };
      const shares = nationalCohortShares(campaign);
      const salient = salientWeights(campaign);
      for (const axis of COHORT_AXES) {
        const cells = cohortsOfAxis(axis);
        const aggregate = {} as Record<(typeof OPINION_DRIVERS)[number], number>;
        for (const driver of OPINION_DRIVERS) aggregate[driver] = 0;
        for (const cohort of cells) {
          const weights = cohortWeights(campaign, cohort);
          for (const driver of OPINION_DRIVERS) {
            aggregate[driver] += shares[cohort] * weights[driver];
          }
        }
        for (const driver of OPINION_DRIVERS) {
          expect(Math.abs(aggregate[driver] - salient[driver])).toBeLessThanOrEqual(0.02);
        }
      }
    }
  });
});
