import { WORLD_SERIES, WORLD_SERIES_COUNTRIES, WORLD_SERIES_LICENSE, WORLD_SERIES_OPENED, WORLD_SERIES_SOURCES, WORLD_SERIES_VINTAGE, } from "../dataset/world-series.js";
import { periodEnd, periodStart } from "./aggregate.js";
import { WORLD_DEFINITIONS } from "./definitions.js";
import { ReferenceDatasetManifest, } from "./observation.js";
const SERIES_OF = {
    "wb.unemployment": "unemployment",
    "wb.inflation": "inflation",
    "wb.population-growth": "population-growth",
    "wb.gdp-growth": "gdp-growth",
};
/** The ILO's unemployment figure and the UN's population growth are modeled estimates; inflation and growth are reported statistics. */
const EVIDENCE = {
    "wb.unemployment": "estimated-reference",
    "wb.population-growth": "estimated-reference",
    "wb.inflation": "observed-reference",
    "wb.gdp-growth": "observed-reference",
};
export const WORLD_REFERENCE_COUNTRIES = WORLD_SERIES_COUNTRIES;
/** Observations by metric then country (ISO-3), oldest first, a year the source did not publish an explicit gap. */
export const WORLD_REFERENCE_OBSERVATIONS = Object.fromEntries(Object.entries(SERIES_OF).map(([metric, key]) => [
    metric,
    Object.fromEntries(Object.entries(WORLD_SERIES[key] ?? {}).map(([country, points]) => [
        country,
        points.map((p) => ({
            id: `${metric}:${country}:${p.date}:v1`,
            metric,
            entity: country,
            period: p.date,
            released: WORLD_SERIES_VINTAGE,
            vintage: 1,
            evidence: EVIDENCE[metric],
            provenance: `${key}: ${WORLD_SERIES_SOURCES[key] ?? ""}`,
            result: p.value === null
                ? { status: "missing" }
                : { status: "value", value: p.value },
        })),
    ])),
]));
const coverageOf = (rows) => ({
    first: rows?.[0]?.period ?? "0000",
    last: rows?.at(-1)?.period ?? "0000",
});
export const WORLD_REFERENCE_MANIFEST = ReferenceDatasetManifest.parse({
    id: "world-bank-wdi-peers",
    version: WORLD_SERIES_VINTAGE.replaceAll("-", ""),
    provider: "The World Bank Group, World Development Indicators",
    entities: Object.keys(WORLD_SERIES_COUNTRIES),
    retrieved: WORLD_SERIES_OPENED,
    license: WORLD_SERIES_LICENSE,
    series: Object.keys(WORLD_DEFINITIONS).map((metric) => {
        const rows = Object.values(WORLD_REFERENCE_OBSERVATIONS[metric] ?? {});
        return {
            metric,
            sourceId: WORLD_SERIES_SOURCES[SERIES_OF[metric]]?.match(/[A-Z]{2}\.[A-Z.]+/)?.[0] ?? SERIES_OF[metric],
            sourceUrl: "https://api.worldbank.org/v2/country/all/indicator/",
            transformation: "none",
            coverage: {
                first: rows.map((r) => coverageOf(r).first).sort()[0] ?? "0000",
                last: rows
                    .map((r) => coverageOf(r).last)
                    .sort()
                    .at(-1) ?? "0000",
            },
        };
    }),
});
/** One country's observations of a metric inside [first, last] (years or months), or why they cannot be answered. */
export function worldWindow(metric, country, first, last) {
    const rows = WORLD_REFERENCE_OBSERVATIONS[metric]?.[country];
    if (!rows || rows.length === 0)
        return {
            ok: false,
            reason: `No reference data for ${metric} in ${country}.`,
        };
    const cov = coverageOf(rows);
    const [from, to] = [periodStart(first), periodEnd(last)];
    if (from < periodStart(cov.first) || to > periodEnd(cov.last)) {
        return {
            ok: false,
            reason: `${WORLD_SERIES_COUNTRIES[country] ?? country} ${metric} covers ${cov.first} to ${cov.last}; ${first} to ${last} is outside it.`,
        };
    }
    return {
        ok: true,
        observations: rows.filter((o) => periodStart(o.period) >= from && periodEnd(o.period) <= to),
    };
}
