import type { ReactNode } from "react";
import { Bar } from "./Bar";

/**
 * Which anchor carries the needle:
 * - reading: a neutral measure (blue).
 * - identity: the President's own standing (gold).
 * - risk: a reading where high is danger, such as removal pressure (red).
 */
/** Reading is neutral data; identity is the institution; good, watch and bad say whether the reading is in the President's favor (risk is bad, kept for callers that name it). */
export type GaugeTone = "reading" | "identity" | "risk" | "good" | "watch" | "bad";

export type GaugeMark = { readonly at: number; readonly label: string };

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

const clamp = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** A point on the dial's half circle, 0 at the left end and 1 at the right. */
function onArc(t: number, radius: number): { readonly x: number; readonly y: number } {
  const angle = Math.PI * (1 - clamp(t));
  return { x: 50 + radius * Math.cos(angle), y: 50 - radius * Math.sin(angle) };
}

function arcPath(from: number, to: number, radius: number): string {
  const start = onArc(from, radius);
  const end = onArc(to, radius);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** The arc lit up to the value, with a knob at the reading and ticks at the thresholds; the figure sits inside the arc. */
function Dial({ value, marks }: { readonly value: number; readonly marks: readonly GaugeMark[] }) {
  const knob = onArc(value, 40);
  return (
    <svg className="ui-gauge__dial" viewBox="0 0 100 56" aria-hidden="true" focusable="false">
      <path className="ui-gauge__track" d={arcPath(0, 1, 40)} />
      {value > 0 ? <path className="ui-gauge__fill" d={arcPath(0, value, 40)} /> : null}
      {marks.map((mark) => {
        const inner = onArc(mark.at, 31);
        const outer = onArc(mark.at, 35);
        return <line key={mark.label} className="ui-gauge__mark" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
      })}
      <circle className="ui-gauge__knob" cx={knob.x} cy={knob.y} r={5.5} />
    </svg>
  );
}

/** A full-circle assessment, with a fixed start at twelve and threshold ticks. */
function Ring({ value, marks }: { readonly value: number; readonly marks: readonly GaugeMark[] }) {
  return <svg className="ui-gauge__ring" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <circle className="ui-gauge__track" cx="60" cy="60" r="49" />
    {value > 0 ? <circle className="ui-gauge__fill" cx="60" cy="60" r="49" pathLength="100" strokeDasharray={`${value * 100} 100`} transform="rotate(-90 60 60)" /> : null}
    {marks.map((mark) => { const angle = clamp(mark.at) * Math.PI * 2 - Math.PI / 2; return <line key={mark.label} className="ui-gauge__mark" x1={60 + Math.cos(angle) * 37} y1={60 + Math.sin(angle) * 37} x2={60 + Math.cos(angle) * 42} y2={60 + Math.sin(angle) * 42} />; })}
  </svg>;
}

function Meter({ value, marks }: { readonly value: number; readonly marks: readonly GaugeMark[] }) {
  return (
    <span className="ui-gauge__meter" aria-hidden="true">
      <Bar value={value} marks={marks} slim />
    </span>
  );
}

/** A reading drawn on a scale, so its size is seen before its number is read. */
export function Gauge({ label, value, valueText, tone = "reading", marks = [], shape = "dial", caption, labelHidden = false, stacked = false }: GaugeProps) {
  const marksSpoken = marks.length > 0 ? `. ${marks.map((mark) => `${mark.label} at ${Math.round(mark.at * 100)}%`).join(", ")}` : "";
  return (
    <div
      className={`ui-gauge ui-gauge--${shape}`}
      data-label={labelHidden ? "hidden" : undefined}
      data-stacked={stacked && shape === "meter" ? "true" : undefined}
      data-tone={tone}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value) * 100)}
      aria-valuetext={`${valueText}${marksSpoken}`}
    >
      <span className={labelHidden ? "ui-visually-hidden" : "ui-gauge__label"}>{label}</span>
      {shape === "ring" ? <Ring value={clamp(value)} marks={marks} /> : shape === "dial" ? <Dial value={clamp(value)} marks={marks} /> : <Meter value={value} marks={marks} />}
      <span className="ui-gauge__value">{valueText}</span>
      {caption ? <span className="ui-gauge__caption">{caption}</span> : null}
    </div>
  );
}
