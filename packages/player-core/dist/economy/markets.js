import { COMMODITY_DEFS, COMMODITY_FAMILIES, COMMODITY_IDS, commodityShocks, selectNation, supplierShares, CRASH_DROP, commodityAnchor, commoditiesIn, fedChair, groceryBillSeries, homeEnergySeries, isAnchored, marketQuote, nextFomcDecision, oathPumpPrice, pumpPriceSeries, referenceIndex, selectCommodities, selectEquityLevel, selectEquitySeries, selectGroceryBill, selectHomeEnergyBill, selectMarketShock, selectPumpPrice, fuelWaiverStanding, } from "@admin/engine";
import { formatDate } from "../format/figures";
import { place } from "../navigation/places";
export const FAMILY_LABELS = {
    crude: "Crude oil",
    gas: "Natural gas",
    grains: "Grains",
    fertilizer: "Fertilizer",
    metals: "Industrial metals",
    minerals: "Critical minerals",
};
export const READER_LABELS = {
    pump: "Shows up in gas prices",
    grocery: "Shows up in the grocery bill",
    "home-energy": "Shows up in heating and power bills",
    "farm-costs": "Shows up in farm costs, and later in the harvest",
    "factory-inputs": "Shows up in factory costs and output",
    "defense-tech": "Shows up in defense and technology production",
};
const signedPercent = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(Math.round(value * 1000) / 10).toFixed(1)}%`;
/** A move against the oath as a stance: dearer is worse for the household reading it. */
function stanceOfRise(rise) {
    if (rise >= 0.15)
        return "adverse";
    if (rise >= 0.05)
        return "caution";
    if (rise <= -0.05)
        return "favorable";
    return "neutral";
}
const weekLabel = (week) => (week === 0 ? "Oath" : `Week ${week}`);
/** A commodity at an index level, said as a price where a sourced anchor stands behind it and as an index where none does. */
export function commodityPriceFigure(id, index) {
    if (!isAnchored(id))
        return `Index ${index.toFixed(2)}`;
    const anchor = commodityAnchor(id);
    const unit = anchor.unit === "usd_per_barrel" ? "a barrel" : "a bushel";
    return `$${(anchor.usd * index).toFixed(2)} ${unit}`;
}
function provenanceOf(id) {
    if (!isAnchored(id))
        return "A scale that starts at 1 when you took office. It isn't tied to a real-world price.";
    const anchor = commodityAnchor(id);
    return `Priced on ${anchor.series}, ${anchor.period} (${anchor.usd} as 1.00). The starting level is an estimate from an official forecast, not a measured price.`;
}
function commodityRow(campaign, id) {
    const reading = selectCommodities(campaign).find((entry) => entry.id === id);
    const reference = referenceIndex(id);
    const rise = reading.index / reference - 1;
    const values = [reference, ...reading.series];
    return {
        id,
        name: COMMODITY_DEFS[id].name,
        reader: READER_LABELS[COMMODITY_DEFS[id].reader],
        figure: commodityPriceFigure(id, reading.index),
        sinceOath: `${signedPercent(rise)} since the oath`,
        changeDirection: rise > 0 ? "up" : rise < 0 ? "down" : "flat",
        stance: stanceOfRise(rise),
        points: values.map((value, week) => ({ label: weekLabel(week), value, at: week, kind: "played" })),
        ...(reading.cause ? { cause: reading.cause } : {}),
        stocks: marketQuote(campaign, id).inventory,
        provenance: provenanceOf(id),
    };
}
/** Every commodity by family, the order the registry keeps them in. */
export function commodityBoard(campaign) {
    return COMMODITY_FAMILIES.map((family) => ({ family, label: FAMILY_LABELS[family], rows: commoditiesIn(family).map((id) => commodityRow(campaign, id)) }));
}
function pointsOf(series, scale = 1) {
    return series.map((point) => ({
        label: point.ahead ? `Week ${point.week}, already set` : weekLabel(point.week),
        value: Math.round(point.value * scale * 1000) / 1000,
        at: point.week,
        kind: point.ahead ? "projected" : "played",
    }));
}
/** The pump price, the grocery bill and the heating and power bill, each with the weeks its lag has already decided. */
export function householdReadings(campaign) {
    const pump = selectPumpPrice(campaign);
    const pumpRise = pump / oathPumpPrice() - 1;
    const grocery = selectGroceryBill(campaign) - 1;
    const home = selectHomeEnergyBill(campaign) - 1;
    return [
        {
            key: "pump",
            label: fuelWaiverStanding(campaign) ? "Gas prices, with an emergency fuel waiver" : "Gas prices",
            figure: `$${pump.toFixed(2)} a gallon`,
            sinceOath: `${signedPercent(pumpRise)} since the oath`,
            stance: stanceOfRise(pumpRise),
            points: pointsOf(pumpPriceSeries(campaign)),
            lag: "Follows crude oil prices 2 to 5 weeks later. Next week's gas has already been bought.",
            unit: "dollars a gallon",
            href: place.metric("inflation"),
        },
        {
            key: "grocery",
            label: "The grocery bill",
            figure: signedPercent(grocery),
            sinceOath: "compared with the week you took office",
            stance: stanceOfRise(grocery * 4),
            points: pointsOf(groceryBillSeries(campaign), 100),
            lag: "Follows grain prices 4 to 12 weeks later. How much of the food bill comes from crops is an estimate.",
            unit: "100 when you took office",
            href: place.metric("inflation"),
        },
        {
            key: "home-energy",
            label: "Heating and power bills",
            figure: signedPercent(home),
            sinceOath: "compared with the week you took office",
            stance: stanceOfRise(home * 2),
            points: pointsOf(homeEnergySeries(campaign), 100),
            lag: "Follows natural gas prices 2 to 8 weeks later. How much gas prices change a power bill is an estimate.",
            unit: "100 when you took office",
            href: place.metric("inflation"),
        },
    ];
}
/** The stock index against its own trend, 100 at the oath, with the week's crash line. */
export function equityReading(campaign) {
    const series = selectEquitySeries(campaign);
    const level = selectEquityLevel(campaign);
    const previous = series.at(-2) ?? level;
    const move = level / previous - 1;
    const shock = selectMarketShock(campaign);
    return {
        level,
        figure: `${Math.round(level * 1000) / 10}`,
        weekMove: `${signedPercent(move)} this week`,
        stance: shock ? "adverse" : move <= -0.03 ? "caution" : move >= 0.03 ? "favorable" : "neutral",
        points: series.map((value, week) => ({ label: weekLabel(week), value: Math.round(value * 1000) / 10, at: week, kind: "played" })),
        crashLine: Math.round(previous * (1 - CRASH_DROP) * 1000) / 10,
        crashed: shock !== undefined,
    };
}
function leanWords(tilt) {
    if (tilt >= 0.05)
        return "Cares more about keeping prices down than about jobs";
    if (tilt <= -0.05)
        return "Cares more about jobs than about keeping prices down";
    return "Cares about prices and jobs about equally";
}
const yearsOf = (date) => date.year + (date.month - 1) / 12 + (date.day - 1) / 365;
// A meeting can be filed twice on one date (the opening week records the
// seeded decision and then the week's own); only the later one stood, and a
// chart that drew both put a vertical jump at its left edge.
function lastPerDate(meetings) {
    return meetings.filter((meeting, index) => {
        const next = meetings[index + 1];
        return !next || next.date.year !== meeting.date.year || next.date.month !== meeting.date.month || next.date.day !== meeting.date.day;
    });
}
/** The Federal Reserve as the President reads it: the rate, the chair, the next meeting and the steps so far. */
export function fedReading(campaign) {
    const fed = campaign.markets?.fed;
    const rate = fed?.rate ?? campaign.macro?.[campaign.founding.nation]?.policyRate ?? 0;
    const pressure = fed?.pressure;
    return {
        rate: `${(rate * 100).toFixed(2)}%`,
        chair: fedChair(campaign)?.base.name ?? "No Fed chair in office",
        lean: leanWords(fed?.chairTilt ?? 0),
        nextMeeting: formatDate(nextFomcDecision(campaign.calendar)),
        steps: lastPerDate(fed?.meetings ?? []).map((meeting) => ({
            date: formatDate(meeting.date),
            at: yearsOf(meeting.date),
            rate: Math.round(meeting.rate * 10_000) / 100,
            target: Math.round(meeting.target * 10_000) / 100,
        })),
        ...(pressure ? { pressure: pressure.bound < 0 ? "You've pressed the Fed to cut rates before its next meeting." : "You've pressed the Fed to hold rates steady before its next meeting." } : {}),
    };
}
/** Where a commodity is read in full. */
export function commodityHref(id) {
    return place.metric(id);
}
/** Where the Federal Reserve is read in full. */
export const FED_HREF = place.metric("policy-rate");
export function isCommodityKey(id) {
    return COMMODITY_IDS.includes(id);
}
/** One commodity in full: its line, what moves it this week, who supplies it and what goes into it. */
export function commodityDetail(campaign, id) {
    const def = COMMODITY_DEFS[id];
    return {
        row: commodityRow(campaign, id),
        ...(["pump", "grocery", "home-energy"].includes(def.reader) ? { exposureHref: `${place.economy()}#economy-household` } : {}),
        family: FAMILY_LABELS[def.family],
        shocks: commodityShocks(campaign, id).map((shock) => ({
            cause: shock.cause,
            share: shock.loss < 0 ? `adds ${Math.round(-shock.loss * 1000) / 10}% of world supply` : `${Math.round(shock.loss * 1000) / 10}% of world supply${shock.risk > 0 ? ", plus extra cost for the risk" : ""}`,
        })),
        suppliers: [...supplierShares(id)]
            .sort((a, b) => b.share - a.share)
            .map((row) => ({ nation: row.nation, name: selectNation(campaign, row.nation)?.base.identity.name ?? row.nation, share: row.share })),
        inputs: def.inputs.map((input) => ({ id: input.from, lagWeeks: input.lagWeeks, text: `${COMMODITY_DEFS[input.from].name}, felt about ${input.lagWeeks} weeks later` })),
    };
}
