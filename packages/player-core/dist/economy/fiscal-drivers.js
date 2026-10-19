import { selectDeficitDrivers, selectFiscalStatement, selectMacroDrivers, selectNation, } from "@admin/engine";
import { formatMoney } from "../format/money";
export function fiscalDrivers(campaign) {
    return {
        deficit: selectDeficitDrivers(campaign),
        rates: selectMacroDrivers(campaign, campaign.founding.nation),
    };
}
const RATE_SOURCE_LABELS = {
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
const DEFICIT_SOURCE_LABELS = {
    inherited: "The budget you inherited",
    cycle: "The business cycle",
    program: "Your current policies",
    laws: "Laws passed since you took office",
    orders: "Your orders",
    world: "Wars and unrest",
    interest: "Interest on the debt",
    limit: "Payments held back",
};
const RATE_ORDER = ["growth", "inflation", "unemployment"];
/**
 * A part of a rate to a tenth of a point, signed. Whole percents rounded every
 * part under half a point to nothing, so two years of a program read "0%".
 */
function signedPoints(fraction) {
    const tenths = Math.round(Math.abs(fraction) * 1000) / 10;
    if (tenths === 0)
        return "0.0 pts";
    return `${fraction > 0 ? "+" : "−"}${tenths.toFixed(1)} pts`;
}
function percentOne(fraction) {
    const tenths = Math.round(Math.abs(fraction) * 1000) / 10;
    return `${fraction < 0 && tenths !== 0 ? "−" : ""}${tenths.toFixed(1)}%`;
}
export function rateDriverReadings(campaign) {
    const economy = selectNation(campaign, campaign.founding.nation)?.stats.economy;
    if (!economy)
        return [];
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
export function deficitDriverReading(campaign) {
    const { deficit } = fiscalDrivers(campaign);
    if (deficit.length === 0)
        return undefined;
    return {
        rows: deficit.map((driver) => ({ source: driver.source, label: DEFICIT_SOURCE_LABELS[driver.source], figure: `${formatMoney(driver.amount)} a year`, amount: driver.amount })),
        balance: `${formatMoney(selectFiscalStatement(campaign).balance)} a year`,
    };
}
