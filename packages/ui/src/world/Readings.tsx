import type { ReactNode } from "react";
import { View } from "@tamagui/core";
import { Key } from "../data/Key";
import { Icon, type IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** What a reading means for the President: the ink of its marks, always beside words. */
export type ReadingValence = "good" | "watch" | "bad" | "neutral" | "info";

const FILL = { good: "successInk", watch: "warningInk", bad: "danger", neutral: "colorTertiary", info: "accent" } as const;
const TONE = { good: "success", watch: "warning", bad: "danger", neutral: "secondary", info: "info" } as const;

export const valenceFill = (valence: ReadingValence) => FILL[valence];
export const valenceText = (valence: ReadingValence) => TONE[valence];

/** Steps lit up to a level, the word beside them carrying the meaning. Decorative: the row says the word. */
export function Pips({ lit, steps = 5, valence = "info", size = 8 }: { readonly lit: number; readonly steps?: number; readonly valence?: ReadingValence; readonly size?: number }) {
  return (
    <Row gap={3} aria-hidden>
      {Array.from({ length: steps }, (_, index) => (
        <View key={index} width={size * 1.6} height={size} borderRadius={2} backgroundColor={index < lit ? FILL[valence] : "borderColor"} />
      ))}
    </Row>
  );
}

export type StepReadingProps = {
  readonly label: string;
  /** How many steps are lit, 1 to `steps`. */
  readonly lit: number;
  readonly steps?: number;
  /** The band's word, which is the reading: the steps only place it. */
  readonly word: string;
  readonly valence?: ReadingValence;
  readonly icon?: IconName;
  /** One line under the reading: what it compares against or where it comes from. */
  readonly caption?: string;
};

/** A banded reading (trust, tension, a force domain) as steps with its word: where it sits, never a figure the services did not read. */
export function StepReading({ label, lit, steps = 4, word, valence = "info", icon, caption }: StepReadingProps) {
  return (
    <Column gap="2xs" role="group" aria-label={`${label}: ${word}, ${lit} of ${steps}`}>
      <Row gap="sm" between wrap>
        <Row gap="xs" flexShrink={1}>
          {icon ? <Icon name={icon} size={16} tone="colorSecondary" /> : null}
          <Text variant="label" tone="secondary" weight="regular" flexShrink={1}>
            {label}
          </Text>
        </Row>
        <Row gap="sm">
          <Pips lit={lit} steps={steps} valence={valence} />
          <Text variant="label" tone={TONE[valence]} minWidth={96}>
            {word}
          </Text>
        </Row>
      </Row>
      {caption ? (
        <Text variant="caption" tone="tertiary">
          {caption}
        </Text>
      ) : null}
    </Column>
  );
}

/** `text` replaces "count word" where the count is a weight rather than a tally (a share drawn in thousandths). */
export type Segment = { readonly key: string; readonly count: number; readonly word: string; readonly valence: ReadingValence | "abroad"; readonly text?: string };

const said = (part: Segment) => part.text ?? `${part.count} ${part.word}`;

const SEGMENT_FILL = { ...FILL, abroad: "accent" } as const;

/** A set divided into its parts on one bar, each part its count; the words are what a screen reader hears and what the key prints. */
export function Segments({ parts, label, keyed = false }: { readonly parts: readonly Segment[]; readonly label: string; readonly keyed?: boolean }) {
  const spoken = `${label}: ${parts.map(said).join(", ")}.`;
  const total = parts.reduce((sum, part) => sum + part.count, 0);
  return (
    <Column gap="xs">
      <Row role="img" aria-label={spoken} height={10} borderRadius="pill" overflow="hidden" backgroundColor="borderColor" gap={2}>
        {total > 0 ? parts.map((part) => (part.count > 0 ? <View key={part.key} flexGrow={part.count} flexBasis={0} height={10} backgroundColor={SEGMENT_FILL[part.valence]} /> : null)) : null}
      </Row>
      {keyed ? <Key entries={parts.map((part) => ({ id: part.key, kind: "swatch", label: said(part), ink: SEGMENT_FILL[part.valence] }))} label={`Key: ${label}`} /> : null}
    </Column>
  );
}

export type ShareBarProps = {
  readonly value: number;
  readonly valence?: ReadingValence;
  /** What the bar reads, for a screen reader; without it the bar is decoration beside its figure. */
  readonly label?: string;
  readonly mark?: number;
  /** What the tick stands for, printed under the bar beside a tick sample: "Half the window". */
  readonly markLabel?: string;
  readonly height?: number;
};

/** A share of a range as a filled bar, with an optional tick named under it; the figure beside it is the data. */
export function ShareBar({ value, valence = "info", label, mark, markLabel, height = 8 }: ShareBarProps) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const bar = (
    <View position="relative" height={height} borderRadius="pill" backgroundColor="borderColor" flexGrow={1} flexShrink={1} minWidth={48} {...(label ? { role: "img" as const, "aria-label": markLabel ? `${label}. ${markLabel}` : label } : { "aria-hidden": true })}>
      <View height={height} borderRadius="pill" width={`${clamp(value) * 100}%`} backgroundColor={FILL[valence]} />
      {mark !== undefined ? <View position="absolute" top={-3} left={`${clamp(mark) * 100}%`} width={2} height={height + 6} marginLeft={-1} backgroundColor="color" /> : null}
    </View>
  );
  if (mark === undefined || !markLabel) return bar;
  return (
    <Column gap="2xs" flexGrow={1} flexShrink={1} minWidth={48}>
      {bar}
      <Key entries={[{ id: "mark", kind: "tick", label: markLabel, ink: "color" }]} />
    </Column>
  );
}

