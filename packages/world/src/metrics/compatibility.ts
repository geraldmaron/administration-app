import type { Frequency, MetricDefinition } from "./definitions.js";

export type ComparisonVerdict =
  | { readonly status: "compatible" }
  | {
      readonly status: "transform";
      readonly steps: readonly string[];
      readonly approximate: boolean;
    }
  | { readonly status: "incompatible"; readonly reason: string };

const incompatible = (reason: string): ComparisonVerdict => ({
  status: "incompatible",
  reason,
});

const FREQUENCY_RANK: Readonly<Record<Frequency, number>> = {
  weekly: 0,
  monthly: 1,
  quarterly: 2,
  annual: 3,
};

/**
 * How a series can be brought to a coarser cadence, or why it cannot. A stock
 * or a point reading of a rate takes the period's last observation; a flow sums;
 * a year-on-year change or a rate averaged over unequal bases does not
 * aggregate at all, so it is read at the coarser period's end instead of blended.
 */
export function resampleRule(
  def: MetricDefinition,
  to: Frequency,
):
  | { readonly ok: true; readonly step: string }
  | { readonly ok: false; readonly reason: string } {
  if (def.frequency === to) return { ok: true, step: "none" };
  if (FREQUENCY_RANK[to] < FREQUENCY_RANK[def.frequency]) {
    return {
      ok: false,
      reason: `${def.label} is ${def.frequency}; it cannot be read at ${to} cadence without inventing observations.`,
    };
  }
  if (def.reference === "period-total")
    return {
      ok: true,
      step: `sum the ${def.frequency} values inside each ${to} period`,
    };
  return {
    ok: true,
    step: `take the last ${def.frequency} reading in each ${to} period`,
  };
}

/**
 * Whether two definitions describe quantities that may share an axis, and what
 * must be done to them first. Checks run from the most fundamental difference
 * to the least, so the reason a player reads is the first thing wrong.
 */
export function checkComparison(
  a: MetricDefinition,
  b: MetricDefinition,
): ComparisonVerdict {
  if (a.concept !== b.concept)
    return incompatible(
      `${a.label} measures ${a.concept}; ${b.label} measures ${b.concept}.`,
    );
  if (a.kind !== b.kind)
    return incompatible(`One is a ${a.kind} and the other a ${b.kind}.`);
  if (a.scope !== b.scope)
    return incompatible(
      `One covers the ${a.scope} level and the other the ${b.scope} level.`,
    );
  if (a.priceBasis !== b.priceBasis)
    return incompatible(
      `One is ${a.priceBasis} and the other ${b.priceBasis}.`,
    );
  if (a.denominator !== b.denominator) {
    return incompatible(
      `Different denominators: ${a.denominator ?? "none"} against ${b.denominator ?? "none"}.`,
    );
  }
  if (a.kind === "index" && a.indexBase !== b.indexBase) {
    return incompatible(
      `Index levels on different bases (${a.indexBase} and ${b.indexBase}) are not comparable; compare changes instead.`,
    );
  }
  if (a.adjustment !== b.adjustment) {
    return incompatible(
      `One is ${a.adjustment} and the other ${b.adjustment}.`,
    );
  }

  const steps: string[] = [];
  let approximate = false;
  if (a.unit !== b.unit) {
    const pair = new Set([a.unit, b.unit]);
    if (pair.has("percent") && pair.has("fraction"))
      steps.push("multiply the fraction by 100 to read it as percent");
    else return incompatible(`Units differ: ${a.unit} and ${b.unit}.`);
  }
  if (a.reference !== b.reference) {
    const pair = new Set([a.reference, b.reference]);
    if (pair.has("annual-rate") && pair.has("change-on-year-earlier")) {
      steps.push("read the annual rate as a year-over-year change");
      approximate = true;
    } else
      return incompatible(
        `One is read as ${a.reference} and the other as ${b.reference}.`,
      );
  }
  if (a.frequency !== b.frequency) {
    const [fine, coarse] =
      FREQUENCY_RANK[a.frequency] <= FREQUENCY_RANK[b.frequency]
        ? [a, b]
        : [b, a];
    const rule = resampleRule(fine, coarse.frequency);
    if (!rule.ok) return incompatible(rule.reason);
    steps.push(`${fine.label}: ${rule.step}`);
  }
  return steps.length === 0
    ? { status: "compatible" }
    : { status: "transform", steps, approximate };
}
