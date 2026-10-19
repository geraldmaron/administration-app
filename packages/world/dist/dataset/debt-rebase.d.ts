export type DebtRebaseRow = {
    readonly nation: string;
    /** Public debt over GDP. */
    readonly ratio: number;
    readonly source: string;
    readonly opened: string;
};
export declare const DEBT_REBASE: readonly DebtRebaseRow[];
/** A record carrying the figures a rebase reads and writes. */
type Rebased = {
    readonly id: string;
    readonly stats: {
        readonly economy: {
            readonly gdp: number;
            readonly debt: number;
            readonly costOfLiving?: number;
        };
    };
};
/**
 * The roster with each rebased nation's stock set to its sourced ratio, on the
 * same identity the ratio is read back through (debt over output at its price
 * level). The identity while the table is empty; a nation with no row keeps its
 * vendored stock.
 */
export declare function applyDebtRebase<T extends Rebased>(nations: readonly T[], table?: readonly DebtRebaseRow[]): readonly T[];
export {};
