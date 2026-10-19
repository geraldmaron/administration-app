export type MovementValence = "good" | "watch" | "bad" | "neutral";
export type MovementProps = {
    /** What moves: "Political Stability". Absent where the row already names it. */
    readonly label?: string;
    /** The signed size of the move, in whatever unit `text` states. */
    readonly value: number;
    /**
     * The largest move on the same terms across everything compared beside it,
     * so two bars of the same length mean the same amount in every option.
     */
    readonly scale: number;
    /** The figure as it is read: "−3 pts", "+$496B", "Moderate fall". */
    readonly text: string;
    /** Whether the move is in the President's favor, decided by the model rather than by the sign. */
    readonly valence: MovementValence;
    /**
     * A band rather than a figure: the half-track is cut into this many steps,
     * so a "moderate" move never reads as a precise amount.
     */
    readonly steps?: number;
};
/**
 * A signed move drawn from a center line: left for a fall, right for a rise,
 * its length against the largest move compared beside it, its color whether
 * it helps or hurts. The sign and the figure stay in words, so neither the
 * direction nor the verdict rests on the hue.
 */
export declare function Movement({ label, value, scale, text, valence, steps }: MovementProps): import("react").JSX.Element;
/** The largest absolute move among `values`, or 1 where nothing moves, so a scale is never zero. */
export declare function movementScale(values: readonly number[]): number;
