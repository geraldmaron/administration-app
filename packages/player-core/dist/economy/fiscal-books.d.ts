import { type BooksChange, type BooksOpening, type Campaign, type DebtLimitReading, type Effect, type FiscalCost, type MacroState, type NationBooks, type PolicySet, type SovereignReading } from "@admin/engine";
/** What the engine keeps that the books are drawn from. */
export type FiscalBooksInputs = {
    readonly books: NationBooks | undefined;
    readonly sovereign: SovereignReading | undefined;
    readonly macro: MacroState | undefined;
    readonly limit: DebtLimitReading;
};
export type FiscalBooksReading = {
    /** Debt held by the public over output. */
    readonly debtToGdp: number;
    /**
     * How far the ratio moves over the coming year on the path it is on, the
     * same projection the ten-year path draws. The engine keeps no year-ago
     * ratio, so the change a President can be shown is the one ahead of them.
     */
    readonly debtToGdpComingYear: number;
    /** The year's balance in USD millions; negative is a deficit. */
    readonly balance: number;
    /** Interest as a share of revenue. */
    readonly interestShare: number;
    readonly sovereign: SovereignReading;
    readonly limit: DebtLimitReading;
    /** How far the books moved over the past year; absent while the trail does not reach back a year. */
    readonly yearChange?: BooksChange;
    /** What the books opened on at the oath. */
    readonly opening?: BooksOpening;
};
export declare function fiscalBooks(campaign: Campaign): FiscalBooksReading | undefined;
/** One point of a series FiscalBooks draws: the period, the value, and the value as the room prints it. */
export type FiscalPathPoint = {
    readonly label: string;
    readonly value: number;
    readonly figure: string;
};
/** The ten-year debt-to-output path, as `FiscalBooks`' series prop wants it. */
export declare function fiscalPath(campaign: Campaign): readonly FiscalPathPoint[];
/** The year's balance, as `FiscalBooks`' series prop wants it; negative is a deficit. */
export declare function fiscalBalanceSeries(campaign: Campaign): readonly FiscalPathPoint[];
/** This year's revenue by source, as `FiscalBooks`' series prop wants it. */
export declare function fiscalRevenueSeries(campaign: Campaign): readonly FiscalPathPoint[];
/** This year's outlays by function, as `FiscalBooks`' series prop wants it. */
export declare function fiscalOutlaySeries(campaign: Campaign): readonly FiscalPathPoint[];
/** What a program or an act the President has not taken would add to the books. */
export type FiscalPreviewReading = {
    readonly cost: FiscalCost;
    /** The push it would give demand, as a fraction of output. */
    readonly impulse: number;
    /** The weeks the push is spent over. */
    readonly fadeWeeks: number;
    /** Years the drafted public-investment program takes to reach demand in full, when it is what the draft moves to. */
    readonly spentOverYears?: number;
};
/**
 * The fiscal price of a draft, for the preview beside it: nothing where it
 * would add nothing, so a price row is drawn only where there is a price.
 *
 * A drafted stance is priced as the policy effect that would adopt it, through
 * the same statement the week's settlement books, so a program's row states
 * what it adds to the deficit rather than the zero an act-only reading gave it.
 */
export declare function fiscalPreview(campaign: Campaign, draft: Partial<PolicySet>, effects: readonly Effect[]): FiscalPreviewReading | undefined;
