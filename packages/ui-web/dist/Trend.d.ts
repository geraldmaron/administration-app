import { type ReactNode } from "react";
import type { GaugeTone } from "./Gauge";
export type TrendDirection = "up" | "down" | "flat";
export type TrendProps = {
    readonly label: string;
    /** The reading now, as said: "$357B", "Strong". */
    readonly figure: string;
    /** Oldest first, ending with now. Fewer than two draws no line. */
    readonly values: readonly number[];
    /** The line's scale; defaults to the values' own range, padded, so a small move is seen. */
    readonly domain?: readonly [number, number];
    /** Values before this index came before this administration and draw faint. */
    readonly splitAt?: number;
    /** The move over the comparison period. `good` colors it; absent, it stays neutral. */
    readonly change?: {
        readonly text: string;
        readonly direction: TrendDirection;
        readonly good?: boolean;
        readonly period?: string;
    };
    readonly tone?: GaugeTone;
    readonly icon?: ReactNode;
    readonly caption?: ReactNode;
};
/**
 * A reading as a figure with its recent path: what it is, which way it is
 * going and how far, read at a glance. The line carries the shape; the
 * figure carries the value; the change says how much this period moved it.
 */
export declare function Trend({ label, figure, values, domain, splitAt, change, tone, icon, caption }: TrendProps): import("react").JSX.Element;
