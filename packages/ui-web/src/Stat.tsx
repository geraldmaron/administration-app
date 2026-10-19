import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type StatDirection = "up" | "down" | "flat";

export type StatTone = "good" | "watch" | "bad" | "neutral";

export type StatProps = {
  readonly label: ReactNode;
  /** The reading, already formatted: "48%", "$1.9T", "Week 1". */
  readonly value: ReactNode;
  /** The change over the comparison period, already formatted: "+2 pts". */
  readonly delta?: {
    readonly text: string;
    readonly direction: StatDirection;
    /** Whether the change helps the President. Set this, or `better`; with neither, the arrow is plain blue up and red down. */
    readonly tone?: StatTone;
    /** Which direction is good for this reading (a deficit is better down); the tone follows from the move. */
    readonly better?: "up" | "down";
  };
  /** What the change is measured against: "since last week". */
  readonly period?: ReactNode;
  /** A drawn reading beside the figure: a gauge or a series. */
  readonly reading?: ReactNode;
  /** A word or a name rather than a figure: drawn at reading size so it wraps instead of overflowing. */
  readonly compact?: boolean;
  /** `heading` sets the figure at panel-heading size, for a row of several headline readings. */
  readonly size?: "figure" | "heading";
  /** A glyph leading the label. */
  readonly icon?: IconName;
  /** Compact value/chart comparison used by working dashboards. */
  readonly layout?: "stacked" | "comparison";
  readonly tone?: StatTone;
  readonly heading?: boolean;
  readonly className?: string;
};

const ARROW: Readonly<Record<StatDirection, string>> = { up: "▲", down: "▼", flat: "▬" };
const SPOKEN: Readonly<Record<StatDirection, string>> = { up: "up", down: "down", flat: "unchanged" };

function toneOfDelta(delta: NonNullable<StatProps["delta"]>): StatTone | undefined {
  if (delta.tone) return delta.tone;
  if (!delta.better) return undefined;
  if (delta.direction === "flat") return "neutral";
  return delta.direction === delta.better ? "good" : "bad";
}

/** One reading: its name, its figure, how it moved and against what. */
export function Stat({ label, value, delta, period, reading, compact = false, size = "figure", icon, layout = "stacked", tone, heading = false, className }: StatProps) {
  const Label = heading ? "h3" : "p";
  return (
    <div data-layout={layout === "comparison" ? layout : undefined} data-tone={tone} className={["ui-stat", compact ? "ui-stat--compact" : undefined, size === "heading" ? "ui-stat--heading" : undefined, className].filter(Boolean).join(" ")}>
      <Label className="ui-stat__label">
        {icon ? <Icon name={icon} size={16} /> : null}
        {label}
      </Label>
      <p className="ui-stat__value">{value}</p>
      {delta ? (
        <p className="ui-stat__delta" data-direction={delta.direction} data-tone={toneOfDelta(delta)}>
          <span aria-hidden="true">{ARROW[delta.direction]}</span>
          <span className="ui-visually-hidden">{SPOKEN[delta.direction]}</span> {delta.text}
          {period ? <span className="ui-stat__period"> {period}</span> : null}
        </p>
      ) : period ? (
        <p className="ui-stat__period">{period}</p>
      ) : null}
      {reading ? <div className="ui-stat__reading">{reading}</div> : null}
    </div>
  );
}

/** Several readings divided inside one surface, so a row of figures is one object rather than a row of cards. */
export function StatRow({ children, layout, as: Element = "div", className }: { readonly children: ReactNode; readonly layout?: "comparison"; readonly as?: "div" | "ul"; readonly className?: string }) {
  return <Element className={["ui-stat-row", className].filter(Boolean).join(" ")} data-layout={layout}>{children}</Element>;
}
