export type NationOilGasRow = {
    readonly nation: string;
    /** Thousand barrels a day. */
    readonly oilKbd: number;
    readonly oilYear: number;
    /** Billion cubic meters a year; absent where EIA reports none. */
    readonly gasBcm?: number;
    readonly gasYear?: number;
    /** Thousand barrels a day; absent where EIA reports none. */
    readonly crudeKbd?: number;
    readonly crudeYear?: number;
    readonly source: string;
    readonly opened: string;
};
export declare const NATION_OIL_GAS: readonly NationOilGasRow[];
/** One nation's row, absent where EIA reports no oil series for it. */
export declare function nationOilGas(nation: string): NationOilGasRow | undefined;
