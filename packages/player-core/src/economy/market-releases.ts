import {
  COMMODITY_IDS,
  addDays,
  daysBetween,
  nextReleases,
  releasesBetween,
  type Campaign,
  type CommodityId,
  type ReleaseKind,
} from "@admin/engine";
import { formatDate } from "../format/figures";
import { place } from "../navigation/places";

// The economic calendar as a timeline: what came out over the last two
// months, each on its own date with the figure it printed, and when each kind
// comes next. A release never stops the clock; this is where it is read.

export const RELEASE_LABELS: Readonly<Record<ReleaseKind, string>> = {
  jobs: "Jobs report",
  cpi: "Consumer prices",
  gdp: "Output, advance estimate",
  fomc: "Federal Reserve decision",
};

const COMMODITY_VIEW = Object.fromEntries(COMMODITY_IDS.map((id) => [id, "markets" as const])) as Readonly<Record<CommodityId, "markets">>;

/** A measure the economy screen can open selected, and the view it is drawn in. */
export const ECONOMY_MEASURE_VIEW = {
  unemployment: "overview",
  inflation: "overview",
  growth: "overview",
  "policy-rate": "markets",
  ...COMMODITY_VIEW,
} as const;

export type EconomyMeasure = keyof typeof ECONOMY_MEASURE_VIEW;

export function isEconomyMeasure(value: unknown): value is EconomyMeasure {
  return typeof value === "string" && Object.hasOwn(ECONOMY_MEASURE_VIEW, value);
}

/** The measure each release prints. */
export const RELEASE_MEASURE: Readonly<Record<ReleaseKind, EconomyMeasure>> = {
  jobs: "unemployment",
  cpi: "inflation",
  gdp: "growth",
  fomc: "policy-rate",
};

/** Where each release's figure is read: the economy, on the view that draws it, with it selected. */
export const RELEASE_HREF: Readonly<Record<ReleaseKind, string>> = Object.fromEntries(
  Object.entries(RELEASE_MEASURE).map(([kind, measure]) => [kind, place.economyMeasure(measure, ECONOMY_MEASURE_VIEW[measure])]),
) as Record<ReleaseKind, string>;

export type ReleaseEntry = {
  readonly kind: ReleaseKind;
  readonly label: string;
  readonly href: string;
  readonly date: string;
  /** Days before today, negative for a release still ahead. */
  readonly daysAgo: number;
  /** The figure it printed, where the week it fell in is on the record. */
  readonly figure?: string;
};

export type ReleaseTimeline = {
  readonly past: readonly ReleaseEntry[];
  readonly next: readonly ReleaseEntry[];
};

/** How far back the timeline reaches, in days. */
export const RELEASE_TIMELINE_DAYS = 56;

/** The figure a past release printed, from the week it fell in, as the economy's own record keeps it. */
function pastFigure(campaign: Campaign, kind: ReleaseKind, daysAgo: number): string | undefined {
  const turn = campaign.turn - Math.floor(daysAgo / 7);
  if (kind === "fomc") {
    const meeting = campaign.markets?.fed?.meetings?.find((entry) => daysBetween(entry.date, campaign.calendar) === daysAgo);
    return meeting ? `${(meeting.rate * 100).toFixed(2)}%` : undefined;
  }
  const sample = campaign.economyHistory?.find((entry) => entry.turn === turn);
  if (!sample) return undefined;
  const value = kind === "jobs" ? sample.unemployment : kind === "cpi" ? sample.inflation : sample.growth;
  return `${(value * 100).toFixed(1)}%`;
}

/** The last eight weeks of releases and the next of each kind. */
export function releaseTimeline(campaign: Campaign): ReleaseTimeline {
  const today = campaign.calendar;
  const past = releasesBetween(addDays(today, -RELEASE_TIMELINE_DAYS), today).map(({ kind, date }) => {
    const daysAgo = daysBetween(date, today);
    const figure = pastFigure(campaign, kind, daysAgo);
    return { kind, label: RELEASE_LABELS[kind], href: RELEASE_HREF[kind], date: formatDate(date), daysAgo, ...(figure ? { figure } : {}) };
  });
  const next = nextReleases(addDays(today, 1)).map(({ kind, date }) => ({
    kind,
    label: RELEASE_LABELS[kind],
    href: RELEASE_HREF[kind],
    date: formatDate(date),
    daysAgo: -daysBetween(today, date),
  }));
  return { past, next };
}
