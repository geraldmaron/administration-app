import { COMMODITY_IDS, addDays, daysBetween, nextReleases, releasesBetween, } from "@admin/engine";
import { formatDate } from "../format/figures";
import { place } from "../navigation/places";
// The economic calendar as a timeline: what came out over the last two
// months, each on its own date with the figure it printed, and when each kind
// comes next. A release never stops the clock; this is where it is read.
export const RELEASE_LABELS = {
    jobs: "Jobs report",
    cpi: "Consumer prices",
    gdp: "Output, advance estimate",
    fomc: "Federal Reserve decision",
};
const COMMODITY_VIEW = Object.fromEntries(COMMODITY_IDS.map((id) => [id, "markets"]));
/** A measure the economy screen can open selected, and the view it is drawn in. */
export const ECONOMY_MEASURE_VIEW = {
    unemployment: "overview",
    inflation: "overview",
    growth: "overview",
    "policy-rate": "markets",
    ...COMMODITY_VIEW,
};
export function isEconomyMeasure(value) {
    return typeof value === "string" && Object.hasOwn(ECONOMY_MEASURE_VIEW, value);
}
/** The measure each release prints. */
export const RELEASE_MEASURE = {
    jobs: "unemployment",
    cpi: "inflation",
    gdp: "growth",
    fomc: "policy-rate",
};
/** Where each release's figure is read: the economy, on the view that draws it, with it selected. */
export const RELEASE_HREF = Object.fromEntries(Object.entries(RELEASE_MEASURE).map(([kind, measure]) => [kind, place.economyMeasure(measure, ECONOMY_MEASURE_VIEW[measure])]));
/** How far back the timeline reaches, in days. */
export const RELEASE_TIMELINE_DAYS = 56;
/** The figure a past release printed, from the week it fell in, as the economy's own record keeps it. */
function pastFigure(campaign, kind, daysAgo) {
    const turn = campaign.turn - Math.floor(daysAgo / 7);
    if (kind === "fomc") {
        const meeting = campaign.markets?.fed?.meetings?.find((entry) => daysBetween(entry.date, campaign.calendar) === daysAgo);
        return meeting ? `${(meeting.rate * 100).toFixed(2)}%` : undefined;
    }
    const sample = campaign.economyHistory?.find((entry) => entry.turn === turn);
    if (!sample)
        return undefined;
    const value = kind === "jobs" ? sample.unemployment : kind === "cpi" ? sample.inflation : sample.growth;
    return `${(value * 100).toFixed(1)}%`;
}
/** The last eight weeks of releases and the next of each kind. */
export function releaseTimeline(campaign) {
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
