import type { CSSProperties } from "react";

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

const VERDICT: Readonly<Record<MovementValence, string>> = { good: ", in your favor", bad: ", against you", watch: ", worth watching", neutral: "" };

/**
 * A signed move drawn from a center line: left for a fall, right for a rise,
 * its length against the largest move compared beside it, its color whether
 * it helps or hurts. The sign and the figure stay in words, so neither the
 * direction nor the verdict rests on the hue.
 */
export function Movement({ label, value, scale, text, valence, steps }: MovementProps) {
  const share = scale > 0 ? Math.min(1, Math.abs(value) / scale) : 0;
  const side = value < 0 ? "fall" : value > 0 ? "rise" : "flat";
  const spoken = `${label ? `${label}: ` : ""}${text}${VERDICT[valence]}`;
  return (
    <span className="ui-movement" data-valence={valence} data-side={side} role="img" aria-label={spoken}>
      {label ? (
        <span className="ui-movement__label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <span className="ui-movement__track" aria-hidden="true" style={{ "--movement-share": share } as CSSProperties}>
        {steps ? (
          <span className="ui-movement__ticks" style={{ "--movement-steps": steps } as CSSProperties} />
        ) : null}
        <span className="ui-movement__bar" />
      </span>
      <span className="ui-movement__figure" aria-hidden="true">
        <span className="ui-movement__sign">{side === "fall" ? "▼" : side === "rise" ? "▲" : "–"}</span>
        {text}
      </span>
    </span>
  );
}

/** The largest absolute move among `values`, or 1 where nothing moves, so a scale is never zero. */
export function movementScale(values: readonly number[]): number {
  const largest = values.reduce((most, value) => Math.max(most, Math.abs(value)), 0);
  return largest > 0 ? largest : 1;
}
