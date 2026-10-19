import type { ReactNode } from "react";
import type { GaugeTone } from "./Gauge";
import { type IconName } from "./Icon";
export type StepsProps = {
    readonly label: string;
    readonly showBand?: boolean;
    /** How many steps are lit, 1..`steps`. */
    readonly lit: number;
    readonly steps?: number;
    /** The word for the step reached: "Strong", "Turned". */
    readonly word: string;
    /** `neutral` is a quiet gray for a reading that is not a verdict (how sure a read is). */
    readonly tone?: GaugeTone | "neutral";
    /** Where the row around it already says the label: spoken, not drawn. */
    readonly labelHidden?: boolean;
    readonly caption?: ReactNode;
    /** A glyph leading the label. */
    readonly icon?: IconName;
    /** `row` sets label, track and word on the columns of the enclosing `StepsTable`, so a group lines up. */
    readonly layout?: "stack" | "row";
};
/**
 * A reading that is a band, not a figure: a short run of segments lit up to
 * the step reached, with its word. Compact enough to stack two beside a
 * portrait. Optional numerals identify ordinal bands, never precise scores.
 */
export declare function Steps({ label, lit, steps, word, tone, labelHidden, caption, icon, layout, showBand }: StepsProps): import("react").JSX.Element;
/** A group of row-layout steps under one label, on shared columns. */
export declare function StepsTable({ label, children }: {
    readonly label: string;
    readonly children: ReactNode;
}): import("react").JSX.Element;
