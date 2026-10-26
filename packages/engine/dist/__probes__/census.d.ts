import type { Campaign } from "../state.js";
export type WorldCensus = {
    readonly seenChanges: ReadonlySet<string>;
    readonly coups: number;
    readonly elections: number;
    readonly otherChanges: number;
    readonly rosters: Readonly<Record<string, ReadonlySet<string>>>;
    readonly exits: Readonly<Record<string, number>>;
    readonly accessions: Readonly<Record<string, number>>;
    readonly vacantSeats: ReadonlySet<string>;
    readonly judicialVacancies: number;
};
/** The census before the first week: what the founding board already carries is not counted. */
export declare function startCensus(founded: Campaign): WorldCensus;
/** Fold one advanced week into the census. */
export declare function observeWeek(census: WorldCensus, campaign: Campaign): WorldCensus;
/**
 * Successful coups a year worldwide, the one band both the events and the
 * geopolitics probes assert. Powell and Thyne as read by the RAND Forecasting
 * Initiative put successes at about 1.65 a year for 1960 to 2023, with recent
 * years between 2 and 6 (search results only, not opened: both audits say so).
 * The engine records successful coups only, so attempts (about 6.6 a year) are
 * not a comparable denominator.
 */
export declare const COUPS_PER_YEAR: {
    readonly min: 0.5;
    readonly max: 8;
};
