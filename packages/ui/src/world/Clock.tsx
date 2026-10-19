import { View } from "@tamagui/core";
import Svg, { Circle } from "react-native-svg";
import { Key } from "../data/Key";
import { Icon, useInk, type IconName } from "../icons/Icon";
import { PressRow } from "../primitives/PressRow";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { ShareBar, valenceFill, valenceText, type ReadingValence } from "./Readings";

const clockValence = (left: number, window: number): ReadingValence => (left < 0 || left <= Math.min(14, window / 4) ? "bad" : left <= window / 2 ? "watch" : "good");

/**
 * A statutory clock: the days left against the statute's whole window, with
 * the date it falls due. Past due reads as such rather than as a negative.
 */
export function StatuteClock({ label, left, window, due, unit = "day" }: { readonly label: string; readonly left: number; readonly window: number; readonly due?: string; readonly unit?: string }) {
  const valence = clockValence(left, window);
  const words = left < 0 ? `${-left} ${unit}${-left === 1 ? "" : "s"} overdue` : `${left} of ${window} ${unit}s left`;
  return (
    <Column gap="xs" role="timer" aria-label={`${label}: ${words}${due ? `. ${due}` : ""}`}>
      <Row between gap="sm" wrap>
        <Text variant="label" tone="secondary">
          {label}
        </Text>
        <Text variant="label" weight="strong" tone={valenceText(valence)} tabular>
          {words}
        </Text>
      </Row>
      <ShareBar value={Math.max(0, left) / Math.max(1, window)} valence={valence} height={10} />
      {due ? (
        <Text variant="caption" tone="tertiary">
          {due}
        </Text>
      ) : null}
    </Column>
  );
}

/** Two flows on one shared scale, buy and sell, so every pair on a screen compares. Decorative: the figures beside it are the data. */
export function PairedBars({ buy, sell }: { readonly buy: number; readonly sell: number }) {
  return (
    <Column gap={2} aria-hidden flexGrow={1} flexShrink={1} minWidth={60} minHeight={14}>
      <View height={6} borderRadius="pill" width={`${buy}%`} backgroundColor="accent" />
      <View height={6} borderRadius="pill" width={`${sell}%`} backgroundColor="goldRule" />
    </Column>
  );
}

/** The key for PairedBars: the two flows by their own words. */
export function PairedKey({ buy, sell }: { readonly buy: string; readonly sell: string }) {
  return (
    <Key
      entries={[
        { id: "buy", kind: "line", label: buy, ink: "accent", weight: 6 },
        { id: "sell", kind: "line", label: sell, ink: "goldRule", weight: 6 },
      ]}
      label="What the two bars mean"
    />
  );
}

/** How a wait reads: plenty of time, getting close, or due. */
export function countdownValence(daysLeft: number, windowDays?: number): ReadingValence {
  if (daysLeft <= 0) return "bad";
  if (daysLeft <= 7 || (windowDays !== undefined && daysLeft <= windowDays / 4)) return "watch";
  return "info";
}

/**
 * The ring a countdown draws: the arc is the part of the wait already gone,
 * the figure in the middle is the days left. A wait with no known start draws
 * a dashed ring, because a full arc would claim a window nobody set.
 */
export function CountdownRing({ daysLeft, progress, valence, size = 52 }: { readonly daysLeft: number; readonly progress?: number; readonly valence: ReadingValence; readonly size?: number }) {
  const track = useInk("borderColor");
  const ink = useInk(valenceFill(valence));
  const stroke = Math.max(4, Math.round(size / 10));
  const radius = (size - stroke) / 2;
  const around = 2 * Math.PI * radius;
  const gone = progress === undefined ? 0 : Math.max(0, Math.min(1, progress));
  const due = daysLeft <= 0;
  // A round cap draws a dot even at zero length, so an arc with nothing gone is not drawn at all.
  const arc = due ? 1 : gone;
  // The ring sits in flow and sizes the box; the figure is laid over it, so the ring can never be placed outside its own box.
  return (
    <View position="relative" width={size} height={size} aria-hidden flexShrink={0}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" {...(progress === undefined && !due ? { strokeDasharray: "4 4" } : {})} />
        {arc > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={ink} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${arc * around} ${around}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      <View position="absolute" top={0} left={0} width={size} height={size} alignItems="center" justifyContent="center">
        <Text variant={size >= 48 ? "label" : "caption"} weight="strong" tabular tone={valenceText(valence)}>
          {due ? "Due" : daysLeft}
        </Text>
        {!due && size >= 48 ? (
          <Text variant="caption" tone="tertiary">
            {daysLeft === 1 ? "day" : "days"}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export type CountdownProps = {
  readonly title: string;
  /** Who it waits on, set small above the title. */
  readonly waitingOn?: string;
  /** One plain sentence: what happens and when. */
  readonly line: string;
  /** The due date as words. */
  readonly due: string;
  readonly daysLeft: number;
  readonly windowDays?: number;
  readonly progress?: number;
  /** Whether its answer stops time when it comes. */
  readonly stops?: boolean;
  readonly icon?: IconName;
  /** The countdown read aloud, so the ring is never the only place the time is said. */
  readonly spoken: string;
  /** Opens the thing it waits on; the whole row is the target. */
  readonly onPress?: () => void;
  /** Marks the row the page was opened for. */
  readonly focused?: boolean;
  readonly id?: string;
};

/** One pending thing with the time it has left: a ring, what it is, who it waits on and the day it is due. */
export function Countdown({ title, waitingOn, line, due, daysLeft, windowDays, progress, stops, icon, spoken, onPress, focused, id }: CountdownProps) {
  const valence = countdownValence(daysLeft, windowDays);
  const body = (
    <Row gap="md" top>
      <CountdownRing daysLeft={daysLeft} {...(progress !== undefined ? { progress } : {})} valence={valence} />
      <Column flex={1} minWidth={0} gap={2}>
        {waitingOn ? (
          <Row gap="xs">
            {icon ? <Icon name={icon} size={14} tone="colorSecondary" /> : null}
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {`Waiting on ${waitingOn}`}
            </Text>
          </Row>
        ) : null}
        <Text variant="label">{title}</Text>
        <Text variant="caption" tone="secondary">
          {line}
        </Text>
        <Row gap="sm" wrap>
          <Text variant="caption" weight="strong" tone={valenceText(valence)} tabular>
            {spoken}
          </Text>
          <Text variant="caption" tone="tertiary">
            {due}
          </Text>
          {stops ? (
            <Row gap={4}>
              <Icon name="paused" size={12} tone="colorTertiary" />
              <Text variant="caption" tone="tertiary">
                Time stops when it comes
              </Text>
            </Row>
          ) : null}
        </Row>
      </Column>
      {onPress ? <Icon name="chevron" size={16} tone="colorTertiary" /> : null}
    </Row>
  );
  const frame = { padding: "sm" as const, borderRadius: "card" as const, borderWidth: focused ? 2 : 1, borderColor: focused ? ("accent" as const) : ("borderColor" as const), backgroundColor: "surface" as const };
  const label = `${title}. ${waitingOn ? `Waiting on ${waitingOn}. ` : ""}${spoken}, ${due}.`;
  if (!onPress) {
    return (
      <View {...frame} role="listitem" aria-label={label} {...(id ? { id } : {})}>
        {body}
      </View>
    );
  }
  return (
    <PressRow label={label} onPress={onPress} {...frame} {...(id ? { id } : {})}>
      {body}
    </PressRow>
  );
}
