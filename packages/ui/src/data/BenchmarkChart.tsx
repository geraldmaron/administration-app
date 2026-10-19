import { useState, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { View, useTheme } from "@tamagui/core";
import { useInk, type InkRole as ThemeInk } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { FONT_FACES } from "../theme/tamagui.config";
import { Key, KeySample } from "./Key";
import { MARK_STYLE, type KeyEntry, type MarkKind } from "./key-entries";
import { PressHint, ReadingHead, type ReadingHelp } from "./ReadingFrame";
import { dashFor, peerInk } from "./series-ink";
import { fitXLabels, linePath, niceTicks, stackLabels, textWidth, type PlotPoint } from "./scale";
import { CHART_LABEL_SIZE } from "./chart-type";

export type ChartSeries = {
  readonly id: string;
  readonly label: string;
  /** One value per x position; null where the series has no reading. */
  readonly values: readonly (number | null)[];
  /** `self` is the President's own line, `peer` another government or state, `history` a past presidency or the published record. */
  readonly kind: "self" | "peer" | "history";
  /** The line's own ink where its meaning is not the default for its kind (a trust line is not "you"); the key follows it. */
  readonly ink?: ThemeInk;
};

export type Benchmark = {
  readonly id: string;
  readonly label: string;
  /** A line at a value: a historical landmark, a gate the rules read, a target. */
  readonly value?: number;
  /** A band between two values: a healthy range, a danger zone. */
  readonly band?: readonly [number, number];
  readonly kind: "historical" | "gate" | "target" | "danger";
};

export type BenchmarkChartProps = {
  readonly title: string;
  /** Labels under each x position, oldest first. */
  readonly x: readonly string[];
  readonly series: readonly ChartSeries[];
  readonly benchmarks?: readonly Benchmark[];
  readonly format: (value: number) => string;
  /** Fix the vertical scale (a share 0–1, a score 0–100); otherwise it fits the data and the benchmarks. */
  readonly domain?: readonly [number, number];
  /** Where the vertical axis is labeled, when the format names bands: one tick per band, so no word repeats. */
  readonly ticks?: readonly number[];
  readonly height?: number;
  /** Which way is better for this reading, so the summary can say who leads. */
  readonly better?: "up" | "down";
  /** The unit and period printed under the title: "% of adults · Weekly, this term". */
  readonly unit?: string;
  readonly period?: string;
  /** "How to read this": what the lines are and how to read them against each other. */
  readonly help?: ReadingHelp;
  readonly pressHint?: string;
  readonly level?: 2 | 3;
  /** A control in the head that opens this reading set against others. */
  readonly door?: ReactNode;
};

const PAD = { top: 12, bottom: 26, left: 44 };
const LABEL_SIZE = CHART_LABEL_SIZE;
const LINE_HEIGHT = 14;
const LABEL_GAP = 2;
/** Room between the plot's right edge and the label column for a leader to bend in. */
const LEADER = 12;
/** The end-label column never takes more than this share of the drawing, so the plot keeps its width. */
const GUTTER_SHARE = 0.4;
const GUTTER_MAX = 260;
const SANS = FONT_FACES.sans[400];
const SANS_BOLD = FONT_FACES.sans[700];

type InkRole = (typeof MARK_STYLE)[MarkKind]["ink"];

/** Each kind of benchmark drawn its own way, from the one table every reference line in the player reads. */
export const BENCHMARK_STYLE: Readonly<Record<Benchmark["kind"], (typeof MARK_STYLE)[MarkKind]>> = {
  historical: MARK_STYLE.historical,
  target: MARK_STYLE.target,
  gate: MARK_STYLE.gate,
  danger: MARK_STYLE.danger,
};

type EndLabel = { readonly id: string; readonly y: number; readonly text: string; readonly bold: boolean; readonly ink?: string };

type Gutter = {
  readonly width: number;
  /** True when every line carries its name at its end; false when only figures fit there and the names are listed under the chart. */
  readonly named: boolean;
  readonly labels: readonly (EndLabel & { readonly at: number })[];
};

/**
 * The column at the plot's right edge where every line ends in its label.
 * Names go there when the longest fits the column and the column is tall
 * enough to stack them all; otherwise only the figures go there and the
 * names move to the list under the chart. Nothing is cut short or drawn over
 * another label.
 */
export function gutterFor(width: number, named: readonly EndLabel[], figures: readonly EndLabel[], top: number, bottom: number): Gutter {
  const need = (labels: readonly EndLabel[]) => Math.ceil(Math.max(0, ...labels.map((l) => textWidth(l.text, LABEL_SIZE, l.bold)))) + LEADER + 4;
  const stack = (labels: readonly EndLabel[]) => stackLabels(labels.map((l) => ({ id: l.id, y: l.y, height: LINE_HEIGHT })), LABEL_GAP, top, bottom);
  const placed = (labels: readonly EndLabel[], at: ReadonlyMap<string, number>) => labels.map((l) => ({ ...l, at: at.get(l.id)! }));
  const cap = Math.min(GUTTER_MAX, width * GUTTER_SHARE);
  if (named.length > 0 && need(named) <= cap) {
    const at = stack(named);
    if (at) return { width: need(named), named: true, labels: placed(named, at) };
  }
  const at = stack(figures);
  if (at) return { width: need(figures), named: false, labels: placed(figures, at) };
  // Too many figures to stack: the series keep theirs, and the benchmarks are read from the list.
  const own = figures.filter((l) => !l.id.startsWith("mark:"));
  const ownAt = stack(own);
  return { width: need(own), named: false, labels: ownAt ? placed(own, ownAt) : [] };
}

function domainOf(series: readonly ChartSeries[], benchmarks: readonly Benchmark[], fixed?: readonly [number, number]): readonly [number, number] {
  if (fixed) return fixed;
  const values = [
    ...series.flatMap((s) => s.values.filter((v): v is number => v !== null && Number.isFinite(v))),
    ...benchmarks.flatMap((b) => [b.value, ...(b.band ?? [])].filter((v): v is number => v !== undefined)),
  ];
  if (values.length === 0) return [0, 1];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max((high - low) * 0.1, Math.abs(high) * 0.02, 1e-6);
  return [low - pad, high + pad];
}

/** The latest reading of a series, if it has one. */
function latest(series: ChartSeries): number | undefined {
  for (let i = series.values.length - 1; i >= 0; i--) {
    const value = series.values[i];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

/** One sentence a screen reader hears in place of the drawing: where each line ends and against what. */
export function chartSummary(props: Pick<BenchmarkChartProps, "title" | "series" | "benchmarks" | "format" | "better">): string {
  const ends = props.series.flatMap((s) => {
    const value = latest(s);
    return value === undefined ? [] : [`${s.label} ${props.format(value)}`];
  });
  const marks = (props.benchmarks ?? []).flatMap((b) => (b.value !== undefined ? [`${b.label} ${props.format(b.value)}`] : []));
  return `${props.title}. Latest: ${ends.join("; ") || "no numbers yet"}.${marks.length ? ` For comparison: ${marks.join("; ")}.` : ""}`;
}

function segments(values: readonly (number | null)[], xAt: (i: number) => number, yAt: (v: number) => number): readonly (readonly PlotPoint[])[] {
  const runs: PlotPoint[][] = [];
  let run: PlotPoint[] = [];
  values.forEach((value, i) => {
    if (value === null || !Number.isFinite(value)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push([xAt(i), yAt(value)]);
  });
  if (run.length) runs.push(run);
  return runs;
}

function Table({ x, series, format }: Pick<BenchmarkChartProps, "x" | "series" | "format">) {
  return (
    <View role="table" borderWidth={1} borderColor="borderColor" borderRadius="chip" overflow="hidden">
      <Row role="row" backgroundColor="surfaceRaised" paddingHorizontal="sm" paddingVertical="xs">
        <Text variant="caption" weight="strong" flex={1} role="columnheader">
          Period
        </Text>
        {series.map((s) => (
          <Text key={s.id} variant="caption" weight="strong" flex={1} role="columnheader" numberOfLines={1}>
            {s.label}
          </Text>
        ))}
      </Row>
      {x.map((label, i) => (
        <Row key={`${label}-${i}`} role="row" paddingHorizontal="sm" paddingVertical="2xs" borderTopWidth={1} borderTopColor="borderColor">
          <Text variant="caption" flex={1} role="rowheader">
            {label}
          </Text>
          {series.map((s) => {
            const value = s.values[i];
            return (
              <Text key={s.id} variant="caption" flex={1} tabular role="cell">
                {value === null || value === undefined ? "—" : format(value)}
              </Text>
            );
          })}
        </Row>
      ))}
    </View>
  );
}

function useMarkInk(): (kind: Benchmark["kind"]) => string {
  const inks: Record<InkRole, string> = { gold: useInk("gold"), danger: useInk("danger"), successInk: useInk("successInk"), colorSecondary: useInk("colorSecondary") };
  return (kind) => inks[BENCHMARK_STYLE[kind].ink];
}

const markValue = (b: Benchmark): number => b.value ?? Math.max(...(b.band ?? [0]));
const markFigure = (b: Benchmark, format: (value: number) => string): string => (b.band ? `${format(Math.min(...b.band))}–${format(Math.max(...b.band))}` : b.value === undefined ? "" : format(b.value));

/**
 * The benchmarks as a ranked list under the chart, highest first, with the
 * President's latest reading slotted in where it falls, for when the names
 * do not fit at the lines' ends. Each row's sample matches its line.
 */
function BenchmarkList({ benchmarks, own, format }: { readonly benchmarks: readonly Benchmark[]; readonly own?: { readonly label: string; readonly value: number; readonly ink: string } | undefined; readonly format: (value: number) => string }) {
  const markInk = useMarkInk();
  const rows = [
    ...benchmarks.map((b) => ({ id: b.id, label: b.label, value: markValue(b), figure: markFigure(b, format), ink: markInk(b.kind), style: BENCHMARK_STYLE[b.kind], band: !!b.band, own: false })),
    ...(own ? [{ id: "own", label: own.label, value: own.value, figure: format(own.value), ink: own.ink, style: { width: 3, dash: undefined }, band: false, own: true }] : []),
  ].sort((a, b) => b.value - a.value || (a.own ? -1 : 1));
  return (
    <Column gap="2xs" role="list" aria-label="Lines to compare against, highest first">
      {rows.map((row) => (
        <Row key={row.id} gap="sm" role="listitem">
          <KeySample entry={{ id: row.id, kind: "line", label: row.label, ink: { color: row.ink }, weight: row.style.width, band: row.band, ...(row.style.dash ? { dash: row.style.dash } : {}) }} />
          <Text variant="caption" flex={1} weight={row.own ? "strong" : "regular"} tone={row.own ? "primary" : "secondary"}>
            {row.label}
          </Text>
          <Text variant="caption" tabular weight={row.own ? "strong" : "regular"}>
            {row.figure}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

type Plot = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number; readonly yAt: (v: number) => number; readonly xAt: (i: number) => number };

/** The benchmark rules and bands, each kind in its own ink, weight and dash. */
function MarkLines({ benchmarks, plot }: { readonly benchmarks: readonly Benchmark[]; readonly plot: Plot }) {
  const markInk = useMarkInk();
  return (
    <G>
      {benchmarks.map((b) => {
        if (b.band) {
          const top = plot.yAt(Math.max(...b.band));
          const bottom = plot.yAt(Math.min(...b.band));
          const style = BENCHMARK_STYLE[b.kind];
          const edge = { x1: plot.left, x2: plot.right, stroke: markInk(b.kind), strokeWidth: style.width, ...(style.dash ? { strokeDasharray: style.dash } : {}) };
          // The edges are drawn full strength so a line sitting on a boundary can be told from one inside the band.
          return (
            <G key={b.id}>
              <Rect x={plot.left} y={top} width={plot.right - plot.left} height={Math.max(1, bottom - top)} fill={markInk(b.kind)} opacity={0.12} />
              <Line {...edge} y1={top} y2={top} />
              <Line {...edge} y1={bottom} y2={bottom} />
            </G>
          );
        }
        if (b.value === undefined) return null;
        const style = BENCHMARK_STYLE[b.kind];
        return <Line key={b.id} x1={plot.left} x2={plot.right} y1={plot.yAt(b.value)} y2={plot.yAt(b.value)} stroke={markInk(b.kind)} strokeWidth={style.width} {...(style.dash ? { strokeDasharray: style.dash } : {})} />;
      })}
    </G>
  );
}

/** The end-label column: each label at its stacked place, with a leader back to its line wherever it had to move. */
function EndLabels({ gutter, plot }: { readonly gutter: Gutter; readonly plot: Plot }) {
  const leader = useInk("borderColorStrong");
  const quiet = useInk("colorSecondary");
  return (
    <G>
      {gutter.labels.map((l) => (
        <G key={l.id}>
          {Math.abs(l.at - l.y) > 1.5 ? <Path d={`M${plot.right + 1} ${l.y.toFixed(1)} L${plot.right + 4} ${l.y.toFixed(1)} L${plot.right + LEADER - 3} ${l.at.toFixed(1)}`} stroke={leader} strokeWidth={1} fill="none" /> : null}
          <SvgText x={plot.right + LEADER} y={l.at + 4} fontSize={LABEL_SIZE} fontFamily={l.bold ? SANS_BOLD : SANS} fontWeight={l.bold ? "700" : "400"} fill={l.ink ?? quiet}>
            {l.text}
          </SvgText>
        </G>
      ))}
    </G>
  );
}

/** The series key: each line's sample in its own ink, weight and dash, the President's own heaviest. */
function seriesKey(series: readonly ChartSeries[], inkOf: (s: ChartSeries) => string): readonly KeyEntry[] {
  const peers = series.filter((s) => s.kind !== "self");
  return series.map((s) => {
    const dash = dashFor(s.kind, peers.indexOf(s));
    return { id: s.id, kind: "line", label: s.label, ink: { color: inkOf(s) }, weight: s.kind === "self" ? 3 : 2, ...(dash ? { dash } : {}) };
  });
}

/**
 * A reading over time against what it should be compared with: the
 * President's own line, other governments or states, the published record,
 * and benchmark lines and bands (a historical landmark, a threshold the rules
 * act on, a target). Every line is told apart by weight and dash as well as
 * color and ends in its label at the right edge, stacked so none overlaps;
 * where the names do not fit there, the lines end in their figures and the
 * benchmarks are listed by rank under the chart. The same figures are one
 * press away as a table.
 */
export function BenchmarkChart({ title, x, series, benchmarks = [], format, domain, ticks: fixedTicks, height = 240, better, unit, period, help, pressHint, level, door }: BenchmarkChartProps) {
  const [width, setWidth] = useState(0);
  const [asTable, setAsTable] = useState(false);
  const self = useInk("accent");
  const grid = useInk("borderColor");
  const axis = useInk("colorTertiary");
  const history = useInk("colorSecondary");
  const theme = useTheme();
  const [low, high] = domainOf(series, benchmarks, domain);
  const ticks = fixedTicks ?? niceTicks(low, high, 4);
  const lo = Math.min(low, ticks[0] ?? low);
  const hi = Math.max(high, ticks[ticks.length - 1] ?? high);
  const padLeft = Math.max(PAD.left, Math.ceil(Math.max(0, ...ticks.map((tick) => textWidth(format(tick), LABEL_SIZE)))) + 12);
  const plotH = height - PAD.top - PAD.bottom;
  const yAt = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const peers = series.filter((s) => s.kind !== "self");
  const roleInk = (role: ThemeInk) => String(theme[role]?.get("web") ?? self);
  const inkOf = (s: ChartSeries) => (s.ink ? roleInk(s.ink) : s.kind === "self" ? self : s.kind === "history" ? history : peerInk(peers.indexOf(s)));
  const ends = series.flatMap((s) => {
    const value = latest(s);
    return value === undefined ? [] : [{ s, value }];
  });
  const lines: readonly (EndLabel & { readonly name: string })[] = [
    ...ends.map(({ s, value }) => ({ id: s.id, y: yAt(value), name: s.label, text: format(value), bold: s.kind === "self", ...(s.kind === "self" || s.ink ? { ink: inkOf(s) } : {}) })),
    ...benchmarks.map((b) => ({ id: `mark:${b.id}`, y: yAt(b.band ? (b.band[0] + b.band[1]) / 2 : b.value ?? lo), name: b.label, text: markFigure(b, format), bold: false })),
  ];
  const named = lines.map((l) => ({ ...l, text: `${l.name} ${l.text}` }));
  const figures = lines;
  const gutter = gutterFor(width, named, figures, 4, PAD.top + plotH + 8);
  const plotW = Math.max(width - padLeft - gutter.width, 10);
  const plot: Plot = { left: padLeft, right: padLeft + plotW, top: PAD.top, bottom: PAD.top + plotH, yAt, xAt: (i) => padLeft + (x.length > 1 ? (i / (x.length - 1)) * plotW : plotW / 2) };
  const xShown = fitXLabels(x.map((text) => textWidth(text, LABEL_SIZE)), x.map((_, i) => plot.xAt(i)), plot.left - 4, plot.right + LEADER);
  const own = ends.find((e) => e.s.kind === "self");
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  return (
    <Column gap="sm">
      <ReadingHead
        title={title}
        {...(unit ? { unit } : {})}
        {...(period ? { period } : {})}
        {...(help ? { help } : {})}
        {...(level ? { level } : {})}
        {...(door ? { door } : {})}
        toggle={
          <Button kind="quiet" size="compact" icon={asTable ? "graph" : "ballot"} onPress={() => setAsTable(!asTable)}>
            {asTable ? "Chart" : "Table"}
          </Button>
        }
      />
      {asTable ? (
        <Table x={x} series={series} format={format} />
      ) : (
        <View onLayout={onLayout} height={height} aria-label={chartSummary({ title, series, benchmarks, format, better })} role="img">
          {width > 0 ? (
            <Svg width={width} height={height}>
              {ticks.map((tick) => (
                <G key={tick}>
                  <Line x1={plot.left} x2={plot.right} y1={yAt(tick)} y2={yAt(tick)} stroke={grid} strokeWidth={1} />
                  <SvgText x={plot.left - 6} y={yAt(tick) + 4} fontSize={LABEL_SIZE} fontFamily={SANS} fill={axis} textAnchor="end">
                    {format(tick)}
                  </SvgText>
                </G>
              ))}
              {xShown.map(({ index, x: at }) => (
                <SvgText key={`${x[index]}-${index}`} x={at} y={height - 8} fontSize={LABEL_SIZE} fontFamily={SANS} fill={axis} textAnchor="middle">
                  {x[index]}
                </SvgText>
              ))}
              <MarkLines benchmarks={benchmarks} plot={plot} />
              {series.map((s) =>
                segments(s.values, plot.xAt, yAt).map((run, r) =>
                  run.length > 1 ? (
                    <Path key={`${s.id}-${r}`} d={linePath(run)} stroke={inkOf(s)} strokeWidth={s.kind === "self" ? 3 : 1.75} strokeDasharray={dashFor(s.kind, peers.indexOf(s))} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  ) : (
                    <Rect key={`${s.id}-${r}`} x={run[0]![0] - 2.5} y={run[0]![1] - 2.5} width={5} height={5} fill={inkOf(s)} />
                  ),
                ),
              )}
              <EndLabels gutter={gutter} plot={plot} />
            </Svg>
          ) : null}
        </View>
      )}
      {/* A lone series is already named at its line's end or in the list, so it needs no key. */}
      {series.length > 1 || asTable || (!gutter.named && benchmarks.length === 0) ? <Key entries={seriesKey(series, inkOf)} label={`Lines in ${title}`} /> : null}
      {!asTable && width > 0 && !gutter.named && benchmarks.length > 0 ? <BenchmarkList benchmarks={benchmarks} own={own ? { label: own.s.label, value: own.value, ink: inkOf(own.s) } : undefined} format={format} /> : null}
      {!asTable && pressHint ? <PressHint>{pressHint}</PressHint> : null}
    </Column>
  );
}
