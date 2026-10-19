import type { Campaign, MetricSet } from "./state.js";
import { selectNation } from "./state.js";
import type { MetricCost } from "./resolution.js";

// The one clamp a quoted price and the charge it becomes share. Split from
// conversations.ts so a surface with no conversation to project through — the
// instrument ladder, the country file — quotes against the same board through
// the same arithmetic apply() is itself clamped by.

function chargeableBoard(campaign: Campaign): Readonly<Record<string, number>> {
  const readiness = selectNation(campaign, campaign.founding.nation)?.stats.military.readiness;
  return {
    ...campaign.player.metrics,
    ...(readiness === undefined ? {} : { militaryReadiness: readiness }),
  };
}

/**
 * The same clamp `apply()` runs, applied to the quote before the player reads
 * it rather than to the charge after they have committed.
 *
 * Standing and stability spend real campaigns on the floor, and a card quoting
 * "standing falls heavily" against a standing of 0.02 was advertising a price
 * the game then did not charge — the Record printed the realized figure and the
 * two disagreed with no explanation. Budget authority has a floor and no
 * ceiling; every other metric is a 0..1 share.
 */
// Returns the authored delta untouched wherever the clamp does not bite: the
// quote is the resolver's own arithmetic, and re-deriving it as
// `clamp(held + delta) - held` would hand the player a figure a floating-point
// hundred-trillionth away from the one the resolver computed.
function chargeableDelta(key: string, delta: number, held: number): number {
  const next = held + delta;
  if (next < 0) return -held;
  if (key !== "treasury" && next > 1) return 1 - held;
  return delta;
}

export type ChargedQuote = { readonly cost: MetricCost; readonly exhausted: readonly (keyof MetricSet)[] };

// Exported so every surface that quotes a price against the live board — not
// only a reply card — clamps through the one function apply() is itself
// clamped by, rather than growing a second copy of this math.
export function chargedQuote(cost: MetricCost, campaign: Campaign): ChargedQuote {
  const board = chargeableBoard(campaign);
  const charged: Record<string, number> = {};
  const exhausted: (keyof MetricSet)[] = [];
  for (const [key, delta] of Object.entries(cost)) {
    if (delta === undefined) continue;
    const held = board[key];
    if (held === undefined) {
      charged[key] = delta;
      continue;
    }
    const chargeable = chargeableDelta(key, delta, held);
    charged[key] = chargeable;
    if (Math.abs(chargeable) < Math.abs(delta)) exhausted.push(key as keyof MetricSet);
  }
  return { cost: charged as MetricCost, exhausted };
}
