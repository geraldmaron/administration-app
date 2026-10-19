import { useId, type ReactNode } from "react";
import type { GaugeTone } from "./Gauge";
import { fitDomain, linePath as line, plotValues } from "./Sparkline";

export type TrendDirection = "up" | "down" | "flat";

export type TrendProps = {
  readonly label: string;
  /** The reading now, as said: "$357B", "Strong". */
  readonly figure: string;
  /** Oldest first, ending with now. Fewer than two draws no line. */
  readonly values: readonly number[];
  /** The line's scale; defaults to the values' own range, padded, so a small move is seen. */
  readonly domain?: readonly [number, number];
  /** Values before this index came before this administration and draw faint. */
  readonly splitAt?: number;
  /** The move over the comparison period. `good` colors it; absent, it stays neutral. */
  readonly change?: { readonly text: string; readonly direction: TrendDirection; readonly good?: boolean; readonly period?: string };
  readonly tone?: GaugeTone;
  readonly icon?: ReactNode;
  readonly caption?: ReactNode;
};

const WIDTH = 160;
const HEIGHT = 44;
const PAD = 3;
const ARROW: Readonly<Record<TrendDirection, string>> = { up: "▲", down: "▼", flat: "▬" };

/**
 * A reading as a figure with its recent path: what it is, which way it is
 * going and how far, read at a glance. The line carries the shape; the
 * figure carries the value; the change says how much this period moved it.
 */
export function Trend({ label, figure, values, domain, splitAt = 0, change, tone = "reading", icon, caption }: TrendProps) {
  const id = useId();
  const pts = values.length > 1 ? plotValues(values, domain ?? fitDomain(values), WIDTH, HEIGHT, PAD) : [];
  const split = Math.min(Math.max(splitAt - 1, 0), Math.max(pts.length - 1, 0));
  const before = splitAt > 0 ? pts.slice(0, split + 1) : [];
  const after = splitAt > 0 ? pts.slice(split) : pts;
  const last = pts[pts.length - 1];
  const area = after.length > 1 ? `${line(after)} L${after[after.length - 1]![0].toFixed(1)} ${HEIGHT} L${after[0]![0].toFixed(1)} ${HEIGHT} Z` : "";
  const spoken = change ? `${figure}, ${change.text}${change.period ? ` ${change.period}` : ""}` : figure;
  return (
    <div className="ui-trend" data-tone={tone} role="group" aria-label={`${label}: ${spoken}`}>
      <span className="ui-trend__label">
        {icon}
        {label}
      </span>
      <span className="ui-trend__figure">{figure}</span>
      {change ? (
        <span className="ui-trend__change" data-direction={change.direction} data-good={change.good === undefined ? undefined : String(change.good)}>
          <span aria-hidden="true">{ARROW[change.direction]}</span> {change.text}
          {change.period ? <span className="ui-trend__period"> {change.period}</span> : null}
        </span>
      ) : null}
      {pts.length > 1 ? (
        <svg className="ui-trend__plot" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`${id}-wash`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="ui-trend__wash-top" />
              <stop offset="1" className="ui-trend__wash-bottom" />
            </linearGradient>
          </defs>
          {area ? <path className="ui-trend__area" d={area} fill={`url(#${id}-wash)`} /> : null}
          {before.length > 1 ? <path className="ui-trend__line ui-trend__line--before" d={line(before)} /> : null}
          {after.length > 1 ? <path className="ui-trend__line" d={line(after)} /> : null}
          {last ? <circle className="ui-trend__now" cx={last[0]} cy={last[1]} r={2.5} /> : null}
        </svg>
      ) : null}
      {caption ? <span className="ui-trend__caption">{caption}</span> : null}
    </div>
  );
}
