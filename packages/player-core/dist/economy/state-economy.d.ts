import { type Campaign } from "@admin/engine";
import { type StateId } from "@admin/world";
export type StateEconomyRow = {
    readonly state: StateId;
    readonly name: string;
    /** Unemployment this week, 0..1: the country's rate plus the state's standing gap. */
    readonly unemployment: number;
    /** The state's unemployment less the country's, in rate units; positive is more out of work. */
    readonly jobsGap: number;
    /** Cost of living against the country's, as a fraction: 0.18 is 18% dearer. */
    readonly pricesGap: number;
    /** Gross state product this week, USD millions. */
    readonly output: number;
    /** The state's share of national output. */
    readonly outputShare: number;
    /** The share of state income that comes through federal outlays. */
    readonly federalDependence: number;
};
export type StateEconomyBoard = {
    /** The country's own unemployment this week, the line every state's gap is read against. */
    readonly nationalUnemployment: number;
    readonly rows: readonly StateEconomyRow[];
};
/** Every state's economy this week, in `STATE_IDS` order. Empty for a campaign that governs no nation. */
export declare function stateEconomyBoard(campaign: Campaign): StateEconomyBoard;
