export type PlotPoint = readonly [number, number];
/** The values' own range, padded, so a small move is still seen. */
export declare function fitDomain(values: readonly number[]): readonly [number, number];
/** Values, oldest first, as points across a `width` by `height` box inset by `pad`. */
export declare function plotValues(values: readonly number[], domain: readonly [number, number], width: number, height: number, pad: number): readonly PlotPoint[];
export declare const linePath: (pts: readonly PlotPoint[]) => string;
export type SparklineProps = {
    /** Oldest first, ending with now. Fewer than two draws nothing. */
    readonly values: readonly number[];
    /** Values before this index came before this administration and draw faint. */
    readonly splitAt?: number;
    /** Colors the line: the reading's standing, not its direction. */
    readonly valence?: "good" | "watch" | "bad" | "neutral";
};
/**
 * A reading's recent path at the size of a word, for a row that already says
 * the figure. Decorative: the row it sits in carries the value and the change.
 */
export declare function Sparkline({ values, splitAt, valence }: SparklineProps): import("react").JSX.Element;
