import { type Campaign } from "@admin/engine";
export type EconomyHistoryRate = "unemployment" | "inflation" | "growth";
export type EconomyHistoryPoint = {
    readonly label: string;
    /** Percent, as the agencies print it. */
    readonly value: number;
    readonly kind: "recorded" | "projected" | "played";
    /** Years, fractional: where the point sits in time. */
    readonly at: number;
};
export type EconomyHistory = {
    readonly rate: EconomyHistoryRate;
    /** Chart-coordinate distance covered by one observed week. */
    readonly unitsPerWeek: number;
    readonly label: string;
    readonly points: readonly EconomyHistoryPoint[];
    /** Who published the recorded stretch, and where it was read. */
    readonly source: string;
};
/** One rate's recorded, projected and played stretches, oldest first. */
export declare function economyHistory(campaign: Campaign, rate: EconomyHistoryRate): EconomyHistory;
export declare const ECONOMY_HISTORY_RATES: readonly EconomyHistoryRate[];
