import type { ReactNode } from "react";
/**
 * Which anchor carries the needle:
 * - reading: a neutral measure (blue).
 * - identity: the President's own standing (gold).
 * - risk: a reading where high is danger, such as removal pressure (red).
 */
/** Reading is neutral data; identity is the institution; good, watch and bad say whether the reading is in the President's favor (risk is bad, kept for callers that name it). */
export type GaugeTone = "reading" | "identity" | "risk" | "good" | "watch" | "bad";
export type GaugeMark = {
    readonly at: number;
    readonly label: string;
};
export type GaugeProps = {
    readonly label: string;
    /** 0..1. Values outside are drawn at the end of the scale and said as they are. */
    readonly value: number;
    /** What a screen reader hears, and the figure under the dial: "48%", "Strong". */
    readonly valueText: string;
    readonly tone?: GaugeTone;
    /** Thresholds drawn as ticks on the scale: a majority, a removal line. */
    readonly marks?: readonly GaugeMark[];
    /** `dial` for a headline reading, `meter` for a row in a list. */
    readonly shape?: "dial" | "meter" | "ring";
    readonly caption?: ReactNode;
    /** Where a row or a column header already names the reading: the label is spoken, not drawn. */
    readonly labelHidden?: boolean;
    /** For a meter in a narrow cell: the label and figure share the first line and the track runs full width under them. */
    readonly stacked?: boolean;
};
/** A reading drawn on a scale, so its size is seen before its number is read. */
export declare function Gauge({ label, value, valueText, tone, marks, shape, caption, labelHidden, stacked }: GaugeProps): import("react").JSX.Element;
