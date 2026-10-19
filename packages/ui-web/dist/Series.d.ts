import type { GaugeTone } from "./Gauge";
export type SeriesProps = {
    readonly label: string;
    /** Oldest first. A missing observation is a gap, never zero. */
    readonly values: readonly (number | null)[];
    readonly domain?: readonly [number, number];
    readonly format: (value: number) => string;
    readonly splitAt?: number;
    readonly splitLabel?: string;
    readonly reference?: {
        readonly value: number;
        readonly label: string;
    };
    readonly tone?: GaugeTone;
    readonly unitLabel?: string;
    readonly timeRange?: readonly [string, string];
    readonly showDomain?: boolean;
    readonly compact?: boolean;
    readonly variant?: "line" | "area" | "step";
    /** Ordered numeric dates for unequal observation spacing. Omit for an indexed series. */
    readonly positions?: readonly number[];
    /** Recorded observation labels, not wall-clock time. Enables explicit finite replay. */
    readonly labels?: readonly string[];
    readonly interactive?: boolean;
    readonly selectedIndex?: number;
    readonly onIndexChange?: (index: number) => void;
};
/** A responsive trend or a detailed recorded history; replay never advances simulation time. */
export declare function Series(props: SeriesProps): import("react").JSX.Element;
