import { type Campaign, type MetricCost } from "@admin/engine";
import { type MarketLeverKey } from "./market-levers";
export type LeverColumnId = MarketLeverKey;
/** Weeks the outlook runs: the pump follows crude two to five weeks behind, so six reaches the gallon. */
export declare const LEVER_HORIZON_WEEKS = 6;
export type LeverOutlook = {
    readonly crude: number;
    readonly crudeFigure: string;
    /** Dollars a gallon. */
    readonly pump: number;
    readonly pumpFigure: string;
};
export type LeverColumn = {
    readonly id: LeverColumnId;
    /** The column's short name in the matrix. */
    readonly label: string;
    /** Why the law withholds it today; a refused lever is still read and compared. */
    readonly refusal?: string;
    /** What it does, in a sentence with its date. */
    readonly effect: string;
    /** What it costs now, one line per reading it spends. Empty is free. */
    readonly cost: readonly string[];
    readonly risks: readonly string[];
    /** Where crude and the pump stand after the outlook's weeks; absent for a refused lever. */
    readonly outlook?: LeverOutlook;
    /** The one verb that authorizes it. */
    readonly verb: string;
};
export type LeverComparison = {
    readonly horizonWeeks: number;
    readonly columns: readonly LeverColumn[];
    /** Where crude and the pump go with no lever pulled: the line every column's outlook is read against, never a column. */
    readonly untouched: LeverOutlook;
    /** What happens on its own: the Fed's next decision and the world market. */
    readonly waiting: string;
};
/** A metric cost, one line per reading it moves. */
export declare function costLines(cost: MetricCost): readonly string[];
/** Every market lever, each column priced and projected off the packet its commit applies, read against the markets left alone. */
export declare function leverComparison(campaign: Campaign): LeverComparison;
