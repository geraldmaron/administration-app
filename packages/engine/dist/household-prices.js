/**
 * The pump price, the grocery bill and the home energy bill as readings of
 * the commodity indexes. Derived every time they are read, never stored.
 *
 * Opening levels are forecasts used as planning values. This module does not
 * write inflation or approval: `commodity-pressure.ts` reads the same
 * readings to set the price pressure, so the figure a household sees and the
 * figure the economy feels are one computation.
 */
import { PRICE_ANCHORS, PRICE_SHARES } from "@admin/world";
import { laggedIndex, openingCommodityIndex } from "./commodities.js";
import { referenceIndex } from "./commodity-registry.js";
import { compareDates } from "./clock.js";
function sharePublished(reading, component, period) {
    const row = PRICE_SHARES.find((entry) => entry.reading === reading && entry.component === component && entry.period === period);
    if (!row)
        throw new Error(`price-shares.tsv has no ${reading}/${component} for ${period}`);
    return row.share;
}
/** EIA 2025 average retail price for regular gasoline, dollars a gallon. */
const PUMP_ANCHOR_USD = PRICE_ANCHORS.find((row) => row.commodity === "gasoline" && row.period === "2025")?.value ?? 3.1;
/** Crude's share of that 2025 gallon, the one component every read of the EIA page agreed on. The rest of the gallon is held. */
const CRUDE_SHARE = sharePublished("gasoline_price", "crude_oil", "2025_annual_avg");
/** USDA 2024 food-at-home farm share: 18.5 cents of the dollar. */
const FOOD_AT_HOME_FARM_SHARE = sharePublished("food_dollar", "farm_share_food_at_home", "2024");
/**
 * Planning value. Crops are 37% of the farm-production industry group
 * (2.5 of 6.7 cents). That series is not the food-at-home split.
 */
const CROP_SHARE_OF_FARM = 0.37;
/** December 2025 CPI-U weights, as fractions of all items. BLS-CPI-RI-2025 */
export const CPI_WEIGHTS = {
    foodAtHome: sharePublished("cpi_relative_importance", "food_at_home", "2025-12"),
    gasoline: sharePublished("cpi_relative_importance", "gasoline_all_types", "2025-12"),
    pipedGas: sharePublished("cpi_relative_importance", "utility_piped_gas_service", "2025-12"),
    electricity: sharePublished("cpi_relative_importance", "electricity", "2025-12"),
};
/** Planning value: the share of an electricity bill that moves with the price of gas. */
const GAS_IN_POWER = 0.4;
/** Weeks behind crude the pump follows: it starts moving in the second week and has caught up by the fifth. */
export const PUMP_LAG = { from: 2, to: 5 };
/** Planning value: weeks behind the grain markets the grocery shelf follows, slower than fuel. */
export const GROCERY_LAG = { from: 4, to: 12 };
/** Planning value: weeks behind the gas markets the heating and power bills follow. */
export const HOME_ENERGY_LAG = { from: 2, to: 8 };
/** Planning value: an emergency fuel waiver takes this share off the part of the gallon that is not crude. */
export const FUEL_WAIVER_RELIEF = 0.02;
/** Dollars a gallon. Only crude's share of the anchor price moves. */
export function pumpPrice(crudeIndex) {
    return PUMP_ANCHOR_USD * CRUDE_SHARE * crudeIndex + PUMP_ANCHOR_USD * (1 - CRUDE_SHARE);
}
export const GROCERY_GRAINS = ["wheat", "corn", "soybeans"];
function openingGrainIndex() {
    return GROCERY_GRAINS.reduce((sum, id) => sum + openingCommodityIndex(id), 0) / GROCERY_GRAINS.length;
}
/**
 * Grocery bill as an index, 1 at the anchor. When grainIndex is omitted,
 * grain is the mean of the wheat, corn and soybean opening indexes.
 */
