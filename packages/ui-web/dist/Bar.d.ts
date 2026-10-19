import type { ReactNode } from "react";
/** `reading` is plain data (blue); `neutral` is a quiet gray for a reading that is not a verdict; good, watch and bad are the President's verdict. */
export type BarTone = "reading" | "neutral" | "good" | "watch" | "bad";
export type BarMark = {
    readonly at: number;
    readonly label: string;
};
export type BarProps = {
    /** Spoken in full, with the figure. Absent where the figure beside the bar already says it: the bar is then decoration. */
    readonly label?: string;
    /** 0..1 along the track. */
    readonly value: number;
    readonly tone?: BarTone;
    /** Ticks on the track: a threshold, the figure in force, a cap. */
    readonly marks?: readonly BarMark[];
    /** A lighter span from `from` to the value, so a move from a baseline reads as a distance. */
    readonly from?: number;
    /**
     * `fill` draws the track to the value; `level` draws it faint with a tick at
     * the reading; `shift` draws only the span between `from` and the value,
     * with a hollow dot where it began and a solid one where it ended.
     */
    readonly mode?: "fill" | "level" | "shift";
    /** 6px instead of 8px, for a bar set in running text or a table cell. */
    readonly slim?: boolean;
};
/** One flat, slim track filled to a value, with hairline ticks at what it is read against. */
export declare function Bar({ label, value, tone, marks, from, mode, slim }: BarProps): import("react").JSX.Element;
export type ShareSegment = {
    readonly id: string;
    readonly label: string;
    readonly share: number;
    readonly icon?: ReactNode;
    readonly figure: string;
    readonly tone?: "neutral";
};
/** A whole split into parts on one bar, each part named in a legend that carries its glyph and figure. */
export declare function ShareBar({ label, segments, shape }: {
    readonly label: string;
    readonly segments: readonly ShareSegment[];
    readonly shape?: "bar" | "ring";
}): import("react").JSX.Element;
export type BarRow = {
    readonly id: string;
    readonly label: ReactNode;
    /** A line under the label: what the reading is. */
    readonly note?: ReactNode;
    /** A glyph leading the label. */
    readonly icon?: ReactNode;
    /** 0..1 along the shared axis. */
    readonly value: number;
    /** The figure as it is read, in the last column: "62%", "$14.2B". */
    readonly figure: ReactNode;
    readonly tone?: BarTone;
    /** What a screen reader hears for the row when the visible text is not enough. */
    readonly spoken?: string;
    readonly marks?: readonly BarMark[];
};
export type BarRowsProps = {
    /** Names the group for a screen reader. */
    readonly label: string;
    readonly rows: readonly BarRow[];
    /** The label column's width, in CSS: "4.5rem". Defaults to a third of the row, clamped. */
    readonly labelWidth?: string;
    /** Rows sit in one framed surface (a card) rather than bare, for a standalone list. */
    readonly framed?: boolean;
    /** The figure takes the row's tone as ink, so a verdict reads in the number as well as the bar. */
    readonly figureInk?: boolean;
    readonly slim?: boolean;
};
/**
 * Labeled bars on one shared axis: the name (with its glyph) at the left, the
 * bar in the middle, the figure at the right, every column aligned across
 * rows so the eye reads straight down. Below a narrow width a row becomes its
 * label and figure over the full-width bar.
 */
export declare function BarRows({ label, rows, labelWidth, framed, figureInk, slim }: BarRowsProps): import("react").JSX.Element;
