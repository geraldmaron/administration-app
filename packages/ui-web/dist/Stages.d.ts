import type { ReactNode } from "react";
export type StageState = "done" | "now" | "ahead" | "ended";
export type Stage = {
    readonly id: string;
    readonly label: string;
    readonly state: StageState;
    /** A line under the label: the date it happened, or that none is set. */
    readonly note?: ReactNode;
};
export type StagesProps = {
    /** Names the run for a screen reader: "Where it stands: Signed". */
    readonly label: string;
    readonly stages: readonly Stage[];
};
/**
 * Where a thing stands on its way somewhere: each stage a mark on one rule,
 * the ones passed filled and joined, the one it waits at emphasized, an
 * ending in red. State is a glyph and a word, never color alone.
 */
export declare function Stages({ label, stages }: StagesProps): import("react").JSX.Element;
