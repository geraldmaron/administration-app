import { economyRecord, elapsedDays, type Campaign } from "@admin/engine";
import {
  ALL_METRIC_DEFINITIONS,
  checkComparison,
  monthIndex,
  periodEnd,
  referenceWindow,
  valueOf,
  type ComparisonVerdict,
} from "@admin/world";
import type { EconomyHistoryRate } from "./history.js";

// Putting this presidency's economy beside a stretch of the published United
// States record. The two are lined up by months since each began, never by
// calendar date: the campaign's years are its own, and a calendar overlay would
// say the game's 2029 happened in 2019. Choosing a window or a rate reads the
// campaign and changes nothing in it.

export type ComparisonWindow = {
  readonly id: string;
  readonly label: string;
  /** "YYYY-MM", the first and last month the window covers. */
  readonly first: string;
  readonly last: string;
};

/** Proposed analysis windows. Whether the reference pack covers one is checked per rate, never assumed. */
export const WINDOW_PRESETS: readonly ComparisonWindow[] = [
  {
    id: "1973-1982",
    label: "1973 to 1982 · oil shocks and stagflation",
    first: "1973-01",
    last: "1982-12",
  },
  {
    id: "2007-2012",
    label: "2007 to 2012 · financial crisis and recovery",
    first: "2007-01",
    last: "2012-12",
  },
  {
    id: "2015-2019",
    label: "2015 to 2019 · long expansion",
    first: "2015-01",
    last: "2019-12",
  },
  {
    id: "2017-2019",
    label: "2017 to 2019 · before the pandemic",
    first: "2017-01",
    last: "2019-12",
  },
  {
    id: "2020-2022",
    label: "2020 to 2022 · pandemic and recovery",
    first: "2020-01",
    last: "2022-12",
  },
];

const METRICS: Readonly<
  Record<
    EconomyHistoryRate,
    {
      readonly reference: string;
      readonly simulated: string;
      readonly cadence: "monthly" | "quarterly";
    }
  >
> = {
  unemployment: {
    reference: "us.unemployment",
    simulated: "sim.unemployment",
    cadence: "monthly",
  },
  inflation: {
    reference: "us.inflation",
    simulated: "sim.inflation",
    cadence: "monthly",
  },
  growth: {
    reference: "us.gdp-growth",
    simulated: "sim.growth",
    cadence: "quarterly",
  },
};

export type ComparisonPoint = {
  /** Months since the series began, at the end of the period it covers. */
  readonly month: number;
  readonly label: string;
  /** Percent, or undefined where the period carries no value. */
  readonly value: number | undefined;
  /** Why there is no value, when there is not. */
  readonly gap?: string;
};

export type ComparisonSeries = {
  readonly id: "reference" | "played";
  readonly label: string;
  readonly evidence: "observed" | "simulated";
  readonly points: readonly ComparisonPoint[];
};

export type WindowChoice = ComparisonWindow & {
  readonly available: boolean;
  readonly reason?: string;
};

export type ComparisonView = {
  readonly rate: EconomyHistoryRate;
  readonly windows: readonly WindowChoice[];
  readonly selected: WindowChoice;
  readonly verdict: ComparisonVerdict;
  /** What is lined up with what, in one sentence a player can check. */
  readonly basis: string;
  readonly series: readonly ComparisonSeries[];
  /** Set when the chosen window cannot be drawn; the series are then empty. */
  readonly unavailable?: string;
  /** What the reference stretch cannot tell you. */
  readonly caution: string;
};

const MONTH_DAYS = 365.25 / 12;

function windowChoice(
  rate: EconomyHistoryRate,
  window: ComparisonWindow,
): WindowChoice {
  const found = referenceWindow(
    METRICS[rate].reference,
    window.first,
    window.last,
  );
  return found.ok
    ? { ...window, available: true }
    : { ...window, available: false, reason: found.reason };
}

function referenceSeries(
  rate: EconomyHistoryRate,
  window: WindowChoice,
): ComparisonSeries {
  const found = referenceWindow(
    METRICS[rate].reference,
    window.first,
    window.last,
  );
  const start = monthIndex(window.first);
  const points = (found.ok ? found.observations : []).map(
    (o): ComparisonPoint => {
      const value = valueOf(o);
      return {
        month: periodEnd(o.period) - start,
        label: o.period,
        value,
        ...(value === undefined
          ? { gap: `The agency didn't publish a number for ${o.period}.` }
          : {}),
      };
    },
  );
  return {
    id: "reference",
    label: `United States, ${window.first.slice(0, 4)} to ${window.last.slice(0, 4)}`,
    evidence: "observed",
    points,
  };
}

/**
 * The campaign's weekly readings brought to the reference cadence by the check's
 * own rule: the last reading in each month (or three-month block) since the
 * oath, as a percent. A block the campaign has not finished is not drawn.
 */
function playedSeries(
  campaign: Campaign,
  rate: EconomyHistoryRate,
  cadence: "monthly" | "quarterly",
  length: number,
): ComparisonSeries {
  const block = cadence === "monthly" ? 1 : 3;
  const last = new Map<number, { value: number; turn: number }>();
  const record = economyRecord(campaign);
  for (const sample of record) {
    const elapsedMonths = Math.floor(elapsedDays(sample.turn) / MONTH_DAYS);
    const key = Math.floor(elapsedMonths / block);
    last.set(key, { value: sample[rate] * 100, turn: sample.turn });
  }
  const newest = record.at(-1)?.turn ?? 0;
  const finishedBefore = Math.floor(
    Math.floor(elapsedDays(newest) / MONTH_DAYS) / block,
  );
  const points = [...last.entries()]
    .filter(([key]) => key < finishedBefore && (key + 1) * block <= length)
    .sort(([a], [b]) => a - b)
    .map(([key, reading]): ComparisonPoint => ({
      month: (key + 1) * block - 1,
      label: `Month ${(key + 1) * block}`,
      value: Math.round(reading.value * 10) / 10,
    }));
  return {
    id: "played",
    label: "This presidency",
    evidence: "simulated",
    points,
  };
}

export function comparisonView(
  campaign: Campaign,
  rate: EconomyHistoryRate,
  windowId: string,
): ComparisonView {
  const windows = WINDOW_PRESETS.map((preset) => windowChoice(rate, preset));
  const selected =
    windows.find((w) => w.id === windowId) ??
    windows.find((w) => w.available) ??
    windows[0]!;
  const spec = METRICS[rate];
  const verdict = checkComparison(
    ALL_METRIC_DEFINITIONS[spec.simulated]!,
    ALL_METRIC_DEFINITIONS[spec.reference]!,
  );
  const basis = `Counted in months from the start of each stretch. The past line starts in the first month of ${selected.first}, and yours starts when you took office. These aren't calendar dates.`;
  const caution =
    "A past stretch shows what the economy did back then, with that time's policies and surprises. It doesn't show what any one President caused.";
  if (!selected.available) {
    return {
      rate,
      windows,
      selected,
      verdict,
      basis,
      series: [],
      unavailable:
        selected.reason ?? "There's no past data for this stretch of time.",
      caution,
    };
  }
  if (verdict.status === "incompatible") {
    return {
      rate,
      windows,
      selected,
      verdict,
      basis,
      series: [],
      unavailable: verdict.reason,
      caution,
    };
  }
  const reference = referenceSeries(rate, selected);
  const length = (reference.points.at(-1)?.month ?? 0) + 1;
  return {
    rate,
    windows,
    selected,
    verdict,
    basis,
    series: [reference, playedSeries(campaign, rate, spec.cadence, length)],
    caution,
  };
}