export function groceryIndex(grainIndex = openingGrainIndex()) {
    return 1 + FOOD_AT_HOME_FARM_SHARE * CROP_SHARE_OF_FARM * (grainIndex - 1);
}
/** Grocery move, in CPI points: the bill's percent change times the food-at-home weight. */
export function groceryCpiPoints(grainIndex = openingGrainIndex()) {
    return (groceryIndex(grainIndex) - 1) * 100 * CPI_WEIGHTS.foodAtHome;
}
/** The heating and power bill as an index on the gas price, 1 when gas is at its reference. */
export function homeEnergyIndex(gasIndex) {
    const gas = CPI_WEIGHTS.pipedGas * gasIndex;
    const power = CPI_WEIGHTS.electricity * (1 + GAS_IN_POWER * (gasIndex - 1));
    return (gas + power) / (CPI_WEIGHTS.pipedGas + CPI_WEIGHTS.electricity);
}
/** Whether an emergency fuel waiver stands today. */
export function fuelWaiverStanding(campaign) {
    const waiver = campaign.markets?.fuelWaiver;
    return waiver !== undefined && compareDates(campaign.calendar, waiver.until) <= 0;
}
function waived(price, standing) {
    return standing ? price - PUMP_ANCHOR_USD * (1 - CRUDE_SHARE) * FUEL_WAIVER_RELIEF : price;
}
/** The crude index the pump feels `back` weeks ago (negative: ahead): the lag's window slid by that many weeks. */
export function pumpCrude(campaign, back = 0) {
    return laggedIndex(campaign, "crude", PUMP_LAG.from + back, PUMP_LAG.to + back);
}
/** The price of a gallon today, crude read through the pump's lag. */
export function selectPumpPrice(campaign) {
    return waived(pumpPrice(pumpCrude(campaign)), fuelWaiverStanding(campaign));
}
/** What a gallon cost on the oath's opening level: the price the country remembers. */
export function oathPumpPrice() {
    return pumpPrice(referenceIndex("crude"));
}
/** The grain index the grocery shelf feels this week. */
export function groceryGrain(campaign) {
    return GROCERY_GRAINS.reduce((sum, id) => sum + laggedIndex(campaign, id, GROCERY_LAG.from, GROCERY_LAG.to), 0) / GROCERY_GRAINS.length;
}
/** The grocery bill against the oath's: 1.02 is two percent dearer than the week the term began. */
export function selectGroceryBill(campaign) {
    return groceryIndex(groceryGrain(campaign)) / groceryIndex(openingGrainIndex());
}
/** The gas index the heating and power bills feel this week. */
export function homeGas(campaign) {
    const gas = laggedIndex(campaign, "natural-gas", HOME_ENERGY_LAG.from, HOME_ENERGY_LAG.to);
    const lng = laggedIndex(campaign, "lng", HOME_ENERGY_LAG.from, HOME_ENERGY_LAG.to);
    return (gas + lng) / 2;
}
/** The heating and power bill against the oath's. */
export function selectHomeEnergyBill(campaign) {
    return homeEnergyIndex(homeGas(campaign));
}
/**
 * A household reading week by week, over the weeks the markets record still
 * keeps, to the last week its lag has already decided: a price set by markets
 * already traded is known before its week arrives, and those weeks are marked
 * ahead. Each point is numbered by its week of the term, so once the record
 * has dropped its oldest weeks the axis still counts from the oath rather than
 * from the oldest week kept.
 */
function readingSeries(campaign, lagFrom, read) {
    const recorded = campaign.markets?.commodities.crude?.series?.length ?? 0;
    const elapsed = Math.max(recorded, campaign.turn - 1);
    const points = [];
    for (let back = recorded; back >= -(lagFrom - 1); back -= 1)
        points.push({ week: elapsed - back, value: read(back), ahead: back < 0 });
    return points;
}
/** Dollars a gallon, week by week. */
export function pumpPriceSeries(campaign) {
    const standing = fuelWaiverStanding(campaign);
    return readingSeries(campaign, PUMP_LAG.from, (back) => waived(pumpPrice(pumpCrude(campaign, back)), standing));
}
/** The grocery bill against the oath's, week by week. */
export function groceryBillSeries(campaign) {
    const opening = groceryIndex(openingGrainIndex());
    return readingSeries(campaign, GROCERY_LAG.from, (back) => {
        const grain = GROCERY_GRAINS.reduce((sum, id) => sum + laggedIndex(campaign, id, GROCERY_LAG.from + back, GROCERY_LAG.to + back), 0) / GROCERY_GRAINS.length;
        return groceryIndex(grain) / opening;
    });
}
/** The heating and power bill against the oath's, week by week. */
export function homeEnergySeries(campaign) {
    return readingSeries(campaign, HOME_ENERGY_LAG.from, (back) => {
        const gas = laggedIndex(campaign, "natural-gas", HOME_ENERGY_LAG.from + back, HOME_ENERGY_LAG.to + back);
        const lng = laggedIndex(campaign, "lng", HOME_ENERGY_LAG.from + back, HOME_ENERGY_LAG.to + back);
        return homeEnergyIndex((gas + lng) / 2);
    });
}
/** Planning value: a gallon this much dearer than it was `PUMP_SHOCK_WEEKS` earlier is a rise the country talks about. */
export const PUMP_SHOCK_RISE = 0.1;
export const PUMP_SHOCK_WEEKS = 8;
/**
 * Whether the pump price has climbed sharply over the last several weeks: the
 * front-page fact that makes the public weigh the economy more heavily. A rise
 * the country has lived with for longer than the window is priced as
 * inflation, not as news.
 */
export function pumpShock(campaign) {
    const now = pumpPrice(pumpCrude(campaign));
    const before = pumpPrice(pumpCrude(campaign, PUMP_SHOCK_WEEKS));
    return now >= before * (1 + PUMP_SHOCK_RISE);
}
