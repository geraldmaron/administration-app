import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { CardGrid } from "../primitives/CardGrid";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type Direction = "up" | "down" | "flat";
export type Tone = "good" | "watch" | "bad" | "neutral";

export type Delta = {
  /** Already formatted: "+2 pts". */
  readonly text: string;
  readonly direction: Direction;
  /** Whether the move helps the President; with `better` instead, the tone follows from the direction. */
  readonly tone?: Tone;
  readonly better?: "up" | "down";
};

const ARROW: Record<Direction, string> = { up: "▲", down: "▼", flat: "▬" };
const SPOKEN: Record<Direction, string> = { up: "up", down: "down", flat: "unchanged" };
const TONE_INK = { good: "success", watch: "warning", bad: "danger", neutral: "secondary" } as const;

export function toneOf(delta: Delta): Tone {
  if (delta.tone) return delta.tone;
  if (!delta.better || delta.direction === "flat") return "neutral";
  return delta.direction === delta.better ? "good" : "bad";
}

/** A signed move: arrow, words, and what it is measured against. Never color alone. */
export function DeltaText({ delta, period }: { readonly delta: Delta; readonly period?: string }) {
  const tone = toneOf(delta);
  return (
    <Text variant="label" tone={TONE_INK[tone]} aria-label={`${SPOKEN[delta.direction]} ${delta.text}${period ? ` ${period}` : ""}`}>
      {ARROW[delta.direction]} {delta.text}
      {period ? (
        <Text variant="caption" tone="tertiary" weight="regular">
          {" "}
          {period}
        </Text>
      ) : null}
    </Text>
  );
}

export type StatProps = {
  readonly label: string;
  /** The reading, already formatted: "48%", "$1.9T". */
  readonly value: string;
  readonly delta?: Delta;
  /** What the change is measured against: "since last week". */
  readonly period?: string;
  /** Where the figure comes from, said in small type: "Gallup-style tracking poll". */
  readonly source?: string;
  readonly icon?: IconName;
  /** A drawn reading beside the figure: a sparkline, a meter. */
  readonly reading?: ReactNode;
  readonly size?: "figure" | "heading" | "title";
  /** The reading's standing against its benchmark, as an edge color and a word. */
  readonly standing?: Tone;
  /** The narrowest the reading may get before a wrapping row drops it to the next line; a grid that owns its columns passes 0. */
  readonly minWidth?: number;
};

/** One reading: its name, its figure, how it moved, against what, and from where. */
export function Stat({ label, value, delta, period, source, icon, reading, size = "figure", standing, minWidth = 140 }: StatProps) {
  return (
    <Column gap="2xs" flex={1} minWidth={minWidth} role="group" aria-label={`${label}: ${value}`}>
      <Row gap="xs">
        {icon ? <Icon name={icon} size={16} tone="colorSecondary" /> : null}
        <Text variant="label" tone="secondary" numberOfLines={1}>
          {label}
        </Text>
      </Row>
      <Row gap="sm" between top>
        <Text variant={size} tabular>
          {value}
        </Text>
        {reading ? <View paddingTop="xs">{reading}</View> : null}
      </Row>
      {delta ? <DeltaText delta={delta} period={period} /> : period ? <Text variant="caption" tone="tertiary">{period}</Text> : null}
      {standing && standing !== "neutral" ? (
        <View height={3} borderRadius="pill" backgroundColor={standing === "good" ? "successInk" : standing === "watch" ? "warningInk" : "danger"} width={32} />
      ) : null}
      {source ? (
        <Text variant="caption" tone="tertiary" numberOfLines={2}>
          {source}
        </Text>
      ) : null}
    </Column>
  );
}

/**
 * Stat readings in equal columns. Each sits in its own row because a Stat grows
 * with `flex`, which collapses to nothing inside a grid cell's column.
 */
export function StatGrid({ children, max = 3 }: { readonly children: ReactNode; readonly max?: number }) {
  const items = Children.toArray(children);
  const count = Math.min(Math.max(1, items.length), max);
  return (
    <CardGrid columns={{ phone: Math.min(count, 2), tablet: count, desktop: count, wide: count }} gap="lg">
      {items.map((item, index) => (
        <Row key={index} flexGrow={1} alignItems="flex-start">
          {isValidElement(item) ? cloneElement(item as ReactElement<{ minWidth?: number }>, { minWidth: 0 }) : item}
        </Row>
      ))}
    </CardGrid>
  );
}
