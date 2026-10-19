import type { PhaseStart } from "./approval-attribution.js";
import type { Campaign } from "./state.js";

// Which part of the week moved the country's order and the President's money.
//
// A balance figure that ends the year at zero says nothing about why: a
// program can drain it, a continuing resolution can, a cabinet revolt can, and
// each wants a different fix. This reads each stretch of a harness week (the
// President's own acts, the days before the tick, and every phase of the tick)
// and books what the metric did across it, falls and rises apart, so a phase
// that drains stability to its floor is still visible in a week where the net
// reads flat.

export type AttributedMetric = "stability" | "treasury";
export const ATTRIBUTED_METRICS: readonly AttributedMetric[] = ["stability", "treasury"];

/** The stretch before the tick where the President acts. */
export const DECISIONS = "decisions";
/** The stretch before the tick where the day resolvers run. Not a phase, so no phase observer sees it. */
export const DAY_RESOLVERS = "dayResolvers";

/** What one stretch of the week did to a metric over a run, falls and rises kept apart. */
export type StretchMovement = { readonly fell: number; readonly rose: number };

export type MetricAttribution = Readonly<Record<AttributedMetric, Readonly<Record<string, StretchMovement>>>>;

export function openMetricAttribution(): MetricAttribution {
  return { stability: {}, treasury: {} };
}

type Stretch = { readonly id: string; readonly from: Campaign; readonly to: Campaign };

function book(movements: Readonly<Record<string, StretchMovement>>, id: string, delta: number): Readonly<Record<string, StretchMovement>> {
  if (delta === 0) return movements;
  const held = movements[id] ?? { fell: 0, rose: 0 };
  const next = delta < 0 ? { ...held, fell: held.fell - delta } : { ...held, rose: held.rose + delta };
  return { ...movements, [id]: next };
}

/**
 * One harness week: `start` before the President acted, `decided` after, then
 * each stretch the harness observed from the state it began on to the next
 * one's, the last running to `end`.
 */
export function attributeMetricWeek(
  ledger: MetricAttribution,
  start: Campaign,
  decided: Campaign,
  stretches: readonly PhaseStart[],
  end: Campaign,
): MetricAttribution {
  const week: readonly Stretch[] = [
    { id: DECISIONS, from: start, to: decided },
    ...stretches.map((stretch, index) => ({ id: stretch.id, from: stretch.state, to: stretches[index + 1]?.state ?? end })),
  ];
  return week.reduce<MetricAttribution>(
    (acc, stretch) => ({
      stability: book(acc.stability, stretch.id, stretch.to.player.metrics.stability - stretch.from.player.metrics.stability),
      treasury: book(acc.treasury, stretch.id, stretch.to.player.metrics.treasury - stretch.from.player.metrics.treasury),
    }),
    ledger,
  );
}

/** A stretch's part of all the movement a metric made, as shares of the gross falls and gross rises. */
export type StretchShare = { readonly id: string; readonly fell: number; readonly rose: number };

/** Each stretch's share of a metric's gross falls and rises, the stretch that moved it furthest first. Shares of zero movement read zero. */
export function metricShares(attributions: readonly MetricAttribution[], metric: AttributedMetric): readonly StretchShare[] {
  const totals = new Map<string, StretchMovement>();
  for (const attribution of attributions) {
    for (const [id, moved] of Object.entries(attribution[metric])) {
      const held = totals.get(id) ?? { fell: 0, rose: 0 };
      totals.set(id, { fell: held.fell + moved.fell, rose: held.rose + moved.rose });
    }
  }
  const fell = [...totals.values()].reduce((sum, moved) => sum + moved.fell, 0);
  const rose = [...totals.values()].reduce((sum, moved) => sum + moved.rose, 0);
  const share = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 1000) / 1000 : 0);
  return [...totals]
    .sort(([a, x], [b, y]) => y.fell + y.rose - (x.fell + x.rose) || a.localeCompare(b))
    .map(([id, moved]) => ({ id, fell: share(moved.fell, fell), rose: share(moved.rose, rose) }));
}

