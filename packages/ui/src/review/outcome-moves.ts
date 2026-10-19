import type { EffectView, OutcomeView } from "./types";

export type MoveReading = { readonly effect: EffectView; readonly largest: boolean };

export function sharedMoves(outcomes: readonly (OutcomeView | undefined)[]): readonly EffectView[] {
  const byMetric = new Map<string, EffectView>();
  for (const outcome of outcomes) for (const effect of outcome?.effects ?? []) {
    if (!byMetric.has(effect.metric)) byMetric.set(effect.metric, effect);
  }
  return [...byMetric.values()];
}

export function largestMove(outcome: OutcomeView, reach: ReadonlyMap<string, number>): EffectView | undefined {
  const share = (effect: EffectView): number => Math.abs(effect.value) / (reach.get(effect.unit) || 1);
  return [...outcome.effects].filter((effect) => effect.value !== 0).sort((a, b) => share(b) - share(a))[0];
}

export function alignedMoves(outcome: OutcomeView, readings: readonly EffectView[], reach: ReadonlyMap<string, number>): readonly MoveReading[] {
  const largest = largestMove(outcome, reach)?.metric;
  return readings.map((reading) => ({
    effect: outcome.effects.find((effect) => effect.metric === reading.metric) ?? { ...reading, value: 0, text: "No change", tone: "neutral", ifWell: undefined, ifBadly: undefined },
    largest: reading.metric === largest,
  }));
}
