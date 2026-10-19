import type { MagnitudeBand, MetricSet, ProjectionImpact } from "@admin/engine";
import type { ActFigure } from "../congress/act-comparison.js";
import { formatSignedPoints } from "../format/figures.js";
import { formatMoney } from "../format/money.js";
import type { ChoiceMove, ChoiceTone } from "../policy/choice-table.js";

// What one option in a choice comes to, in the shape the results list draws:
// the price paid now, the odds where there is doubt, each reading it moves on
// one axis shared by every option, the worst case, and everything else as
// labeled lines for when the option is opened. Producers fill it only from the
// numbers the engine already holds; a field with no number behind it is left
// out, never estimated here.

/** What is paid the moment the act is authorized. `figure` is the money, in USD millions, where money is paid. */
export type ChoiceCost = { readonly text: string; readonly figure?: ActFigure; readonly borrowing?: { readonly text: string; readonly amount: number } };

/** The chance it goes well, where the act has one: a 0..1 share, the likelihood word and the forecast's confidence. */
export type ChoiceOdds = { readonly share: number; readonly word: string; readonly confidence?: string };

/**
 * One reading an option moves. `value` (the move's own field) is the likely
 * move; `ifWell` and `ifBadly` bound it where the act can land either way.
 * Every value is in `unit`: "pts" for a 0..1 reading said in points, "band"
 * for a move the engine only gives as a magnitude (±1 slight, ±2 moderate,
 * ±3 major), so a band never reads as a precise amount.
 */
export type ChoiceEffect = ChoiceMove & {
  readonly metric: string;
  readonly label: string;
  readonly unit: "pts" | "band";
  readonly ifWell?: number;
  readonly ifBadly?: number;
};

export type ChoiceDetail = { readonly label: string; readonly text: string };

export type ChoiceOutcome = {
  readonly cost: ChoiceCost;
  readonly odds?: ChoiceOdds;
  readonly effects: readonly ChoiceEffect[];
  /** The worst case in one line: the readings that fall if it goes badly, or the consequence in words where it has no number. */
  readonly worstCase?: string;
  readonly details: readonly ChoiceDetail[];
};

export const COST_FREE: ChoiceCost = { text: "Free" };

/** The money an act spends now, as the cost column says it. A positive amount is money coming in. */
export function moneyCost(amount: number): ChoiceCost {
  if (amount === 0) return COST_FREE;
  const figure: ActFigure = { kind: "amount", value: amount, unit: "USD millions", stance: amount < 0 ? "adverse" : "favorable" };
  return { text: amount < 0 ? formatMoney(-amount) : `${formatMoney(amount)} in`, figure };
}

/** The player metrics by the short names a narrow column fits. */
export const METRIC_SHORT: Readonly<Record<keyof MetricSet, string>> = {
  approval: "Approval",
  treasury: "Treasury",
  stability: "Stability",
  militaryReadiness: "Readiness",
  standing: "Standing",
};

const toneOfSign = (value: number): ChoiceTone => (value > 0 ? "favorable" : value < 0 ? "adverse" : "neutral");

/** Points, rounded the way every reading of a metric is said. */
const points = (fraction: number): number => Math.round(fraction * 1000) / 10;

/**
 * A move on a 0..1 reading, said in points. `well` and `badly` are the
 * fractions it moves by in each case, and `chance` the odds it goes well; the
 * likely move is their chance-weighted mean. Without a chance the move is
 * certain. `betterHigher` false flips the tone for a reading that is worse up.
 */
export function pointsEffect(metric: string, label: string, move: { readonly well: number; readonly badly?: number; readonly chance?: number }, betterHigher = true): ChoiceEffect {
  const ranged = move.badly !== undefined && move.chance !== undefined && move.badly !== move.well;
  const likely = ranged ? move.chance! * move.well + (1 - move.chance!) * move.badly! : move.well;
  const value = points(likely);
  const tone = toneOfSign(betterHigher ? value : -value);
  return {
    metric,
    label,
    unit: "pts",
    value,
    text: `${formatSignedPoints(likely)} pts`,
    tone,
    ...(ranged ? { ifWell: points(move.well), ifBadly: points(move.badly!) } : {}),
  };
}

const BAND_STEPS: Readonly<Record<MagnitudeBand, number>> = { slight: 1, moderate: 2, major: 3 };
const BAND_WORDS: Readonly<Record<MagnitudeBand, string>> = { slight: "Slight", moderate: "Moderate", major: "Major" };

/** A move the engine gives only as a band, on the ±3 band scale. `favorable` undefined is a reading with no stance of its own. */
export function bandEffect(metric: string, label: string, impact: ProjectionImpact, favorable: boolean | undefined): ChoiceEffect {
  const up = impact.direction === "up";
  return {
    metric,
    label,
    unit: "band",
    value: BAND_STEPS[impact.band] * (up ? 1 : -1),
    text: `${BAND_WORDS[impact.band]} ${up ? "rise" : "fall"}`,
    tone: favorable === undefined ? "neutral" : favorable ? "favorable" : "adverse",
  };
}

const signed = (value: number): string => `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;

/** The readings that fall if it goes badly, in one line: "Press corps −10, Standing −2.7". Undefined where nothing falls. */
export function worstCaseOf(effects: readonly ChoiceEffect[]): string | undefined {
  const falls = effects.flatMap((effect) => (effect.ifBadly !== undefined && effect.ifBadly < 0 ? [`${effect.label} ${signed(effect.ifBadly)}`] : []));
  return falls.length > 0 ? falls.join(", ") : undefined;
}
