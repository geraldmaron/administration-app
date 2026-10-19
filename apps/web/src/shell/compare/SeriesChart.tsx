import { EvidencePanel } from "@admin/ui-web";
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { axisTicks, nearestIndex, niceTicks, spreadLabels } from "./chart-scale";
import { useWidth } from "./useWidth";

import "./series-chart.css";

export type ChartPoint = {
  readonly x: number;
  /** Undefined draws a break: a period with no figure is a gap, not a zero. */
  readonly y: number | undefined;
  /** Names the period: "2019-Q3". */
  readonly label: string;
};

export type ChartSeries = {
  readonly id: string;
  /** In full, as the readout and the table say it: "United States (published)". */
  readonly label: string;
  /** The name written at the end of the line. */
  readonly short: string;
  /** `played` is this administration's own line (solid, heavy); `reference` is someone else's record. */
  readonly tone: "played" | "reference";
  /** Tells apart several lines by color and dash together. */
  readonly variant?: 0 | 1 | 2 | 3;
  readonly points: readonly ChartPoint[];
};

export type SeriesChartProps = {
  readonly label: string;
  readonly series: readonly ChartSeries[];
  readonly format: (value: number) => string;
  /** What the shared horizontal axis counts: "Months since the start". */
  readonly xLabel: string;
  /** How a position reads in the readout where no series names it. */
  readonly formatX?: (x: number) => string;
  /** Says how far apart two readings at one position are, shown where exactly two lines have a figure there. */
  readonly formatGap?: (gap: number) => string;
  readonly empty?: string;
};

const TOP = 12;
const BOTTOM = 32;
const LEFT = 48;
const GUTTER = 128;
const DIRECT_MIN = 560;

type Run = readonly { readonly x: number; readonly y: number }[];

function runsOf(points: readonly ChartPoint[]): readonly Run[] {
  const out: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const point of points) {
    if (point.y === undefined) {
      if (current.length > 0) out.push(current);
      current = [];
    } else current.push({ x: point.x, y: point.y });
  }
  if (current.length > 0) out.push(current);
  return out;
}

const valueAt = (series: ChartSeries, x: number): number | undefined => series.points.find((point) => point.x === x)?.y;

function Swatch({ series }: { readonly series: ChartSeries }) {
  return (
    <svg className="sc-swatch" viewBox="0 0 24 6" aria-hidden="true" focusable="false" data-tone={series.tone} data-variant={series.variant}>
      <line x1="1" x2="23" y1="3" y2="3" />
    </svg>
  );
}

/**
 * Lines over one shared axis, drawn at the room they have: round ticks, each
 * line named at its end, and a readout that follows the pointer or the arrow
 * keys and says every line's figure at that position. A table behind "Every
 * figure" carries every reading for anyone who cannot use the plot.
 */
