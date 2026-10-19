import { US_SERIES, US_SERIES_RELEASES, US_SERIES_SOURCES, } from "../dataset/us-series.js";
import { monthIndex, monthPeriod, periodEnd, periodStart, } from "./aggregate.js";
import { REFERENCE_DEFINITIONS } from "./definitions.js";
import { ReferenceDatasetManifest, } from "./observation.js";
const ENTITY = "USA";
const SOURCE_ID = {
    "us.unemployment": "unemployment",
    "us.cpi": "cpi",
    "us.gdp-growth": "gdp-growth",
};
const quarterIndex = (period) => Number(period.slice(0, 4)) * 4 + Number(period.slice(-1));
const quarterPeriod = (index) => `${Math.floor((index - 1) / 4)}-Q${index - Math.floor((index - 1) / 4) * 4}`;
function observation(metric, period, value, release, provenance) {
    return {
        id: `${metric}:${period}:v1`,
        metric,
        entity: ENTITY,
        period,
        ...(release ? { released: release } : {}),
        vintage: 1,
        evidence: "observed-reference",
        provenance,
        result: value === undefined ? { status: "missing" } : { status: "value", value },
    };
}
/** Every period from first to last, a published value where there is one and an explicit gap where the agency printed none. */
function filled(metric, sourceKey, step) {
    const points = US_SERIES[sourceKey] ?? [];
    if (points.length === 0)
        return [];
    const byDate = new Map(points.map((p) => [p.date, p.value]));
    const index = step === "month" ? monthIndex : quarterIndex;
    const period = step === "month" ? monthPeriod : quarterPeriod;
    const release = US_SERIES_RELEASES[sourceKey];
    const provenance = `${sourceKey}: ${US_SERIES_SOURCES[sourceKey] ?? ""}`;
    const out = [];
    for (let i = index(points[0].date); i <= index(points[points.length - 1].date); i += 1) {
        out.push(observation(metric, period(i), byDate.get(period(i)), release, provenance));
    }
    return out;
}
/** Twelve-month change in the CPI, only where both months carry a value; otherwise the month is a gap. */
function inflation(cpi) {
    const byPeriod = new Map(cpi.map((o) => [o.period, o]));
    return cpi.flatMap((o) => {
        const before = byPeriod.get(monthPeriod(monthIndex(o.period) - 12));
        if (!before)
            return [];
        const now = o.result.status === "value" ? o.result.value : undefined;
        const then = before.result.status === "value" ? before.result.value : undefined;
        const value = now !== undefined && then !== undefined
            ? (now / then - 1) * 100
            : undefined;
        return [
            {
                ...observation("us.inflation", o.period, value, o.released, `Derived: twelve-month change in ${o.metric}.`),
            },
        ];
    });
}
const CPI = filled("us.cpi", "cpi", "month");
/** The offline United States reference pack: observed, latest vintage only. */
export const US_REFERENCE_OBSERVATIONS = {
    "us.unemployment": filled("us.unemployment", "unemployment", "month"),
    "us.cpi": CPI,
    "us.inflation": inflation(CPI),
    "us.gdp-growth": filled("us.gdp-growth", "gdp-growth", "quarter"),
};
const coverage = (metric) => {
    const rows = US_REFERENCE_OBSERVATIONS[metric] ?? [];
    return {
        first: rows[0]?.period ?? "0000",
        last: rows[rows.length - 1]?.period ?? "0000",
    };
};
export const US_REFERENCE_MANIFEST = ReferenceDatasetManifest.parse({
    id: "us-agency-series",
    version: `${Math.max(...Object.values(US_SERIES_RELEASES).map((d) => Number(d.replaceAll("-", ""))))}`,
    provider: "US Bureau of Labor Statistics; US Bureau of Economic Analysis",
    retrieved: "2026-09-28",
    license: "public domain",
    series: Object.keys(REFERENCE_DEFINITIONS).map((metric) => ({
        metric,
        sourceId: SOURCE_ID[metric] ?? "cpi",
        sourceUrl: metric === "us.gdp-growth"
            ? "https://apps.bea.gov/national/Release/TXT/NipaDataQ.txt"
            : "https://api.bls.gov/publicAPI/v2/timeseries/data/",
        transformation: metric === "us.inflation"
            ? "twelve-month percent change of us.cpi, computed where both months were published"
            : "none",
        coverage: coverage(metric),
    })),
});
/**
 * The observations of a metric whose period lies wholly inside [first, last]
 * (months, "YYYY-MM"), or why the request cannot be answered. Periods are
 * ordered by the months they cover, so a quarter sits among its months.
 */
export function referenceWindow(metric, first, last) {
    const rows = US_REFERENCE_OBSERVATIONS[metric];
    if (!rows || rows.length === 0)
        return { ok: false, reason: `No reference data for ${metric}.` };
    const cov = coverage(metric);
    const [from, to] = [periodStart(first), periodEnd(last)];
    if (from < periodStart(cov.first) || to > periodEnd(cov.last)) {
        return {
            ok: false,
            reason: `${metric} covers ${cov.first} to ${cov.last}; ${first} to ${last} is outside it.`,
        };
    }
    return {
        ok: true,
        observations: rows.filter((o) => periodStart(o.period) >= from && periodEnd(o.period) <= to),
    };
}
