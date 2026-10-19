import { TRUST_STANCE_CUTS, stanceForTrust, trustWord } from "@admin/player-core";

const EDGES = [-1, TRUST_STANCE_CUTS.caution, TRUST_STANCE_CUTS.neutral, TRUST_STANCE_CUTS.favorable, 1] as const;
const BANDS = EDGES.length - 1;

/**
 * Trust (-1 to 1) on an axis of four equal steps, one per band, so the band
 * labels sit evenly and a line sits inside the band it is in. The bands are
 * not equal in trust, so the axis stretches each one to a quarter.
 */
export function trustOnBandAxis(trust: number): number {
  const clamped = Math.max(-1, Math.min(1, trust));
  const band = Math.min(BANDS - 1, EDGES.findIndex((edge, i) => i < BANDS && clamped < EDGES[i + 1]!));
  const index = band < 0 ? BANDS - 1 : band;
  const low = EDGES[index]!;
  const high = EDGES[index + 1]!;
  return (index + (clamped - low) / (high - low)) / BANDS;
}

/** One tick in the middle of each band. */
export const TRUST_BAND_AXIS_TICKS: readonly number[] = Array.from({ length: BANDS }, (_, i) => (i + 0.5) / BANDS);

/** The band word for a position on the band axis. */
export function bandWordAt(position: number): string {
  const index = Math.max(0, Math.min(BANDS - 1, Math.floor(position * BANDS)));
  return trustWord(stanceForTrust((EDGES[index]! + EDGES[index + 1]!) / 2));
}