export function SeriesChart({ label, series, format, xLabel, formatX = String, formatGap, empty = "Nothing to draw yet." }: SeriesChartProps) {
  const id = useId();
  const { ref, width: measured } = useWidth<HTMLDivElement>();
  const width = Math.max(260, measured || 640);
  const direct = width >= DIRECT_MIN;
  const height = width < 480 ? 232 : 288;
  const xs = useMemo(() => [...new Set(series.flatMap((entry) => entry.points.map((point) => point.x)))].sort((a, b) => a - b), [series]);
  const values = series.flatMap((entry) => entry.points.flatMap((point) => (point.y === undefined ? [] : [point.y])));
  const played = series.find((entry) => entry.tone === "played");
  const latest = useMemo(() => {
    const own = played?.points.filter((point) => point.y !== undefined).map((point) => point.x) ?? [];
    return own.length > 0 ? Math.max(...own) : xs.at(-1);
  }, [played, xs]);
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const cursor = picked !== undefined && xs.includes(picked) ? picked : latest;
  if (values.length === 0 || xs.length === 0) {
    return (
      <figure className="sc" aria-labelledby={`${id}-label`}>
        <figcaption id={`${id}-label`} className="sc__label">
          {label}
        </figcaption>
        <p className="sc__empty">{empty}</p>
      </figure>
    );
  }
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const low = ticks[0]!;
  const high = ticks[ticks.length - 1]!;
  const right = direct ? GUTTER : 12;
  const [xMin, xMax] = [xs[0]!, xs[xs.length - 1]!];
  const px = (x: number) => LEFT + ((x - xMin) / (xMax - xMin || 1)) * (width - LEFT - right);
  const py = (y: number) => height - BOTTOM - ((y - low) / (high - low || 1)) * (height - BOTTOM - TOP);
  const xTicks = axisTicks(xMin, xMax, width < 480 ? 4 : 6);
  const ends = series.flatMap((entry) => {
    const last = entry.points.filter((point) => point.y !== undefined).at(-1);
    return last ? [{ id: entry.id, x: px(last.x), y: py(last.y!) + 4, series: entry }] : [];
  });
  const slots = spreadLabels(ends, 16, 120, TOP + 6, height - BOTTOM - 4);
  const move = (index: number) => setPicked(xs[Math.min(xs.length - 1, Math.max(0, index))]);
  const onPointer = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = ((event.clientX - box.left) / (box.width || 1)) * width;
    setPicked(xs[nearestIndex(xs.map(px), at)]);
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = cursor === undefined ? 0 : xs.indexOf(cursor);
    const target = event.key === "ArrowLeft" ? index - 1 : event.key === "ArrowRight" ? index + 1 : event.key === "Home" ? 0 : event.key === "End" ? xs.length - 1 : undefined;
    if (target === undefined) return;
    event.preventDefault();
    move(target);
  };
  const readings = series.map((entry) => ({ entry, value: cursor === undefined ? undefined : valueAt(entry, cursor) }));
  const named = readings.find((reading) => cursor !== undefined && reading.entry.points.some((point) => point.x === cursor))?.entry.points.find((point) => point.x === cursor)?.label;
  const figures = readings.filter((reading) => reading.value !== undefined);
  const gap = formatGap && figures.length === 2 ? formatGap(figures[0]!.value! - figures[1]!.value!) : undefined;
  return (
    <figure className="sc" aria-labelledby={`${id}-label`}>
      <figcaption id={`${id}-label`} className="sc__label">
        {label}
      </figcaption>
      <div className="sc__readout" role="status" aria-live="polite">
        <span className="sc__when">{cursor === undefined ? "" : (named ?? `${xLabel} ${formatX(cursor)}`)}</span>
        <ul className="sc__figures">
          {readings.map(({ entry, value }) => (
            <li key={entry.id} className="sc__figure" data-missing={value === undefined ? "true" : undefined}>
              <Swatch series={entry} />
              <span className="sc__name">{entry.label}</span>
              <strong className="sc__value">{value === undefined ? "No figure" : format(value)}</strong>
            </li>
          ))}
        </ul>
        {gap ? <span className="sc__gap">{gap}</span> : null}
      </div>
      <div ref={ref} className="sc__plot" tabIndex={0} role="group" aria-label={`${label}. Use the left and right arrow keys to read each point.`} onKeyDown={onKey}>
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" focusable="false">
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="sc__grid" data-base={tick === low ? "true" : undefined} x1={LEFT} x2={width - right} y1={py(tick)} y2={py(tick)} />
              <text className="sc__tick" x={LEFT - 8} y={py(tick)} textAnchor="end" dominantBaseline="middle">
                {format(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text key={tick} className="sc__tick" x={px(tick)} y={height - BOTTOM + 16} textAnchor={tick === xMin ? "start" : tick === xMax ? "end" : "middle"}>
              {formatX(tick)}
            </text>
          ))}
          <text className="sc__axis-title" x={width - right} y={height - 4} textAnchor="end">
            {xLabel}
          </text>
          {cursor === undefined ? null : <line className="sc__cursor" x1={px(cursor)} x2={px(cursor)} y1={TOP} y2={height - BOTTOM} />}
          {[...series].sort((a, b) => Number(a.tone === "played") - Number(b.tone === "played")).map((entry) =>
            runsOf(entry.points).map((run, index) =>
              run.length === 1 ? (
                <circle key={`${entry.id}-${index}`} className="sc__dot" data-tone={entry.tone} data-variant={entry.variant} cx={px(run[0]!.x)} cy={py(run[0]!.y)} r={3} />
              ) : (
                <path key={`${entry.id}-${index}`} className="sc__line" data-tone={entry.tone} data-variant={entry.variant} d={run.map((point, i) => `${i === 0 ? "M" : "L"}${px(point.x).toFixed(1)} ${py(point.y).toFixed(1)}`).join(" ")} />
              ),
            ),
          )}
          {cursor === undefined
            ? null
            : readings.map(({ entry, value }) =>
                value === undefined ? null : <circle key={entry.id} className="sc__dot sc__dot--cursor" data-tone={entry.tone} data-variant={entry.variant} cx={px(cursor)} cy={py(value)} r={4.5} />,
              )}
          {direct
            ? ends.map((end) => (
                <text key={end.id} className="sc__end" data-tone={end.series.tone} data-variant={end.series.variant} x={end.x + 8} y={slots.get(end.id) ?? end.y} dominantBaseline="middle">
                  {end.series.short}
                </text>
              ))
            : null}
          <rect className="sc__hit" x={LEFT} y={TOP} width={Math.max(0, width - LEFT - right)} height={height - TOP - BOTTOM} onPointerMove={onPointer} onPointerDown={onPointer} />
        </svg>
      </div>
      <EvidencePanel title={`${label}: observations`} label="View observations"><div className="sc__table">
        <div className="sc__table-scroll">
          <table>
            <caption className="ui-visually-hidden">{label}</caption>
            <thead>
              <tr>
                <th scope="col">{xLabel}</th>
                {series.map((entry) => (
                  <th key={entry.id} scope="col">
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((x) => (
                <tr key={x}>
                  <th scope="row">{formatX(x)}</th>
                  {series.map((entry) => {
                    const point = entry.points.find((candidate) => candidate.x === x);
                    return <td key={entry.id}>{point === undefined ? "" : point.y === undefined ? "No figure" : format(point.y)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></EvidencePanel>
    </figure>
  );
}
