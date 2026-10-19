import { COST_JITTER, costMultiplier } from "@admin/engine";
export { COST_JITTER, costMultiplier } from "@admin/engine";
import { SCENARIO_COST_ANCHORS, US_ID, worldDataset, type Nation } from "@admin/world";
import type { FinancialHorizon, FinancialScale, ScenarioImpact } from "./impact.js";
import type { ScenarioSeverity } from "./scenario-labels.js";

// What a scenario's money costs, read from what the federal government has
// actually spent on weeks of the same size.
//
// A financial band used to be a fixed share of output: a supplemental was 0.2%
// of GDP, so every supplemental in the game cost $58.6 billion, the same for a
// six-month waiting-time program at one port as for a hurricane. The band says
// how the money is authorized, not how much it is; the week's severity says how
// big it is, and the anchor for that pairing is a real appropriation of that
// kind, carried to the world's dollars. A reply that can state its own
// arithmetic (drivers times hours times a rate) is priced from that instead.
//
// Every price is then drawn around its center from the campaign's seed, skewed
// toward overrun, because no two campaigns' versions of a program cost the same
// and real programs come in over their estimate far more often than under it.

type PricedScale = Exclude<FinancialScale, "none">;

/** The year the world is set in, whose dollars every price is stated in. */
const WORLD_YEAR = 2026;

function row(anchor: string) {
  const found = SCENARIO_COST_ANCHORS.find((entry) => entry.anchor === anchor);
  if (!found) throw new Error(`scenario-cost: no anchor "${anchor}" in SCENARIO_COST_ANCHORS`);
  return found;
}

/** An anchor's money in the world's dollars, carried forward by the consumer price index. */
export function anchorInWorldDollars(anchor: string): number {
  const entry = row(anchor);
  if (entry.dollarYear === undefined) throw new Error(`scenario-cost: anchor "${anchor}" carries no dollar year`);
  return entry.value * (row(`cpi-${WORLD_YEAR}`).value / row(`cpi-${entry.dollarYear}`).value);
}

/**
 * Which real appropriation stands for each band at each severity, USD millions
 * in the world's dollars. A routine supplemental is a city's water system; a
 * serious one an outbreak response; a critical one a hurricane. A structural
 * claim is one year of the program, which the horizon then extends.
 */
const BAND_CENTERS: Readonly<Record<PricedScale, Readonly<Record<ScenarioSeverity, () => number>>>> = {
  discretionary: {
    routine: () => anchorInWorldDollars("discretionary-routine"),
    serious: () => anchorInWorldDollars("discretionary-serious"),
    critical: () => anchorInWorldDollars("discretionary-critical"),
  },
  supplemental: {
    routine: () => anchorInWorldDollars("flint-wiin-2016"),
    serious: () => anchorInWorldDollars("zika-supplemental-2016"),
    critical: () => anchorInWorldDollars("harvey-first-supplemental"),
  },
  emergency: {
    routine: () => anchorInWorldDollars("zika-supplemental-2016"),
    serious: () => anchorInWorldDollars("ebola-emergency-2015"),
    critical: () => anchorInWorldDollars("sandy-supplemental"),
  },
  structural: {
    routine: () => anchorInWorldDollars("structural-routine"),
    serious: () => anchorInWorldDollars("chips-manufacturing-incentives") / row("chips-incentive-years").value,
    critical: () => anchorInWorldDollars("structural-critical"),
  },
};

/** A multi-year commitment costs more than its first year, and a permanent one more again. Planning values. */
const HORIZON_MULTIPLIER: Readonly<Record<FinancialHorizon, number>> = { "one-off": 1, "multi-year": 1.8, permanent: 3 };

/** A week confined to one city is priced one severity down: the anchors are national events. */
const CITY_STEP_DOWN: Readonly<Record<ScenarioSeverity, ScenarioSeverity>> = { critical: "serious", serious: "routine", routine: "routine" };
/** And a routine week in one city at a share of the routine anchor, since it has nowhere further down to step. Planning value. */
const CITY_ROUTINE_SHARE = 0.5;

/**
 * How far a price lands from its center. Planning values, set against the
 * record that public projects overrun far more often than they come in under
 * (Flyvbjerg, Holm and Buhl, 2002; see the sources file): the median lands a
 * little over the center, the tail reaches well past it, and a band carries
 * more spread than a reply that stated its own arithmetic.
 */
export type CostPricing = {
  /** The week's severity. Absent prices at "serious", the middle of the corpus. */
  readonly severity?: ScenarioSeverity;
  /** The draw key: a campaign's seed with the occurrence it prices. Absent prices at the center, unjittered. */
  readonly key?: string;
};

