import type { Campaign } from "@admin/engine";
export type TradeBalanceReading = {
    readonly imports: number;
    readonly exports: number;
    /** Exports less imports; negative is a deficit. */
    readonly balance: number;
};
export declare function tradeBalance(campaign: Campaign): TradeBalanceReading;
