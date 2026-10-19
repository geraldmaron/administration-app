import { metricImpact, type Campaign, type MetricCost, type MetricSet, type RiskBranch } from "@admin/engine";
import type { ComparisonCell, ComparisonRow } from "../conversation/decision-comparison.js";
import { METRIC_LABELS } from "../format/figures.js";
import { formatMoney } from "../format/money.js";

// The comparison every act on a chair is drawn as: each option on the same
// rows, each a change from today (there is no do-nothing column), read off the engine's own projection of
// the act. A projection returns what the commit would charge (`cost`) and what
// follows past the week (`risks`), so a row here is never a second copy of a
// price; it is the price the click spends, banded the way every other
// comparison bands a move.

/** What an act would charge and what follows from it, in the shape every engine projection on a chair returns. */
export type ActPrice = {
  readonly cost: MetricCost;
  readonly risks: readonly RiskBranch[];
};

export type PricedOption = {
  readonly id: string;
  readonly label: string;
  /** Why the engine refuses this option today, in its own words. */
  readonly unavailable?: string;
  readonly price?: ActPrice;
  /** What follows that the price does not say. */
  readonly follows?: readonly string[];
};

const BETTER_HIGHER: ReadonlySet<string> = new Set(["approval", "stability", "standing", "militaryReadiness"]);
const LOCKED: ComparisonCell = { kind: "none", text: "Not available" };

function costCell(campaign: Campaign, domain: string, delta: number | undefined): ComparisonCell {
  if (delta === undefined || delta === 0) return { kind: "none", text: "No change" };
  if (domain === "treasury") return { kind: "money", amount: delta, text: delta < 0 ? `${formatMoney(-delta)} spent` : `${formatMoney(delta)} coming in` };
  const impact = metricImpact(domain, delta, "next-turn", campaign.player.metrics.treasury, "modeled");
  return { kind: "impact", impact, favorable: BETTER_HIGHER.has(domain) ? delta > 0 : undefined };
}

function label(domain: string): string {
  return domain in METRIC_LABELS ? METRIC_LABELS[domain as keyof MetricSet] : domain;
}

/** One row per reading any option moves, in the order the metrics are listed. */
function costRows(campaign: Campaign, options: readonly PricedOption[]): ComparisonRow[] {
  const order = Object.keys(METRIC_LABELS);
  const moved = new Set(options.flatMap((option) => Object.entries(option.price?.cost ?? {}).flatMap(([key, delta]) => (delta ? [key] : []))));
  const domains = [...moved].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return domains.map((domain) => ({
    id: `effect:${domain}`,
    topic: domain === "treasury" ? ("money" as const) : ("effect" as const),
    label: label(domain),
    cells: options.map((option) => (option.unavailable ? LOCKED : costCell(campaign, domain, option.price?.cost[domain as keyof MetricCost]))),
  }));
}

function followsCell(option: PricedOption): ComparisonCell {
  if (option.unavailable) return { kind: "none", text: option.unavailable };
  const lines = [...(option.price?.risks.map((risk) => risk.description) ?? []), ...(option.follows ?? [])];
  return lines.length > 0 ? { kind: "lines", lines } : { kind: "none", text: "Nothing else" };
}

/**
 * The rows a priced comparison is read on: every reading any option moves,
 * then what follows. A row an option has nothing to say on reads "No change",
 * never a blank.
 */
export function pricedRows(campaign: Campaign, options: readonly PricedOption[]): readonly ComparisonRow[] {
  return [
    ...costRows(campaign, options),
    { id: "follows", topic: "downside", label: "What happens next", cells: options.map(followsCell) },
  ];
}
