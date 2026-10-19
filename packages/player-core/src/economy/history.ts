import { CAMPAIGN_OPENING_DATE, economyRecord, elapsedDays, selectNation, type Campaign, type EconomySample } from "@admin/engine";
import { US_SERIES, US_SERIES_SOURCES, type UsSeriesPoint } from "@admin/world";

// A rate's course from 2017 to this week in three stretches that are never
// allowed to pass for one another: what the Bureau of Labor Statistics and the
// Bureau of Economic Analysis published, the gap between their latest release
// and the inauguration, and what has happened since the oath.
//
// The gap is drawn as one straight segment from the last published figure to
// the figure the administration opens on, with a single point at the oath. It
// states the two ends and nothing between them: a monthly path through a
// stretch nobody has published would be history made up to fill a chart.

export type EconomyHistoryRate = "unemployment" | "inflation" | "growth";

export type EconomyHistoryPoint = {
  readonly label: string;
  /** Percent, as the agencies print it. */
  readonly value: number;
  readonly kind: "recorded" | "projected" | "played";
  /** Years, fractional: where the point sits in time. */
  readonly at: number;
};

export type EconomyHistory = {
  readonly rate: EconomyHistoryRate;
  /** Chart-coordinate distance covered by one observed week. */
  readonly unitsPerWeek: number;
  readonly label: string;
  readonly points: readonly EconomyHistoryPoint[];
  /** Who published the recorded stretch, and where it was read. */
  readonly source: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const LABELS: Readonly<Record<EconomyHistoryRate, string>> = {
  unemployment: "Unemployment",
  inflation: "Inflation over 12 months",
  growth: "Growth over the past year",
};

const SOURCE_KEYS: Readonly<Record<EconomyHistoryRate, string>> = {
  unemployment: "unemployment",
  inflation: "cpi",
  growth: "gdp-growth",
};

const round1 = (value: number) => Math.round(value * 10) / 10 + 0;

/** "2026-08" or "2026-Q2" as a label and a time in years, at the middle of the period. */
function period(date: string): { readonly label: string; readonly at: number } {
  const [yearText, part = ""] = date.split("-");
  const year = Number(yearText);
  if (part.startsWith("Q")) {
    const quarter = Number(part.slice(1));
    return { label: `${year} Q${quarter}`, at: year + (quarter * 3 - 1.5) / 12 };
  }
  const month = Number(part);
  return { label: `${MONTHS[month - 1] ?? part} ${year}`, at: year + (month - 0.5) / 12 };
}

/** The twelve-month change in the index, only where both months were published. */
function twelveMonthChange(index: readonly UsSeriesPoint[]): readonly UsSeriesPoint[] {
  const byDate = new Map(index.map((point) => [point.date, point.value]));
  return index.flatMap((point) => {
    const [year, month] = point.date.split("-");
    const before = byDate.get(`${Number(year) - 1}-${month}`);
    return before === undefined ? [] : [{ date: point.date, value: (point.value / before - 1) * 100 }];
  });
}

function published(rate: EconomyHistoryRate): readonly UsSeriesPoint[] {
  if (rate === "inflation") return twelveMonthChange(US_SERIES.cpi ?? []);
  return US_SERIES[SOURCE_KEYS[rate]] ?? [];
}

const OATH_AT = CAMPAIGN_OPENING_DATE.year + (CAMPAIGN_OPENING_DATE.month - 1 + (CAMPAIGN_OPENING_DATE.day - 1) / 31) / 12;
const WEEK_IN_YEARS = elapsedDays(1) / 365.25;

function sampleValue(sample: EconomySample, rate: EconomyHistoryRate): number {
  return round1(sample[rate] * 100);
}

/** One rate's recorded, projected and played stretches, oldest first. */
export function economyHistory(campaign: Campaign, rate: EconomyHistoryRate): EconomyHistory {
  const recorded: EconomyHistoryPoint[] = published(rate).map((point) => ({ ...period(point.date), value: round1(point.value), kind: "recorded" }));
  const opening = selectNation(campaign, campaign.founding.nation)?.base.stats.economy[rate];
  const projected: EconomyHistoryPoint[] =
    opening === undefined ? [] : [{ label: "When you took office", value: round1(opening * 100), kind: "projected", at: OATH_AT }];
  const played: EconomyHistoryPoint[] = economyRecord(campaign).map((sample) => ({
    label: `Week ${sample.turn}`,
    value: sampleValue(sample, rate),
    kind: "played",
    at: OATH_AT + sample.turn * WEEK_IN_YEARS,
  }));
  return {
    rate,
    unitsPerWeek: WEEK_IN_YEARS,
    label: LABELS[rate],
    points: [...recorded, ...projected, ...played],
    source: US_SERIES_SOURCES[SOURCE_KEYS[rate]] ?? "",
  };
}

export const ECONOMY_HISTORY_RATES: readonly EconomyHistoryRate[] = ["unemployment", "inflation", "growth"];
