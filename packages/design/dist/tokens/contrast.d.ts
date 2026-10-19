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
