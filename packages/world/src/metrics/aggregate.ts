import { resampleRule } from "./compatibility.js";
import type { Frequency, MetricDefinition } from "./definitions.js";
import type { MetricObservation } from "./observation.js";

const monthsOf = (period: string): number[] => {
  const [year, part] = period.split("-");
  if (part === undefined)
    return Array.from({ length: 12 }, (_, i) => i + 1).map(
      (m) => Number(year) * 12 + m,
    );
  if (part.startsWith("Q")) {
    const q = Number(part.slice(1));
    return [1, 2, 3].map((m) => Number(year) * 12 + (q - 1) * 3 + m);
  }
  return [Number(year) * 12 + Number(part)];
};

/** The first and last month index a period of any cadence covers. */
export const periodStart = (period: string): number => monthsOf(period)[0]!;
export const periodEnd = (period: string): number => monthsOf(period).at(-1)!;

/** The month index (year × 12 + month) a monthly period names. */
export const monthIndex = (period: string): number => monthsOf(period)[0]!;

export const monthPeriod = (index: number): string => {
  const year = Math.floor((index - 1) / 12);
  return `${year}-${String(index - year * 12).padStart(2, "0")}`;
};

function containingPeriod(period: string, to: Frequency): string {
  const index = monthIndex(period);
  const year = Math.floor((index - 1) / 12);
  const month = index - year * 12;
  if (to === "annual") return String(year);
  if (to === "quarterly") return `${year}-Q${Math.ceil(month / 3)}`;
  return period;
}

/**
 * Bring monthly observations to a coarser cadence by the definition's own rule.
 * A period with any constituent not carrying a value is itself missing: a sum
 * over a gap, or a last reading that was never published, is not an observation.
 * A period the series does not fully cover is dropped rather than reported short.
 */
export function resample(
  def: MetricDefinition,
  observations: readonly MetricObservation[],
  to: Frequency,
): readonly MetricObservation[] {
  const rule = resampleRule(def, to);
  if (!rule.ok) throw new Error(rule.reason);
  if (def.frequency === to) return observations;
  if (def.frequency !== "monthly")
    throw new Error(`Resampling from ${def.frequency} is not defined.`);
  const need = to === "annual" ? 12 : 3;
  const groups = new Map<string, MetricObservation[]>();
  for (const o of observations) {
    const key = containingPeriod(o.period, to);
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const out: MetricObservation[] = [];
  for (const [period, members] of groups) {
    if (members.length < need) continue;
    const sorted = [...members].sort(
      (a, b) => monthIndex(a.period) - monthIndex(b.period),
    );
    const last = sorted[sorted.length - 1]!;
    const values = sorted.map((o) =>
      o.result.status === "value" ? o.result.value : undefined,
    );
    const complete = values.every((v) => v !== undefined);
    let result: MetricObservation["result"] = { status: "missing" };
    if (def.reference === "period-total" && complete)
      result = {
        status: "value",
        value: (values as number[]).reduce((s, v) => s + v, 0),
      };
    else if (def.reference !== "period-total" && last.result.status === "value")
      result = last.result;
    out.push({ ...last, id: `${last.id}@${to}:${period}`, period, result });
  }
  return out;
}
