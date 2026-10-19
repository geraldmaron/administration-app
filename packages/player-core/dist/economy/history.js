import { CAMPAIGN_OPENING_DATE, economyRecord, elapsedDays, selectNation } from "@admin/engine";
import { US_SERIES, US_SERIES_SOURCES } from "@admin/world";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LABELS = {
    unemployment: "Unemployment",
    inflation: "Inflation over 12 months",
    growth: "Growth over the past year",
};
const SOURCE_KEYS = {
    unemployment: "unemployment",
    inflation: "cpi",
    growth: "gdp-growth",
};
const round1 = (value) => Math.round(value * 10) / 10 + 0;
/** "2026-08" or "2026-Q2" as a label and a time in years, at the middle of the period. */
function period(date) {
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
function twelveMonthChange(index) {
    const byDate = new Map(index.map((point) => [point.date, point.value]));
    return index.flatMap((point) => {
        const [year, month] = point.date.split("-");
        const before = byDate.get(`${Number(year) - 1}-${month}`);
        return before === undefined ? [] : [{ date: point.date, value: (point.value / before - 1) * 100 }];
    });
}
function published(rate) {
    if (rate === "inflation")
        return twelveMonthChange(US_SERIES.cpi ?? []);
    return US_SERIES[SOURCE_KEYS[rate]] ?? [];
}
const OATH_AT = CAMPAIGN_OPENING_DATE.year + (CAMPAIGN_OPENING_DATE.month - 1 + (CAMPAIGN_OPENING_DATE.day - 1) / 31) / 12;
const WEEK_IN_YEARS = elapsedDays(1) / 365.25;
function sampleValue(sample, rate) {
    return round1(sample[rate] * 100);
}
/** One rate's recorded, projected and played stretches, oldest first. */
export function economyHistory(campaign, rate) {
    const recorded = published(rate).map((point) => ({ ...period(point.date), value: round1(point.value), kind: "recorded" }));
    const opening = selectNation(campaign, campaign.founding.nation)?.base.stats.economy[rate];
    const projected = opening === undefined ? [] : [{ label: "When you took office", value: round1(opening * 100), kind: "projected", at: OATH_AT }];
    const played = economyRecord(campaign).map((sample) => ({
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
export const ECONOMY_HISTORY_RATES = ["unemployment", "inflation", "growth"];
