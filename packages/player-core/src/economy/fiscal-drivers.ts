import {
  selectDeficitDrivers,
  selectFiscalStatement,
  selectMacroDrivers,
  selectNation,
  type Campaign,
  type DeficitDriver,
  type DeficitDriverSource,
  type MacroDriverSource,
  type MacroDrivers,
  type MacroRate,
} from "@admin/engine";
import { formatMoney } from "../format/money";

// "What moved it": the deficit and the three rates, each split into the parts
// that put it where it is, as the engine attributes them.

export type FiscalDriversReading = {
  readonly deficit: readonly DeficitDriver[];
  readonly rates: MacroDrivers;
};

export function fiscalDrivers(campaign: Campaign): FiscalDriversReading {
  return {
    deficit: selectDeficitDrivers(campaign),
    rates: selectMacroDrivers(campaign, campaign.founding.nation),
  };
}

/**
 * One part of a figure, in words, with its amount as the room prints it and
 * as a signed number in the row's own unit, so a screen can draw it against
 * its siblings.
 */
export type DriverRow = { readonly source: string; readonly label: string; readonly figure: string; readonly amount: number };

const RATE_SOURCE_LABELS: Readonly<Record<MacroDriverSource, string>> = {
  rest: "The economy's own trend",
  cycle: "The business cycle",
  program: "Your current policies",
  impulse: "How much the budget adds to spending",
  conditions: "What the country is living through",
  world: "Wars, sanctions and trading partners",
  commodities: "World prices for fuel, food and materials",
  gap: "The economy settling back to normal",
};

// On inflation the economy's own part is its anchor blended with what the
// public already expects prices to do.
const INFLATION_REST_LABEL = "The economy's own rate, and what people expect";

const DEFICIT_SOURCE_LABELS: Readonly<Record<DeficitDriverSource, string>> = {
  inherited: "The budget you inherited",
  cycle: "The business cycle",
  program: "Your current policies",
  laws: "Laws passed since you took office",
  orders: "Your orders",
  world: "Wars and unrest",
  interest: "Interest on the debt",
  limit: "Payments held back",
};

const RATE_ORDER: readonly MacroRate[] = ["growth", "inflation", "unemployment"];

/**
 * A part of a rate to a tenth of a point, signed. Whole percents rounded every
 * part under half a point to nothing, so two years of a program read "0%".
 */
function signedPoints(fraction: number): string {
  const tenths = Math.round(Math.abs(fraction) * 1000) / 10;
  if (tenths === 0) return "0.0 pts";
  return `${fraction > 0 ? "+" : "−"}${tenths.toFixed(1)} pts`;
}

function percentOne(fraction: number): string {
  const tenths = Math.round(Math.abs(fraction) * 1000) / 10;
  return `${fraction < 0 && tenths !== 0 ? "−" : ""}${tenths.toFixed(1)}%`;
}

/**
 * One rate's parts. They sum to where the rate is heading, not to where it
 * stands: a rate closes part of the distance each week, so the two differ while
 * it travels, and the reading says both.
 */
export type RateDriverReading = {
  readonly rate: MacroRate;
  readonly rows: readonly DriverRow[];
  /** Where the parts sum to. */
  readonly heading: string;
  /** Where the rate stands this week. */
  readonly now: string;
};

export function rateDriverReadings(campaign: Campaign): readonly RateDriverReading[] {
  const economy = selectNation(campaign, campaign.founding.nation)?.stats.economy;
  if (!economy) return [];
  const { rates } = fiscalDrivers(campaign);
  return RATE_ORDER.filter((rate) => rates[rate].length > 0).map((rate) => ({
    rate,
    rows: rates[rate].map((driver) => ({
      source: driver.source,
      label: rate === "inflation" && driver.source === "rest" ? INFLATION_REST_LABEL : RATE_SOURCE_LABELS[driver.source],
      figure: signedPoints(driver.amount),
      amount: driver.amount,
    })),
    heading: percentOne(rates[rate].reduce((sum, driver) => sum + driver.amount, 0)),
    now: percentOne(economy[rate]),
  }));
}

/** The year's balance, part by part, and the balance its parts sum to. */
export type DeficitDriverReading = { readonly rows: readonly DriverRow[]; readonly balance: string };

export function deficitDriverReading(campaign: Campaign): DeficitDriverReading | undefined {
  const { deficit } = fiscalDrivers(campaign);
  if (deficit.length === 0) return undefined;
  return {
    rows: deficit.map((driver) => ({ source: driver.source, label: DEFICIT_SOURCE_LABELS[driver.source], figure: `${formatMoney(driver.amount)} a year`, amount: driver.amount })),
    balance: `${formatMoney(selectFiscalStatement(campaign).balance)} a year`,
  };
}
