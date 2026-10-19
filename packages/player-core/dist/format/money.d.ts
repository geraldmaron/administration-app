export type MoneyDisplay = {
    /** ISO-style three-letter code, as authored on the nation's identity. */
    readonly code: string;
    /** Units of this currency per one US dollar. Exactly 1 for the dollar itself. */
    readonly perUsd: number;
};
/** The canonical unit. Money is already stored this way, so it converts by identity. */
export declare const USD_DISPLAY: MoneyDisplay;
export type MoneyFormatter = (usdMillions: number) => string;
/**
 * A money figure, converted from the stored USD millions into the given display
 * (the dollar unless a caller passes another), and abbreviated to
 * trillions/billions/millions.
 */
export declare function formatMoney(usdMillions: number, display?: MoneyDisplay): string;
