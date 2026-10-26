export type Rgb = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
};
export declare function parseHex(hex: string): Rgb;
/** WCAG relative luminance, 0 (black) to 1 (white). */
export declare function relativeLuminance(hex: string): number;
/** WCAG contrast ratio between two opaque colors, 1:1 to 21:1. */
export declare function contrastRatio(foreground: string, background: string): number;
export declare const AA_NORMAL_TEXT = 4.5;
export declare const AA_NON_TEXT = 3;
/** WCAG 2.1 AAA for normal text: what the contrast themes hold every text pair to. */
export declare const AAA_NORMAL_TEXT = 7;
/**
 * A translucent `#RRGGBBAA` color as it renders over an opaque ground, so a
 * wash or a selection tint is measured as the eye sees it. Opaque colors pass
 * through unchanged.
 */
export declare function composite(color: string, ground: string): string;
