import { EvidencePanel } from "@admin/ui-web";
import type { ModelingAlternativeView, ModelingLine, ModelingMetricView } from "@admin/player-core";

// One reading's projected paths: per alternative, the median of the runs as a
// line and their range as a band behind it. The plot is an SVG stretched to its
// box with strokes that do not scale; every word on it is HTML placed by
// percentage, so text stays crisp and readable at any width.

export type ChartSeries = { readonly id: string; readonly label: string; readonly index: number; readonly baseline: boolean };

export function chartSeries(alternatives: readonly ModelingAlternativeView[]): readonly ChartSeries[] {
  return alternatives.map((alternative, index) => ({ id: alternative.id, label: alternative.label, index, baseline: alternative.baseline }));
}

/** About three round-number ticks across the data, never finer than `minStep`, so a tick never repeats the label of its neighbor. */
function ticks(low: number, high: number, minStep: number): readonly number[] {
  const raw = Math.max(minStep, (high - low) / 3 || Math.abs(high) || 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((multiple) => multiple * power).find((candidate) => candidate >= raw) ?? 10 * power;
  const first = Math.ceil(low / step) * step;
  return Array.from({ length: Math.floor((high - first) / step + 1e-9) + 1 }, (_, index) => first + index * step);
}

function domainOf(metric: ModelingMetricView): readonly [number, number] {
  const values = metric.lines.flatMap((line) => line.points.flatMap((point) => [point.low, point.high]));
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A flat series still gets a readable window: two points either side for a share, a fifth of a percent of the level for money.
  const floor = metric.unit === "money" ? Math.max(1, Math.abs(high) * 0.002) : 0.04;
  const pad = Math.max((floor - (high - low)) / 2, (high - low) * 0.15);
  const bounded = metric.unit === "points";
  return [bounded ? Math.max(0, low - pad) : low - pad, bounded ? Math.min(1, high + pad) : high + pad];
}

type Scale = { readonly x: (week: number) => number; readonly y: (value: number) => number };

function linePath(line: ModelingLine, scale: Scale): { readonly median: string; readonly band: string } {
  const median = line.points.map((point, week) => `${week === 0 ? "M" : "L"}${scale.x(week)},${scale.y(point.median)}`).join("");
  const upper = line.points.map((point, week) => `${week === 0 ? "M" : "L"}${scale.x(week)},${scale.y(point.high)}`).join("");
  const lower = [...line.points].reverse().map((point, back) => `L${scale.x(line.points.length - 1 - back)},${scale.y(point.low)}`).join("");
  return { median, band: `${upper}${lower}Z` };
}

/** End labels pushed apart so none overlaps the next; positions are percentages of the plot height. */
function spread(ends: readonly { readonly id: string; readonly at: number }[], gap: number): ReadonlyMap<string, number> {
  const sorted = [...ends].sort((a, b) => a.at - b.at);
  const placed = sorted.reduce<{ readonly id: string; readonly at: number }[]>((out, end) => [...out, { id: end.id, at: Math.max(end.at, (out.at(-1)?.at ?? -Infinity) + gap) }], []);
  const overflow = Math.max(0, (placed.at(-1)?.at ?? 0) - 100);
  return new Map(placed.map((end) => [end.id, Math.max(0, end.at - overflow)]));
}

type Styled = { readonly line: ModelingLine; readonly style: ChartSeries };

function Plot({ styled, scale, grid }: { readonly styled: readonly Styled[]; readonly scale: Scale; readonly grid: readonly number[] }) {
  return (
    <div className="mdl-chart__plot">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mdl-chart__svg" focusable="false">
        {grid.map((tick) => (
          <line key={tick} className="mdl-chart__grid" x1="0" x2="100" y1={scale.y(tick)} y2={scale.y(tick)} />
        ))}
        {styled.map(({ line, style }) => {
          const path = linePath(line, scale);
          return (
            <g key={style.id} className="mdl-series" data-series={style.index} data-baseline={style.baseline || undefined}>
              <path className="mdl-chart__band" d={path.band} />
              <path className="mdl-chart__median" d={path.median} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type ProjectionChartProps = {
  readonly metric: ModelingMetricView;
  readonly series: readonly ChartSeries[];
  readonly dates: readonly string[];
  readonly format: (value: number) => string;
  /** The large chart names each line at its end; small multiples lean on the legend. */
  readonly size: "hero" | "small";
};

export function ProjectionChart({ metric, series, dates, format, size }: ProjectionChartProps) {
  const [low, high] = domainOf(metric);
  const weeks = dates.length - 1;
  const scale: Scale = { x: (week) => (week / Math.max(1, weeks)) * 100, y: (value) => (1 - (value - low) / (high - low || 1)) * 100 };
  // One point is the finest a share's label prints; a label printed twice is dropped.
  const grid = ticks(low, high, metric.unit === "points" ? 0.01 : 0).filter((tick, index, all) => all.findIndex((other) => format(other) === format(tick)) === index);
  const styled: readonly Styled[] = metric.lines.flatMap((line) => {
    const style = series.find((entry) => entry.id === line.alternative);
    return style ? [{ line, style }] : [];
  });
  const ends = spread(styled.map(({ line, style }) => ({ id: style.id, at: scale.y(line.points.at(-1)!.median) })), size === "hero" ? 11 : 16);
  const summary = styled.map(({ line, style }) => {
    const end = line.points.at(-1)!;
    return `${style.label}: ${format(end.median)} (range ${format(end.low)} to ${format(end.high)})`;
  });
  return (
    <figure className="mdl-chart" data-size={size}>
      <figcaption className="mdl-chart__title flex flex-wrap items-center justify-between gap-2"><span>{metric.label}</span><EvidencePanel title={`${metric.label} · projected observations`} label="Data table">
        <p>The observations below are forecast runs, not recorded history. Median and low–high run range are in the same units as the chart.</p>
        {styled.map(({ line, style }) => <section key={style.id} className="grid gap-2"><h3 className="m-0 text-sm font-semibold">{style.label}{style.baseline ? " · comparison" : ""}</h3><table className="ui-evidence-table ui-table--stack"><caption>{metric.label} · {style.label}</caption><thead><tr><th scope="col">Date</th><th scope="col">Median</th><th scope="col">Run range</th></tr></thead><tbody>{line.points.map((point, index) => <tr key={index}><th scope="row" data-label="Date">{dates[index] ?? `Week ${index}`}</th><td data-label="Median">{format(point.median)}</td><td data-label="Run range">{format(point.low)}–{format(point.high)}</td></tr>)}</tbody></table></section>)}
      </EvidencePanel></figcaption>
      <div className="mdl-chart__frame" aria-hidden="true">
        <div className="mdl-chart__axis">
          {grid.map((tick) => (
            <span key={tick} className="mdl-chart__tick" style={{ insetBlockStart: `${scale.y(tick)}%` }}>
              {format(tick)}
            </span>
          ))}
        </div>
        <Plot styled={styled} scale={scale} grid={grid} />
        {size === "hero" ? (
          <div className="mdl-chart__labels">
            {styled.map(({ line, style }) => (
              <span key={style.id} className="mdl-chart__end mdl-series" data-series={style.index} style={{ insetBlockStart: `${ends.get(style.id) ?? 0}%` }}>
                <strong>{format(line.points.at(-1)!.median)}</strong> {style.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mdl-chart__dates" aria-hidden="true">
        <span>Today</span>
        <span>{dates.at(-1)}</span>
      </div>
      <p className="ui-visually-hidden">
        {metric.label} at {dates.at(-1)}, median of the runs: {summary.join("; ")}.
      </p>
    </figure>
  );
}
