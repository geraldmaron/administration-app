import { type Campaign, type DeficitDriver, type MacroDrivers, type MacroRate } from "@admin/engine";
export type FiscalDriversReading = {
    readonly deficit: readonly DeficitDriver[];
    readonly rates: MacroDrivers;
};
export declare function fiscalDrivers(campaign: Campaign): FiscalDriversReading;
/**
 * One part of a figure, in words, with its amount as the room prints it and
 * as a signed number in the row's own unit, so a screen can draw it against
 * its siblings.
 */
export type DriverRow = {
    readonly source: string;
    readonly label: string;
    readonly figure: string;
    readonly amount: number;
};
/**
 * One rate's parts. They sum to where the rate is heading, not to where it
 * stands: a rate closes part of the distance each week, so the two differ while
 * it travels, and the reading says both.
 */
export type RateDriverReading = {
    readonly rate: MacroRate;
    readonly rows: readonly DriverRow[];
    /** Where the parts sum to. */
    readonly heading: string;
    /** Where the rate stands this week. */
    readonly now: string;
};
export declare function rateDriverReadings(campaign: Campaign): readonly RateDriverReading[];
/** The year's balance, part by part, and the balance its parts sum to. */
export type DeficitDriverReading = {
    readonly rows: readonly DriverRow[];
    readonly balance: string;
};
export declare function deficitDriverReading(campaign: Campaign): DeficitDriverReading | undefined;
