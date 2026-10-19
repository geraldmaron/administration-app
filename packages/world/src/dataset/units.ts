import { MILITARY_BRANCHES, NationStats } from "../schemas/nation.js";
import { statLeafPaths } from "./stat-consumers.js";

// What every authored figure actually means.
//
// Until now the unit of a stat lived in a file-header comment: `trade.exports:
// 2_100_000` was USD millions because a sentence three hundred lines up said
// so. Nothing refused a value authored on the wrong scale, and no screen could
// print a unit it was never told — so a player read "2,100,000" against a label
// that did not say whether that was dollars, containers or tonnes. A figure
// whose unit is a convention is a figure nobody can check.
//
// So the unit is declared here, once, beside the field it belongs to, and the
// paired test walks the schema rather than this list: a field added to
// NationStats fails the build until somebody says what it is measured in.

/** How a figure is counted. `share` is 0..1; `index` is 0..1 with no natural unit. */
export type UnitKind = "currency" | "count" | "share" | "index" | "rate" | "years" | "energy" | "text";

export type UnitSpec = {
  readonly kind: UnitKind;
  /**
   * The multiplier the authored number carries, as a power of ten. Authored
   * currency is USD millions, so `scale: 6` — a stored 2_100_000 is
   * $2.1 trillion, and the formatter is what decides to say "trillion".
   */
  readonly scale?: number;
  /** The unit as a player reads it, where a bare number would be ambiguous. */
  readonly suffix?: string;
  /** What the figure is counting, for the reading a screen puts beside it. */
  readonly noun?: string;
};

const USD_MILLIONS: UnitSpec = { kind: "currency", scale: 6, suffix: "USD" };
const SHARE: UnitSpec = { kind: "share" };
const INDEX: UnitSpec = { kind: "index" };
const PEOPLE: UnitSpec = { kind: "count", noun: "people" };
const TEXT: UnitSpec = { kind: "text" };

// Six services × three leaves is eighteen near-identical entries, and eighteen
// hand-written lines is eighteen chances to unit one of them differently from
// its five siblings. Generated from the branch list the schema itself declares,
// so a seventh service is covered the moment it exists.
function orderOfBattleUnits(): Record<string, UnitSpec> {
  return Object.fromEntries(
    MILITARY_BRANCHES.flatMap((branch) => [
      [`military.orderOfBattle.${branch}.headcount`, { kind: "count", noun: "personnel" } satisfies UnitSpec],
      [`military.orderOfBattle.${branch}.capabilities`, TEXT],
      [`military.orderOfBattle.${branch}.units`, TEXT],
    ]),
  );
}

// Every leaf of NationStats, in schema order. `share` and `index` differ on
// purpose: a share is a real proportion of a real total (literacy is the
// fraction of people who read), while an index is a 0..1 reading with no
// denominator anyone could count (doctrine quality is an assessment). A screen
// may print a share as a percentage and must not do the same to an index; an
// index reaches the player as a graded word instead — see `gradeOf`.
export const STAT_UNITS: Readonly<Record<string, UnitSpec>> = {
  "demography.population": PEOPLE,
  "demography.urbanization": SHARE,
  "demography.medianAge": { kind: "years", suffix: "yrs" },
  "demography.growthRate": { kind: "rate", suffix: "per year" },
  "demography.literacy": SHARE,
  // Stored as a fraction per person per year for consistency with every other
  // rate here; a player surface renders it per 1,000, which is how a reader
  // expects a vital rate to be quoted.
  "demography.birthRate": { kind: "rate", noun: "per 1,000 per year" },
  "demography.deathRate": { kind: "rate", noun: "per 1,000 per year" },
  "demography.netMigration": { kind: "rate", noun: "per 1,000 per year" },

  "economy.gdp": USD_MILLIONS,
  "economy.gdpPerCapita": { kind: "currency", scale: 0, suffix: "USD" },
  "economy.growth": { kind: "rate", suffix: "per year" },
  "economy.inflation": { kind: "rate", suffix: "per year" },
  "economy.unemployment": SHARE,
  // An index, not a share: 1.000 is the dataset snapshot, and there is no
  // denominator anyone could count behind it.
  "economy.costOfLiving": { kind: "index" },
  "economy.debt": USD_MILLIONS,
  "economy.reserves": USD_MILLIONS,
  "economy.sovereignRating": TEXT,

  "trade.exports": USD_MILLIONS,
  "trade.imports": USD_MILLIONS,
  "trade.balance": USD_MILLIONS,
  // Closed SectorId labels (max 10), not free-string leftovers.
  "trade.topExports": TEXT,
  "trade.topPartners": TEXT,
  "trade.tradeDependence": { kind: "share", noun: "of trade" },

  // Primary energy, annualized. Terawatt-hours rather than the mixed barrels
  // and cubic feet the sources quote, so production and consumption can be
  // subtracted from one another.
  "energy.production": { kind: "energy", suffix: "TWh" },
  "energy.consumption": { kind: "energy", suffix: "TWh" },
  "energy.importDependence": { kind: "share", noun: "of consumption" },
  "energy.mix.energy-oil": { kind: "share", noun: "of supply" },
  "energy.mix.energy-gas": { kind: "share", noun: "of supply" },
  "energy.mix.energy-nuclear": { kind: "share", noun: "of supply" },
  "energy.mix.energy-renewables": { kind: "share", noun: "of supply" },

  "military.budget": USD_MILLIONS,
  "military.activeHeadcount": { kind: "count", noun: "personnel" },
  "military.reserveHeadcount": { kind: "count", noun: "personnel" },
  "military.readiness": INDEX,
  "military.doctrineQuality": INDEX,
  "military.branchStrength.land": INDEX,
  "military.branchStrength.air": INDEX,
  "military.branchStrength.naval": INDEX,
  "military.branchStrength.cyber": INDEX,
  "military.branchStrength.space": INDEX,
  "military.airliftCapacity": INDEX,
  "military.sealiftCapacity": INDEX,
  "military.arsenal.warheads": { kind: "count", noun: "warheads" },
  "military.arsenal.deliveryTriad": TEXT,
  "military.arsenal.declared": TEXT,
  "military.basesAbroad": { kind: "count", noun: "installations" },

  // The order of battle. Headcounts are people on the same scale the aggregate
  // above them is; a capability list and a unit list are each a set of named
  // records rather than a figure, so they read as text for the same reason
  // `trade.topExports` does — there is no scale to get wrong, and a screen
  // renders the names, not a total.
  ...orderOfBattleUnits(),

  "security.crimeIndex": INDEX,
  "security.corruptionIndex": INDEX,
  "security.insurgencyPressure": INDEX,
  "security.borderControl": INDEX,
  "security.intelCapability": INDEX,
  "security.counterIntel": INDEX,

  "politics.regimeStability": INDEX,
  "politics.legitimacy": INDEX,
  "politics.factionalism": INDEX,
  "politics.pressFreedom": INDEX,
  "politics.protestPressure": INDEX,

  "softPower.diplomaticReach": INDEX,
  "softPower.culturalReach": INDEX,
  "softPower.aidGiven": USD_MILLIONS,
  "softPower.aidReceived": USD_MILLIONS,
};

