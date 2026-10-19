import type { ReactNode } from "react";
import type { GaugeTone } from "./Gauge";
import { Icon, type IconName } from "./Icon";

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
export function Steps({ label, lit, steps = 4, word, tone = "reading", labelHidden = false, caption, icon, layout = "stack", showBand = false }: StepsProps) {
  const reached = Math.min(steps, Math.max(0, Math.round(lit)));
  return (
    <div className="ui-steps" data-numeric={showBand || undefined} data-tone={tone} data-layout={layout === "row" ? "row" : undefined} data-label={labelHidden ? "hidden" : undefined} role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={steps} aria-valuenow={Math.max(1, reached)} aria-valuetext={showBand ? `Band ${reached} of ${steps}: ${word}` : word}>
      <span className={labelHidden ? "ui-visually-hidden" : "ui-steps__label"}>
        {icon && !labelHidden ? <Icon name={icon} size={16} /> : null}
        {label}
      </span>
      {showBand ? <strong className="ui-steps__ordinal">{reached}<small>/{steps}</small></strong> : null}
      <span className="ui-steps__track" aria-hidden="true" style={layout === "row" ? { gridTemplateColumns: `repeat(${steps}, 1fr)` } : undefined}>
        {Array.from({ length: steps }, (_, index) => (
          <span key={index} className="ui-steps__step" data-lit={index < reached ? "true" : undefined} />
        ))}
      </span>
      <span className="ui-steps__word">{word}</span>
      {caption ? <span className="ui-steps__caption">{caption}</span> : null}
    </div>
  );
}

/** A group of row-layout steps under one label, on shared columns. */
export function StepsTable({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="ui-steps-table" role="group" aria-label={label}>
      {children}
    </div>
  );
}