/** What the United States' output is at founding, the scale every anchor was spent against. */
function usOutput(): number {
  const us = worldDataset.nations.find((nation) => nation.id === US_ID);
  if (!us) throw new Error("scenario-cost: the United States is missing from the dataset");
  return us.stats.economy.gdp;
}

/**
 * The money a reply's declared impact borrows, USD millions at today's prices,
 * or nothing when it declares no money.
 *
 * Another government pays the American anchor scaled by its output against the
 * United States', since a hurricane supplemental is a different sum in a smaller
 * economy. `costOfLiving` carries the founding's dollars to today's, so a
 * program answered in year four is priced at year four's prices.
 */
export function financialCost(impact: ScenarioImpact, nation: Nation, pricing: CostPricing = {}): number | undefined {
  const financial = impact.financial;
  const scale = financial?.scale;
  if (!financial || !scale || scale === "none") return undefined;
  const prices = nation.stats.economy.costOfLiving;

  if (financial.basis) {
    const center = basisCenter(financial.basis);
    return center * prices * costMultiplier(pricing.key, COST_JITTER.basisSpread);
  }

  const severity = pricing.severity ?? "serious";
  const city = financial.scope === "city";
  const band = city ? CITY_STEP_DOWN[severity] : severity;
  const cityShare = city && severity === "routine" ? CITY_ROUTINE_SHARE : 1;
  const scaleToNation = nation.id === US_ID ? 1 : nation.stats.economy.gdp / usOutput();
  const horizon = HORIZON_MULTIPLIER[financial.horizon ?? "one-off"];
  const center = BAND_CENTERS[scale][band]() * cityShare * scaleToNation * horizon;
  return center * prices * costMultiplier(pricing.key, COST_JITTER.bandSpread);
}

/**
 * A reply's own authored obligation, drawn around what the writer typed.
 *
 * The figure in a reply's `cost` is a writer's round number. The obligation it
 * stands for is not round: it lands near that figure, a little over more often
 * than under, at cents of a million. Absent a key, the figure is returned as
 * written.
 */
export function jitterTreasury(amount: number, key: string | undefined): number {
  if (key === undefined || amount === 0) return amount;
  const drawn = amount * costMultiplier(`${key}|treasury`, COST_JITTER.treasurySpread, COST_JITTER.treasuryBias);
  return Math.round(drawn * 100) / 100;
}

/** The center a basis or band prices at for the United States, unjittered. Exported for the audit. */
export function financialCenterForUs(impact: ScenarioImpact, severity: ScenarioSeverity): number | undefined {
  const financial = impact.financial;
  if (!financial?.scale || financial.scale === "none") return undefined;
  if (!financial.basis) {
    const band = financial.scope === "city" ? CITY_STEP_DOWN[severity] : severity;
    return BAND_CENTERS[financial.scale][band]() * HORIZON_MULTIPLIER[financial.horizon ?? "one-off"];
  }
  return basisCenter(financial.basis);
}

function basisCenter(basis: NonNullable<NonNullable<ScenarioImpact["financial"]>["basis"]>): number {
  const primary = basis.quantity * basis.unitCostUSD * (basis.weeks ?? 1);
  const additional = (basis.components ?? []).reduce((sum, item) => sum + item.quantity * item.unitCostUSD * (item.weeks ?? 1), 0);
  return (primary + additional) / 1_000_000;
}

/** The band's own center at a severity, for the audit's comparison against a stated basis. */
export function bandCenterForUs(scale: PricedScale, severity: ScenarioSeverity): number {
  return BAND_CENTERS[scale][severity]();
}

/** The estimate carries its accounting boundary into the frozen option and eventual receipt. */
export function financialEstimate(impact: ScenarioImpact, key: string): import("@admin/engine").ScenarioEstimate {
  const basis = impact.financial?.basis;
  const extra = (basis?.components ?? []).map((component) =>
    `${component.label}: ${component.quantity} ${component.unit} at $${component.unitCostUSD}${component.weeks ? ` for ${component.weeks} weeks` : ""}; ${component.source}`);
  return { key, method: basis ? "arithmetic" : "band", spread: basis ? COST_JITTER.basisSpread : COST_JITTER.bandSpread,
    source: basis ? [basis.source, basis.coverage ?? "Coverage not documented", ...extra].join(". ") :
      `Comparable federal ${impact.financial?.scale} appropriation; case-specific cost breakdown unavailable` };
}
