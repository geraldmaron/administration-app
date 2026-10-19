import type { Campaign } from "./state.js";
/** December 2025 CPI-U weights, as fractions of all items. BLS-CPI-RI-2025 */
export declare const CPI_WEIGHTS: {
    readonly foodAtHome: number;
    readonly gasoline: number;
    readonly pipedGas: number;
    readonly electricity: number;
};
/** Weeks behind crude the pump follows: it starts moving in the second week and has caught up by the fifth. */
export declare const PUMP_LAG: {
    readonly from: 2;
    readonly to: 5;
};
/** Planning value: weeks behind the grain markets the grocery shelf follows, slower than fuel. */
export declare const GROCERY_LAG: {
    readonly from: 4;
    readonly to: 12;
};
/** Planning value: weeks behind the gas markets the heating and power bills follow. */
export declare const HOME_ENERGY_LAG: {
    readonly from: 2;
    readonly to: 8;
};
/** Planning value: an emergency fuel waiver takes this share off the part of the gallon that is not crude. */
export declare const FUEL_WAIVER_RELIEF = 0.02;
/** Dollars a gallon. Only crude's share of the anchor price moves. */
export declare function pumpPrice(crudeIndex: number): number;
export declare const GROCERY_GRAINS: readonly ["wheat", "corn", "soybeans"];
/**
 * Grocery bill as an index, 1 at the anchor. When grainIndex is omitted,
 * grain is the mean of the wheat, corn and soybean opening indexes.
 */
export declare function groceryIndex(grainIndex?: number): number;
/** Grocery move, in CPI points: the bill's percent change times the food-at-home weight. */
export declare function groceryCpiPoints(grainIndex?: number): number;
/** The heating and power bill as an index on the gas price, 1 when gas is at its reference. */
export declare function homeEnergyIndex(gasIndex: number): number;
/** Whether an emergency fuel waiver stands today. */
export declare function fuelWaiverStanding(campaign: Campaign): boolean;
/** The crude index the pump feels `back` weeks ago (negative: ahead): the lag's window slid by that many weeks. */
export declare function pumpCrude(campaign: Campaign, back?: number): number;
/** The price of a gallon today, crude read through the pump's lag. */
export declare function selectPumpPrice(campaign: Campaign): number;
/** What a gallon cost on the oath's opening level: the price the country remembers. */
export declare function oathPumpPrice(): number;
/** The grain index the grocery shelf feels this week. */
export declare function groceryGrain(campaign: Campaign): number;
/** The grocery bill against the oath's: 1.02 is two percent dearer than the week the term began. */
export declare function selectGroceryBill(campaign: Campaign): number;
/** The gas index the heating and power bills feel this week. */
export declare function homeGas(campaign: Campaign): number;
/** The heating and power bill against the oath's. */
export declare function selectHomeEnergyBill(campaign: Campaign): number;
export type PricePoint = {
    readonly week: number;
    readonly value: number;
    readonly ahead: boolean;
};
/** Dollars a gallon, week by week. */
export declare function pumpPriceSeries(campaign: Campaign): readonly PricePoint[];
/** The grocery bill against the oath's, week by week. */
export declare function groceryBillSeries(campaign: Campaign): readonly PricePoint[];
/** The heating and power bill against the oath's, week by week. */
export declare function homeEnergySeries(campaign: Campaign): readonly PricePoint[];
/** Planning value: a gallon this much dearer than it was `PUMP_SHOCK_WEEKS` earlier is a rise the country talks about. */
export declare const PUMP_SHOCK_RISE = 0.1;
export declare const PUMP_SHOCK_WEEKS = 8;
/**
 * Whether the pump price has climbed sharply over the last several weeks: the
 * front-page fact that makes the public weigh the economy more heavily. A rise
 * the country has lived with for longer than the window is priced as
 * inflation, not as news.
 */
export declare function pumpShock(campaign: Campaign): boolean;