/** Every NationStats leaf the schema defines, for the completeness check. */
export function statUnitPaths(): readonly string[] {
  return statLeafPaths(NationStats);
}

export function unitFor(path: string): UnitSpec | undefined {
  return STAT_UNITS[path];
}

const CURRENCY_STEPS: readonly { readonly at: number; readonly suffix: string }[] = [
  { at: 1e12, suffix: "T" },
  { at: 1e9, suffix: "B" },
  { at: 1e6, suffix: "M" },
  { at: 1e3, suffix: "K" },
];

// One decimal on every compacted figure, so a column of them lines up and a
// player is never left wondering whether $2.1T and $468B were rounded the same
// way. Below a thousand there is nothing to compact and the number is shown as
// it is.
function compact(value: number): string {
  return value.toFixed(1);
}

function formatCurrency(value: number, spec: UnitSpec): string {
  const absolute = value * 10 ** (spec.scale ?? 0);
  const sign = absolute < 0 ? "-" : "";
  const magnitude = Math.abs(absolute);
  const step = CURRENCY_STEPS.find((candidate) => magnitude >= candidate.at);
  if (!step) return `${sign}$${magnitude.toFixed(0)}`;
  return `${sign}$${compact(magnitude / step.at)}${step.suffix}`;
}

function formatCount(value: number): string {
  const step = CURRENCY_STEPS.find((candidate) => Math.abs(value) >= candidate.at);
  if (!step) return value.toLocaleString("en-US");
  return `${compact(value / step.at)}${step.suffix}`;
}

/**
 * A figure as a player reads it, with its unit attached.
 *
 * The one place a scale word is chosen. A screen that formats a stat itself is
 * a screen that can disagree with the next one about what the same number
 * means, which is the failure this exists to make impossible.
 */
/**
 * Where an index sits, in the words a briefing would use.
 *
 * An index has no denominator to take a percentage of — that much the unit
 * split has always had right. But the conclusion drawn from it was that the
 * figure should print on the scale it is recorded on, and the scale it is
 * recorded on is a machine's: twenty-seven readings the player most wants an
 * opinion about — legitimacy, press freedom, factionalism, doctrine quality,
 * a rival service's counter-intelligence — all reached the screen as "0.50".
 * That is not a reading anybody can act on; it is the storage format leaking.
 *
 * These are magnitude words, not quality words, and deliberately so. Roughly
 * half of the indexed fields are ones where more is worse — corruption, crime,
 * insurgency pressure, protest pressure, factionalism — and a ladder that ran
 * from "poor" to "excellent" would invert on every one of them. "Exceptional
 * corruption" and "exceptional intelligence capability" both say the same true
 * thing about the size of the number, and let the surface around them say
 * whether that is good news.
 *
 * The word is the whole reading, with no figure beside it. A player comparing
 * two governments inside one grade is served by the track under the reading —
 * which takes the raw value and is the app's shape for exactly that — not by
 * reprinting the float the word exists to replace.
 */
export function gradeOf(value: number): string {
  if (value >= 0.85) return "Exceptional";
  if (value >= 0.65) return "High";
  if (value >= 0.45) return "Moderate";
  if (value >= 0.25) return "Limited";
  return "Negligible";
}

export function formatFigure(value: number, spec: UnitSpec): string {
  switch (spec.kind) {
    case "currency":
      return formatCurrency(value, spec);
    case "count":
      return formatCount(value);
    case "share":
    case "rate":
      return `${(value * 100).toFixed(1)}%`;
    case "index":
      return gradeOf(value);
    case "years":
      return `${Math.round(value)}`;
    case "energy":
      return formatCount(value);
    case "text":
      return String(value);
  }
}

/** The figure and the words that say what it is, for a label beside a reading. */
export function describeFigure(value: number, spec: UnitSpec): string {
  const figure = formatFigure(value, spec);
  const tail = spec.suffix ?? spec.noun;
  if (!tail || spec.kind === "share" || spec.kind === "currency") return figure;
  return `${figure} ${tail}`;
}
