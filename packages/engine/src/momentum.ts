import type { Campaign } from "./state.js";

// Which way the country has been moving lately.
//
// A record is four years long and a campaign's last month is not. Approval
// already carries where the country stands; what it does not carry is the
// direction, and a President climbing out of a bad summer is not in the same
// race as one sliding into a bad autumn at the same reading. The trend is read
// as how far this week's approval sits from a slowly weighted memory of the
// weeks before it, so a shock swings the count while it is fresh and fades as
// the memory catches up, whether or not anything is done about it.
//
// Bounded tightly, because the material record is the point of the game and a
// late swing must be frightening rather than decisive.

/** How fast the memory of past weeks fades: each older week counts this much less. */
export const MOMENTUM_DECAY = 0.85;
/** How much of the trend reaches the count. Planning value. */
export const MOMENTUM_LEVERAGE = 0.5;
/** The most the trend can move the share, either way. Two points. */
export const MOMENTUM_CAP = 0.02;

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/** A decaying average of the closed weeks' approval, newest weighted most. */
function rememberedApproval(history: readonly number[]): number | undefined {
  if (history.length === 0) return undefined;
  let weight = 1;
  let mass = 0;
  let sum = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    sum += history[index]! * weight;
    mass += weight;
    weight *= MOMENTUM_DECAY;
  }
  return sum / mass;
}

/** How far recent weeks have swung the count, in share of the vote. Zero with no history. */
export function momentumShift(campaign: Campaign): number {
  const history = campaign.player.metricHistory.map((set) => set.approval);
  const remembered = rememberedApproval(history);
  if (remembered === undefined) return 0;
  const trend = (campaign.player.metrics.approval - remembered) * MOMENTUM_LEVERAGE;
  return round3(Math.max(-MOMENTUM_CAP, Math.min(MOMENTUM_CAP, trend)));
}
