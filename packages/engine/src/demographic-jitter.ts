import { COHORT_AXES, COHORT_IDS, cohortsOfAxis, type CohortAxisId, type CohortId, type StateCohortMix } from "@admin/world";
import type { RngStream, RngStreams } from "./rng.js";

/**
 * The opening mix of each state is approximate: a stable set of hand-rounded and
 * Census-based shares. Every campaign samples around it, so no two games open on
 * exactly the same country. The sample has two parts, because real error is
 * shared: a national factor per cell (a source that runs a point high runs high
 * everywhere) and a smaller state factor on top. Each is a relative change, so a
 * small cell moves by a small amount, and each axis is renormalized to sum to
 * one, which is what keeps every axis a partition of the people.
 *
 * Standard deviations are relative (0.05 is five percent of the share itself) and
 * chosen by how well the source pins the axis down: sex ratios barely move, the
 * approximate nativity and disability columns move the most.
 */
export const JITTER_SPREAD: Readonly<Record<CohortAxisId, { readonly national: number; readonly state: number }>> = {
  age: { national: 0.02, state: 0.03 },
  class: { national: 0.03, state: 0.04 },
  schooling: { national: 0.02, state: 0.03 },
  place: { national: 0.02, state: 0.03 },
  work: { national: 0.03, state: 0.04 },
  race: { national: 0.04, state: 0.06 },
  sex: { national: 0.003, state: 0.005 },
  nativity: { national: 0.07, state: 0.09 },
  disability: { national: 0.06, state: 0.08 },
  veteran: { national: 0.06, state: 0.08 },
};

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

/** A standard normal draw from two uniform draws. */
function gaussian(stream: RngStream): number {
  const u = Math.max(stream.next(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * stream.next());
}

/** The campaign's national factor per cell, in cohort declaration order. */
export function nationalDemographicFactors(streams: RngStreams): Readonly<Record<CohortId, number>> {
  const stream = streams.stream("founding", "demographics", "national");
  const factors = {} as Record<CohortId, number>;
  for (const cohort of COHORT_IDS) {
    const axis = COHORT_AXES.find((a) => cohortsOfAxis(a).includes(cohort))!;
    factors[cohort] = gaussian(stream) * JITTER_SPREAD[axis].national;
  }
  return factors;
}

/** One state's mix, sampled around its authored values. Pure given the stream and national factors. */
export function jitterCohortMix(mix: StateCohortMix, national: Readonly<Record<CohortId, number>>, stream: RngStream): StateCohortMix {
  const out: Record<string, Record<string, number>> = {};
  for (const axis of COHORT_AXES) {
    const shares = mix[axis] as Readonly<Record<string, number>>;
    const sampled = cohortsOfAxis(axis).map((cohort) => {
      const factor = Math.exp(national[cohort] + gaussian(stream) * JITTER_SPREAD[axis].state);
      return [cohort, (shares[cohort] ?? 0) * factor] as const;
    });
    const total = sampled.reduce((sum, [, value]) => sum + value, 0);
    const normalized = sampled.map(([cohort, value]) => [cohort, round4(value / total)] as const);
    // Rounding can leave the axis a hair off one; put the remainder on the largest cell.
    const drift = round4(1 - normalized.reduce((sum, [, value]) => sum + value, 0));
    const largest = normalized.reduce((best, entry, i) => (entry[1] > normalized[best]![1] ? i : best), 0);
    out[axis] = Object.fromEntries(normalized.map(([cohort, value], i) => [cohort, i === largest ? round4(value + drift) : value]));
  }
  return out as unknown as StateCohortMix;
}
