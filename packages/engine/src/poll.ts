// One weekly tracking poll. The error is seeded, so the same week reads the same band.
import { hashFraction } from "./rng.js";
import { selectApproval } from "./opinion.js";
import type { Campaign } from "./state.js";

/** Three points, the width of a national tracking sample. */
export const SAMPLE_MARGIN = 0.03;

export type TrackingPoll = {
  readonly reading: number;
  readonly low: number;
  readonly high: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Where a tracking poll would put approval this week, and the band around that reading. */
export function trackingPoll(campaign: Campaign): TrackingPoll {
  const noise = (hashFraction(`${String(campaign.seed)}:poll:${campaign.turn}`) - 0.5) * 2 * SAMPLE_MARGIN;
  const reading = clamp01(selectApproval(campaign) + noise);
  return {
    reading,
    low: clamp01(reading - SAMPLE_MARGIN),
    high: clamp01(reading + SAMPLE_MARGIN),
  };
}
