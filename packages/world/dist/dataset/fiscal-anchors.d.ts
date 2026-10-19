export type FiscalAnchorFigure = {
    readonly value: number;
    readonly year: number;
};
export type FiscalAnchor = {
    /** The agencies' average foreign-currency notch, 1 (default) to 21 (AAA). */
    readonly rating?: FiscalAnchorFigure;
    /** Debt in foreign currency, as a share of the total. */
    readonly foreignCurrencyShare?: FiscalAnchorFigure;
    /** Interest over gross debt, as a fraction a year. */
    readonly effectiveRate?: FiscalAnchorFigure;
    readonly maturityYears?: FiscalAnchorFigure;
};
export declare const FISCAL_ANCHORS_FETCHED = "2026-09-24";
export declare const FISCAL_ANCHOR_SOURCE = "World Bank Prospects Group, A Cross-Country Database of Fiscal Space (https://thedocs.worldbank.org/en/doc/31a9f7ffd7c72b9fbed93f3fb79af70a-0050012026/original/Fiscal-space-data.xlsx), CC BY 4.0 \u2014 Kose, Kurlat, Ohnsorge and Sugawara (2022), Journal of International Money and Finance 128: 102682";
export declare const FISCAL_ANCHORS: Readonly<Record<string, FiscalAnchor>>;
