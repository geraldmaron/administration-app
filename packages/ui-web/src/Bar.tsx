import type { CSSProperties, ReactNode } from "react";

/** `reading` is plain data (blue); `neutral` is a quiet gray for a reading that is not a verdict; good, watch and bad are the President's verdict. */
export type BarTone = "reading" | "neutral" | "good" | "watch" | "bad";

export type BarMark = { readonly at: number; readonly label: string };

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

const clamp = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const pct = (value: number): string => `${(clamp(value) * 100).toFixed(2)}%`;

/** One flat, slim track filled to a value, with hairline ticks at what it is read against. */
export function Bar({ label, value, tone = "reading", marks = [], from, mode = "fill", slim = false }: BarProps) {
  const spoken = label === undefined ? undefined : marks.length > 0 ? `${label}. ${marks.map((mark) => mark.label).join(", ")}` : label;
  const at = clamp(value);
  const origin = from === undefined ? undefined : clamp(from);
  const lo = origin === undefined ? 0 : Math.min(origin, at);
  const hi = origin === undefined ? at : Math.max(origin, at);
  const a11y = spoken === undefined ? { "aria-hidden": true as const } : { role: "img" as const, "aria-label": spoken };
  return (
    <span className="ui-bar" data-tone={tone} data-mode={mode === "fill" ? undefined : mode} data-slim={slim ? "true" : undefined} {...a11y}>
      {mode === "level" ? (
        <>
          <span className="ui-bar__fill" data-span="faint" style={{ insetInlineStart: 0, inlineSize: pct(at) }} />
          <span className="ui-bar__tick" style={{ insetInlineStart: pct(at) }} />
        </>
      ) : mode === "shift" && origin !== undefined ? (
        <>
          <span className="ui-bar__fill" data-span="move" style={{ insetInlineStart: pct(lo), inlineSize: `${((hi - lo) * 100).toFixed(2)}%` }} />
          <span className="ui-bar__dot" data-end="start" style={{ insetInlineStart: pct(origin) }} />
          <span className="ui-bar__dot" data-end="end" style={{ insetInlineStart: pct(at) }} />
        </>
      ) : (
        <>
          {origin === undefined ? null : <span className="ui-bar__fill" data-span="base" style={{ insetInlineStart: 0, inlineSize: pct(lo) }} />}
          <span className="ui-bar__fill" data-span={origin === undefined ? undefined : "move"} style={{ insetInlineStart: pct(lo), inlineSize: `${((hi - lo) * 100).toFixed(2)}%` }} />
        </>
      )}
      {marks.map((mark) => (
        <span key={mark.label} className="ui-bar__mark" style={{ insetInlineStart: pct(mark.at) }} />
      ))}
    </span>
  );
}

export type ShareSegment = { readonly id: string; readonly label: string; readonly share: number; readonly icon?: ReactNode; readonly figure: string; readonly tone?: "neutral" };

/** Five steps of one hue, darkest first, so a stacked share reads as parts of one whole without five competing colors. */
const SHADES = 5;

/** A whole split into parts on one bar, each part named in a legend that carries its glyph and figure. */
export function ShareBar({ label, segments, shape = "bar" }: { readonly label: string; readonly segments: readonly ShareSegment[]; readonly shape?: "bar" | "ring" }) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.share), 0);
  let offset = 0;
  return (
    <figure className="ui-share" data-shape={shape}>
      <figcaption className="ui-visually-hidden">{label}</figcaption>
      {shape === "ring" ? <div className="ui-share__ring"><svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="ui-share__ring-track" cx="60" cy="60" r="46" />
        {total > 0 ? segments.map((segment, index) => { const share = Math.max(0, segment.share) / total * 100; const start = offset; offset += share; return <circle key={segment.id} className="ui-share__ring-part" data-tone={segment.tone} data-shade={index % SHADES} cx="60" cy="60" r="46" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />; }) : null}
      </svg><span>{total > 0 ? "100%" : "—"}<small>{label}</small></span></div> : null}
      <span className={shape === "ring" ? "ui-visually-hidden" : "ui-share__bar"} aria-hidden="true">
        {total > 0
          ? segments.map((segment, index) => (
              <span key={segment.id} className="ui-share__part" data-shade={index % SHADES} style={{ flexGrow: (Math.max(0, segment.share) / total) * 100 }} />
            ))
          : null}
      </span>
      <ul className="ui-share__legend">
        {segments.map((segment, index) => (
          <li key={segment.id} className="ui-share__item">
            <span className="ui-share__key" data-tone={segment.tone} data-shade={index % SHADES} aria-hidden="true" />
            {segment.icon}
            <span className="ui-share__name">{segment.label}</span>
            <span className="ui-share__figure">{segment.figure}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

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
export function BarRows({ label, rows, labelWidth, framed = false, figureInk = false, slim = false }: BarRowsProps) {
  const style = labelWidth ? ({ "--bar-label": labelWidth } as CSSProperties) : undefined;
  return (
    <ul className="ui-bar-rows" data-framed={framed ? "true" : undefined} aria-label={label} style={style}>
      {rows.map((row) => {
        const tone = row.tone ?? "reading";
        const valence = tone === "good" || tone === "watch" || tone === "bad" ? tone : undefined;
        return (
          <li key={row.id} className="ui-bar-row">
            <span className="ui-bar-row__label">
              {row.icon}
              <span className="ui-bar-row__text">
                {row.label}
                {row.note ? <small>{row.note}</small> : null}
              </span>
            </span>
            <Bar value={row.value} tone={tone} slim={slim} marks={row.marks} />
            <span className={figureInk ? "ui-bar-row__figure ui-valence-ink" : "ui-bar-row__figure"} data-valence={valence}>
              {row.figure}
            </span>
            {row.spoken ? <span className="ui-visually-hidden">{row.spoken}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
