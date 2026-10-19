import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Line } from "react-native-svg";
import { View } from "@tamagui/core";
import { useInk } from "../icons/Icon";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Key } from "./Key";
import { MARK_STYLE, markKeyEntries, type KeyEntry, type MarkKind } from "./key-entries";
import { nearestMarks, textWidth, tickLabelRows } from "./scale";

/**
 * `historical` is a landmark from the real record, `gate` a line the rules act
 * on, `target` a goal, `danger` a level past which harm starts, `record` this
 * term's own opening, best or worst.
 */
/** A mark with an empty `label` draws its tick with no name, for a bar whose neighbor in the same frame already named that cut. */
export type MeterMark = { readonly id: string; readonly label: string; readonly at: number; readonly kind: MarkKind };

const CAPTION_SIZE = 12;
const NAME_ROW = 18;

/** A mark across the track in its kind's ink, weight and dash, so a gate and a danger level differ by more than color. */
function Tick({ kind, height }: { readonly kind: MarkKind; readonly height: number }) {
  const style = MARK_STYLE[kind];
  const ink = useInk(style.ink);
  const width = style.tick + 1;
  return (
    <Svg width={width} height={height}>
      <Line x1={width / 2} x2={width / 2} y1={0} y2={height} stroke={ink} strokeWidth={style.tick} {...(style.dash ? { strokeDasharray: style.dash.split(" ").map((n) => Number(n) / 2).join(" ") } : {})} />
    </Svg>
  );
}

/** The key for a meter's marks: one entry per kind it draws after cutting to the marks that matter. */
export function meterKeyEntries(marks: readonly MeterMark[], value: number): readonly KeyEntry[] {
  return markKeyEntries(nearestMarks(marks, value));
}

export type MeterProps = {
  readonly label: string;
  /** The reading as a fraction of the track, 0–1. */
  readonly value: number;
  readonly figure: string;
  /** What the figure counts and of what: "of adults", "of 435 seats". Printed after the figure. */
  readonly unit?: string;
  readonly marks?: readonly MeterMark[];
  readonly tone?: "accent" | "successInk" | "warningInk" | "danger";
  /** Draw the key for the marks under this meter; a group of meters in one frame keys them once instead. */
  readonly keyed?: boolean;
};

/** Each shown tick named under itself, stacking to a second row before overlapping; a card too narrow for that lists the names in track order. */
function MarkNames({ shown, width }: { readonly shown: readonly MeterMark[]; readonly width: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  // The caption face is a sans; its width estimate gets a margin for the tick before each name.
  const placed = width > 0 ? tickLabelRows(shown.map((mark) => ({ id: mark.id, at: clamp(mark.at), width: textWidth(mark.label, CAPTION_SIZE) + 10 })), width) : [];
  const rows = (placed ?? []).reduce((most, tick) => Math.max(most, tick.row + 1), 0);
  if (placed && rows > 0) {
    return (
      <View position="relative" height={rows * NAME_ROW} aria-hidden>
        {placed.map((tick) => {
          const mark = shown.find((m) => m.id === tick.id)!;
          return (
            <View key={tick.id} position="absolute" top={tick.row * NAME_ROW} {...(tick.side === "start" ? { left: tick.left } : { right: width - clamp(mark.at) * width - 1 })} flexDirection={tick.side === "start" ? "row" : "row-reverse"} alignItems="center" gap="2xs">
              <Tick kind={mark.kind} height={12} />
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {mark.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }
  if (placed || shown.length === 0) return null;
  return (
    <View gap="2xs" aria-hidden>
      {[...shown].sort((a, b) => a.at - b.at).map((mark) => (
        <View key={mark.id} flexDirection="row" alignItems="center" gap="xs">
          <Tick kind={mark.kind} height={12} />
          <Text variant="caption" tone="secondary" flex={1}>
            {mark.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * A reading as a filled share of its range, with benchmark ticks laid on the
 * same track: where the reading is against where it should be. Values and
 * marks are fractions of the track (0–1). Each tick is named directly under
 * itself in the tick's ink, weight and dash, and a long list is cut to the gates and the two
 * marks the reading sits between, so every tick drawn can be told apart.
 */
export function Meter({ label, value, figure, unit, marks = [], tone = "accent", keyed = false }: MeterProps) {
  const [width, setWidth] = useState(0);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const shown = nearestMarks(marks, value);
  const meter = (
    <View gap="xs" role="meter" aria-label={`${label}: ${figure}${unit ? ` ${unit}` : ""}${shown.some((mark) => mark.label) ? `. ${shown.filter((mark) => mark.label).map((mark) => mark.label).join("; ")}` : ""}`} aria-valuenow={Math.round(clamp(value) * 100)} aria-valuemin={0} aria-valuemax={100}>
      <Row between gap="sm">
        <Text variant="label" tone="secondary" flex={1}>
          {label}
        </Text>
        <Text variant="label" weight="strong" tabular>
          {figure}
          {unit ? (
            <Text variant="caption" tone="secondary" weight="regular">
              {` ${unit}`}
            </Text>
          ) : null}
        </Text>
      </Row>
      <View position="relative" height={10} borderRadius="pill" backgroundColor="borderColor" overflow="visible" onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))}>
        <View height={10} borderRadius="pill" width={`${clamp(value) * 100}%`} backgroundColor={tone} />
        {shown.map((mark) => (
          <View key={mark.id} position="absolute" top={-3} left={`${clamp(mark.at) * 100}%`} marginLeft={-Math.ceil((MARK_STYLE[mark.kind].tick + 1) / 2)}>
            <Tick kind={mark.kind} height={16} />
          </View>
        ))}
      </View>
      <MarkNames shown={shown.filter((mark) => mark.label.trim() !== "")} width={width} />
    </View>
  );
  if (!keyed || shown.length === 0) return meter;
  return (
    <View gap="xs">
      {meter}
      <Key entries={markKeyEntries(shown)} label={`Key: ${label}`} />
    </View>
  );
}