/** A label, a bar and a figure in one row: a share each row reads against the same scale, which `BarScale` prints over the rows. */
export function BarRow({ label, value, figure, valence = "info", labelWidth = 120 }: { readonly label: string; readonly value: number; readonly figure: string; readonly valence?: ReadingValence; readonly labelWidth?: number }) {
  return (
    <Row gap="sm" role="group" aria-label={`${label}: ${figure}`}>
      <Text variant="caption" tone="secondary" width={labelWidth} numberOfLines={1}>
        {label}
      </Text>
      <ShareBar value={value} valence={valence} />
      <Text variant="caption" weight="strong" tabular minWidth={48} textAlign="right">
        {figure}
      </Text>
    </Row>
  );
}

/**
 * The scale a set of BarRows shares, printed once over them in the bar
 * column: where the bar starts, where a full bar ends, and the unit, so a
 * bar's length reads as a quantity rather than a shape.
 */
export function BarScale({ from, to, unit, labelWidth = 120 }: { readonly from: string; readonly to: string; readonly unit?: string; readonly labelWidth?: number }) {
  return (
    <Row gap="sm" aria-label={`Scale: ${from} to ${to}${unit ? `, ${unit}` : ""}`}>
      <Text variant="caption" tone="tertiary" width={labelWidth} numberOfLines={1}>
        {unit ?? ""}
      </Text>
      <Row between flexGrow={1} flexShrink={1} minWidth={48} borderBottomWidth={1} borderBottomColor="borderColorStrong" paddingBottom="2xs">
        <Text variant="caption" tone="tertiary" tabular>
          {from}
        </Text>
        <Text variant="caption" tone="tertiary" tabular>
          {to}
        </Text>
      </Row>
      <View minWidth={48} />
    </Row>
  );
}

/** A dated beat in a history: the date in small caps above what happened. */
export function Beat({ date, children }: { readonly date: string; readonly children: ReactNode }) {
  return (
    <Row gap="md" top>
      <View width={10} height={10} borderRadius="pill" backgroundColor="goldRule" marginTop={6} />
      <Column flex={1} gap="2xs">
        <Text variant="eyebrow" tone="secondary">
          {date}
        </Text>
        <Text variant="body">{children}</Text>
      </Column>
    </Row>
  );
}
