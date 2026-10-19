import { Column } from "../primitives/Stack";
import { alignedMoves, largestMove, sharedMoves } from "./outcome-moves";
import { Text } from "../primitives/Text";
import type { ReadingValence } from "../world/Readings";
import { CertainOdds, ChangeBar, MoneyBar, Metric, OddsSteps, moneyScale, type ResultReadings } from "./Results";
import type { EffectTone, EffectView, OutcomeView } from "./types";

// Shared reading order keeps an option's largest move from changing what a column means.

const VALENCE: Readonly<Record<EffectTone, ReadingValence>> = { favorable: "good", caution: "watch", adverse: "bad", neutral: "neutral" };

const oddsStep = (share: number): number => Math.max(1, Math.min(5, Math.round(share * 5)));

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** The money an outcome spends now, in USD millions: a negative figure is spent, a positive one comes in. */
export function spent(outcome: OutcomeView): { readonly now: number; readonly incoming: boolean } {
  const value = outcome.cost.figure?.value ?? 0;
  return { now: Math.abs(value), incoming: value > 0 };
}

export type OutcomeScales = { readonly money: number; readonly reach: ReadonlyMap<string, number>; readonly readings: readonly EffectView[] };

/** The scales every row of one list is drawn on. */
export function outcomeScales(outcomes: readonly (OutcomeView | undefined)[]): OutcomeScales {
  const present = outcomes.filter((outcome): outcome is OutcomeView => outcome !== undefined);
  const reach = new Map<string, number>();
  for (const effect of present.flatMap((outcome) => outcome.effects)) reach.set(effect.unit, Math.max(reach.get(effect.unit) ?? 0, Math.abs(effect.value)));
  return { money: moneyScale(present.map((outcome) => ({ now: spent(outcome).now }))), reach, readings: sharedMoves(outcomes) };
}

const shareOf = (effect: EffectView, scales: OutcomeScales): number => {
  const top = scales.reach.get(effect.unit) ?? 0;
  return top > 0 ? Math.abs(effect.value) / top : 0;
};

/** The one move a row shows in its slot: the largest against its own kind's scale. */
export function biggestMove(outcome: OutcomeView, scales: OutcomeScales): EffectView | undefined {
  return largestMove(outcome, scales.reach);
}

export function EffectChange({ effect, scales }: { readonly effect: EffectView; readonly scales: OutcomeScales }) {
  if (effect.value === 0) return <Metric label={effect.label} figure="0" spoken={`${effect.label}: no change`} />;
  return <ChangeBar label={effect.label} word={effect.text} share={shareOf(effect, scales)} rises={effect.value > 0} valence={VALENCE[effect.tone]} />;
}

// A missing metric still occupies its place so the other options can be read down.
export function outcomeReadings(outcome: OutcomeView | undefined, scales: OutcomeScales, withMove = true): ResultReadings {
  if (!outcome) return {};
  const money = spent(outcome);

  return {
    odds: outcome.odds ? (
      <OddsSteps step={oddsStep(outcome.odds.share)} word={capital(outcome.odds.word)} valence={outcome.odds.share >= 0.6 ? "good" : outcome.odds.share >= 0.4 ? "watch" : "bad"} />
    ) : (
      <CertainOdds />
    ),
    money: <MoneyBar now={money.now} scale={scales.money} text={outcome.cost.text === "Free" ? "No money" : outcome.cost.text} {...(money.incoming ? { incoming: true } : {})} />,
    ...(withMove ? { move: <Column gap="md">{alignedMoves(outcome, scales.readings, scales.reach).map(({ effect, largest }) => (
      <Column key={effect.metric} gap="2xs">
        <Text variant="caption" tone={largest ? "accent" : "tertiary"}>{largest ? "Largest move" : " "}</Text>
        <EffectChange effect={effect} scales={scales} />
      </Column>
    ))}</Column> } : {}),
  };
}
