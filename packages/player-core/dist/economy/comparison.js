import { economyRecord, elapsedDays } from "@admin/engine";
import { ALL_METRIC_DEFINITIONS, checkComparison, monthIndex, periodEnd, referenceWindow, valueOf, } from "@admin/world";
/** Proposed analysis windows. Whether the reference pack covers one is checked per rate, never assumed. */
export const WINDOW_PRESETS = [
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
const METRICS = {
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
const MONTH_DAYS = 365.25 / 12;
function windowChoice(rate, window) {
    const found = referenceWindow(METRICS[rate].reference, window.first, window.last);
    return found.ok
        ? { ...window, available: true }
        : { ...window, available: false, reason: found.reason };
}
function referenceSeries(rate, window) {
    const found = referenceWindow(METRICS[rate].reference, window.first, window.last);
    const start = monthIndex(window.first);
    const points = (found.ok ? found.observations : []).map((o) => {
        const value = valueOf(o);
        return {
            month: periodEnd(o.period) - start,
            label: o.period,
            value,
            ...(value === undefined
                ? { gap: `The agency didn't publish a number for ${o.period}.` }
                : {}),
        };
    });
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
function playedSeries(campaign, rate, cadence, length) {
    const block = cadence === "monthly" ? 1 : 3;
    const last = new Map();
    const record = economyRecord(campaign);
    for (const sample of record) {
        const elapsedMonths = Math.floor(elapsedDays(sample.turn) / MONTH_DAYS);
        const key = Math.floor(elapsedMonths / block);
        last.set(key, { value: sample[rate] * 100, turn: sample.turn });
    }
    const newest = record.at(-1)?.turn ?? 0;
    const finishedBefore = Math.floor(Math.floor(elapsedDays(newest) / MONTH_DAYS) / block);
    const points = [...last.entries()]
        .filter(([key]) => key < finishedBefore && (key + 1) * block <= length)
        .sort(([a], [b]) => a - b)
        .map(([key, reading]) => ({
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
export function comparisonView(campaign, rate, windowId) {
    const windows = WINDOW_PRESETS.map((preset) => windowChoice(rate, preset));
    const selected = windows.find((w) => w.id === windowId) ??
        windows.find((w) => w.available) ??
        windows[0];
    const spec = METRICS[rate];
    const verdict = checkComparison(ALL_METRIC_DEFINITIONS[spec.simulated], ALL_METRIC_DEFINITIONS[spec.reference]);
    const basis = `Counted in months from the start of each stretch. The past line starts in the first month of ${selected.first}, and yours starts when you took office. These aren't calendar dates.`;
    const caution = "A past stretch shows what the economy did back then, with that time's policies and surprises. It doesn't show what any one President caused.";
    if (!selected.available) {
        return {
            rate,
            windows,
            selected,
            verdict,
            basis,
            series: [],
            unavailable: selected.reason ?? "There's no past data for this stretch of time.",
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
