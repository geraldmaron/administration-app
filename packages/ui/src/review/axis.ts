import type { EffectView } from "./types";

export type EffectAxis = { readonly unit: string; readonly lo: number; readonly hi: number; readonly ticks: readonly { readonly at: number; readonly label: string }[] };

const BAND_TICKS: Readonly<Record<number, string>> = { [-3]: "Big drop", 0: "None", 3: "Big rise" };

/** A round step that puts the axis's end at or past `span`. */
function niceCeil(span: number): number {
  if (span <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(span));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= span) ?? 10;
  return step * power;
}

export const signedTick = (value: number): string => (value === 0 ? "0" : `${value > 0 ? "+" : "−"}${Math.abs(value)}`);

/**
 * The one axis every move in `unit` is drawn on, sized to the likely moves so
 * a move of a point reads as a bar and not a speck. Where moves go both ways
 * the axis is even about zero, so a rise and a fall of the same size draw the
 * same length. Bands always run three steps each way.
 */
export function effectAxis(effects: readonly EffectView[], unit: string): EffectAxis {
  if (unit === "band") return { unit, lo: -3, hi: 3, ticks: [-3, 0, 3].map((at) => ({ at, label: BAND_TICKS[at]! })) };
  const values = effects.filter((effect) => effect.unit === unit).map((effect) => effect.value);
  const reach = niceCeil(Math.max(0, ...values.map(Math.abs)));
  const lo = values.some((value) => value < 0) ? -reach : 0;
  const hi = (values.some((value) => value > 0) ? reach : 0) || (lo === 0 ? 1 : 0);
  const ticks = [lo, 0, hi].filter((at, index, all) => all.indexOf(at) === index);
  return { unit, lo, hi, ticks: ticks.map((at) => ({ at, label: at === hi && unit ? `${signedTick(at)} ${unit}` : signedTick(at) })) };
}

/** Where a value falls on the axis, as a share 0..1, clipped at the ends. */
export function axisShare(axis: EffectAxis, value: number): number {
  if (axis.hi === axis.lo) return 0.5;
  return (Math.min(axis.hi, Math.max(axis.lo, value)) - axis.lo) / (axis.hi - axis.lo);
}

/** The axes a comparison draws on, one per unit its moves are in, the most used first. */
export function axesOf(effects: readonly EffectView[]): ReadonlyMap<string, EffectAxis> {
  const count = (unit: string) => effects.filter((effect) => effect.unit === unit).length;
  const units = [...new Set(effects.map((effect) => effect.unit))].sort((a, b) => count(b) - count(a));
  return new Map(units.map((unit) => [unit, effectAxis(effects, unit)]));
}

/** A cost every option shares is not a difference between them, so it is said once rather than on every card. */
export function sharedCost(costs: readonly { readonly text: string; readonly figure?: { readonly value: number }; readonly borrowing?: unknown }[]): string | undefined {
  if (costs.length === 0 || costs.some((cost) => cost.borrowing !== undefined)) return undefined;
  const keys = new Set(costs.map((cost) => (cost.figure ? `#${cost.figure.value}` : cost.text)));
  return keys.size === 1 ? costs[0]!.text : undefined;
}

/** The one reason every locked option shares, where two or more are locked for it. */
export function sharedLock(reasons: readonly (string | undefined)[]): string | undefined {
  const locked = reasons.filter((reason): reason is string => reason !== undefined);
  return locked.length >= 2 && locked.every((reason) => reason === locked[0]) ? locked[0] : undefined;
}
