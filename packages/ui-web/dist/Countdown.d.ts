export type CountdownTone = "good" | "watch" | "bad" | "neutral";
export type CountdownProps = {
    /** Units still left; zero or less reads as due. */
    readonly left: number;
    /** The whole window a rule gave, where one exists: only a window can draw how much of it is gone. */
    readonly window?: number;
    readonly unit: "day" | "week";
    /** The due date as the screen writes it; shown under the figure. */
    readonly dueText?: string;
    /** Overrides the color a window would pick: a model's own urgency beats a ratio. */
    readonly tone?: CountdownTone;
};
/**
 * Time left as a flat track that drains toward the deadline, with the figure
 * big beside it and the date under it. Without a rule's window there is no
 * honest length to drain from, so only the figure and the date are drawn.
 */
export declare function Countdown({ left, window, unit, dueText, tone }: CountdownProps): import("react").JSX.Element;
/** A matter with no rule behind it has no deadline; saying so with a glyph beats a sentence about the absence. */
export declare function OpenEnded({ holds, note }: {
    readonly holds: boolean;
    readonly note?: string;
}): import("react").JSX.Element;
