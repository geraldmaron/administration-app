import type { ReactNode } from "react";
import { type IconName } from "./Icon";
export type StatDirection = "up" | "down" | "flat";
export type StatTone = "good" | "watch" | "bad" | "neutral";
export type StatProps = {
    readonly label: ReactNode;
    /** The reading, already formatted: "48%", "$1.9T", "Week 1". */
    readonly value: ReactNode;
    /** The change over the comparison period, already formatted: "+2 pts". */
    readonly delta?: {
        readonly text: string;
        readonly direction: StatDirection;
        /** Whether the change helps the President. Set this, or `better`; with neither, the arrow is plain blue up and red down. */
        readonly tone?: StatTone;
        /** Which direction is good for this reading (a deficit is better down); the tone follows from the move. */
        readonly better?: "up" | "down";
    };
    /** What the change is measured against: "since last week". */
    readonly period?: ReactNode;
    /** A drawn reading beside the figure: a gauge or a series. */
    readonly reading?: ReactNode;
    /** A word or a name rather than a figure: drawn at reading size so it wraps instead of overflowing. */
    readonly compact?: boolean;
    /** `heading` sets the figure at panel-heading size, for a row of several headline readings. */
    readonly size?: "figure" | "heading";
    /** A glyph leading the label. */
    readonly icon?: IconName;
    /** Compact value/chart comparison used by working dashboards. */
    readonly layout?: "stacked" | "comparison";
    readonly tone?: StatTone;
    readonly heading?: boolean;
    readonly className?: string;
};
/** One reading: its name, its figure, how it moved and against what. */
export declare function Stat({ label, value, delta, period, reading, compact, size, icon, layout, tone, heading, className }: StatProps): import("react").JSX.Element;
/** Several readings divided inside one surface, so a row of figures is one object rather than a row of cards. */
export declare function StatRow({ children, layout, as: Element, className }: {
    readonly children: ReactNode;
    readonly layout?: "comparison";
    readonly as?: "div" | "ul";
    readonly className?: string;
}): import("react").JSX.Element;
