import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";
import { View } from "@tamagui/core";
import { gutterFor } from "../data/BenchmarkChart";
import { Key } from "../data/Key";
import { niceTicks } from "../data/scale";
import { FONT_FACES } from "../theme/tamagui.config";
import { peerInk } from "../data/series-ink";
import { useInk } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { BASELINE_DASH, fanKeyEntries } from "./fan-keys";
import { CHART_LABEL_SIZE } from "../data/chart-type";

export type FanPoint = { readonly low: number; readonly median: number; readonly high: number };
export type FanLine = { readonly id: string; readonly label: string; readonly baseline: boolean; readonly index: number; readonly points: readonly FanPoint[] };

export type FanChartProps = {
  readonly title: string;
  readonly lines: readonly FanLine[];
  readonly startLabel: string;
  readonly endLabel: string;
  readonly format: (value: number) => string;
  /** A share is held inside 0..1 however the runs spread. */
  readonly bounded?: boolean;
  readonly height?: number;
  /** Draw the key under this chart; a set of projections in one frame keys them once with `fanKeyEntries`. */
  readonly keyed?: boolean;
};

const PAD = { top: 8, bottom: 20, left: 44 };

function domainOf(lines: readonly FanLine[], bounded: boolean): readonly [number, number] {
  const values = lines.flatMap((line) => line.points.flatMap((point) => [point.low, point.high]));
  if (values.length === 0) return [0, 1];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const floor = bounded ? 0.04 : Math.max(1, Math.abs(high) * 0.002);
  const pad = Math.max((floor - (high - low)) / 2, (high - low) * 0.15);
  return bounded ? [Math.max(0, low - pad), Math.min(1, high + pad)] : [low - pad, high + pad];
}

/**
 * A projected reading: per option, the median of the runs as a line and their
 * range as a band behind it, the comparison dashed. Each line ends in its name
 * and figure at the right edge (its figure alone where the names do not fit,
 * the key then naming the lines), and the same is said in words for a screen
 * reader; the drawing is not the only record.
 */
export function FanChart({ title, lines, startLabel, endLabel, format, bounded = true, height = 140, keyed = false }: FanChartProps) {
  const [width, setWidth] = useState(0);
  const grid = useInk("borderColor");
  const axis = useInk("colorTertiary");
  const baseInk = useInk("colorSecondary");
  const [low, high] = domainOf(lines, bounded);
  const ticks = niceTicks(low, high, 3).filter((tick) => tick >= low && tick <= high);
  const plotH = height - PAD.top - PAD.bottom;
  const y = (value: number) => PAD.top + plotH - ((value - low) / (high - low || 1)) * plotH;
  const ends = lines.flatMap((line) => {
    const end = line.points.at(-1);
    return end ? [{ id: line.id, y: y(end.median), name: line.label, figure: format(end.median), bold: !line.baseline }] : [];
  });
  const gutter = gutterFor(width, ends.map((e) => ({ ...e, text: `${e.name} ${e.figure}` })), ends.map((e) => ({ ...e, text: e.figure })), 2, height - PAD.bottom + 6);
  const plotW = Math.max(width - PAD.left - gutter.width, 10);
  const weeks = Math.max(1, (lines[0]?.points.length ?? 1) - 1);
  const x = (week: number) => PAD.left + (week / weeks) * plotW;
  const path = (values: readonly number[]) => values.map((value, week) => `${week === 0 ? "M" : "L"}${x(week).toFixed(1)},${y(value).toFixed(1)}`).join("");
  const summary = lines.map((line) => {
    const end = line.points.at(-1);
    return end ? `${line.label}: most likely ${format(end.median)}, anywhere from ${format(end.low)} to ${format(end.high)}` : line.label;
  });
  return (
    <Column gap="2xs" flexGrow={1} flexShrink={1} flexBasis="auto" minWidth={220}>
      <Text variant="label">{title}</Text>
      <View height={height} onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))} role="img" aria-label={`${title} at ${endLabel}. ${summary.join(". ")}.`}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((tick) => (
              <G key={tick}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} stroke={grid} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={y(tick) + 4} fontSize={CHART_LABEL_SIZE} fontFamily={FONT_FACES.sans[400]} fill={axis} textAnchor="end">
                  {format(tick)}
                </SvgText>
              </G>
            ))}
            {lines.map((line) => {
              const ink = line.baseline ? baseInk : peerInk(line.index);
              const band = `${path(line.points.map((point) => point.high))}${[...line.points].reverse().map((point, back) => `L${x(line.points.length - 1 - back).toFixed(1)},${y(point.low).toFixed(1)}`).join("")}Z`;
              return (
                <G key={line.id}>
                  <Path d={band} fill={ink} opacity={line.baseline ? 0.08 : 0.18} />
                  <Path d={path(line.points.map((point) => point.median))} stroke={ink} strokeWidth={2} fill="none" {...(line.baseline ? { strokeDasharray: BASELINE_DASH } : {})} />
                </G>
              );
            })}
            {gutter.labels.map((label) => (
              <SvgText key={label.id} x={PAD.left + plotW + 6} y={label.at + 4} fontSize={CHART_LABEL_SIZE} fontFamily={FONT_FACES.sans[label.bold ? 700 : 400]} fill={baseInk}>
                {label.text}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
      <Row between paddingLeft={PAD.left} paddingRight={gutter.width}>
        <Text variant="caption" tone="tertiary">
          {startLabel}
        </Text>
        <Text variant="caption" tone="tertiary">
          {endLabel}
        </Text>
      </Row>
      {keyed ? <Key entries={fanKeyEntries(lines)} label={`Key: ${title}`} /> : null}
    </Column>
  );
}
