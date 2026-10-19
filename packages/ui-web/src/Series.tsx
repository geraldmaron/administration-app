import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { GaugeTone } from "./Gauge";
import { Button } from "./Button";
import { EvidencePanel } from "./EvidencePanel";

export type SeriesProps = {
  readonly label: string;
  /** Oldest first. A missing observation is a gap, never zero. */
  readonly values: readonly (number | null)[];
  readonly domain?: readonly [number, number];
  readonly format: (value: number) => string;
  readonly splitAt?: number;
  readonly splitLabel?: string;
  readonly reference?: { readonly value: number; readonly label: string };
  readonly tone?: GaugeTone;
  readonly unitLabel?: string;
  readonly timeRange?: readonly [string, string];
  readonly showDomain?: boolean;
  readonly compact?: boolean;
  readonly variant?: "line" | "area" | "step";
  /** Ordered numeric dates for unequal observation spacing. Omit for an indexed series. */
  readonly positions?: readonly number[];
  /** Recorded observation labels, not wall-clock time. Enables explicit finite replay. */
  readonly labels?: readonly string[];
  readonly interactive?: boolean;
  readonly selectedIndex?: number;
  readonly onIndexChange?: (index: number) => void;
};

const HEIGHT = 180;
const PAD = 8;

function usePlotWidth() {
  const ref = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(240);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(Math.max(1, element.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function plot(values: SeriesProps["values"], domain: readonly [number, number], width: number, height: number, positions?: readonly number[]) {
  const [low, high] = domain;
  const span = high - low || 1;
  const first = positions?.[0];
  const last = positions?.[values.length - 1];
  const dated = positions?.length === values.length && first !== undefined && last !== undefined && last > first && positions.every((at, i) => Number.isFinite(at) && (i === 0 || at >= positions[i - 1]!));
  return values.map((value, index) => value === null || !Number.isFinite(value) ? null : {
    x: PAD + (dated ? (positions![index]! - first!) / (last! - first!) : index / Math.max(1, values.length - 1)) * (width - PAD * 2),
    y: height - PAD - ((Math.min(high, Math.max(low, value)) - low) / span) * (height - PAD * 2),
  });
}

function path(points: ReturnType<typeof plot>, step = false): string {
  let previous = false;
  return points.map((point) => {
    if (!point) { previous = false; return ""; }
    const result = previous && step ? `H${point.x.toFixed(2)} V${point.y.toFixed(2)}` : `${previous ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    previous = true;
    return result;
  }).join(" ");
}

/** Close each known run independently: missing observations never become filled evidence. */
function areaPath(points: ReturnType<typeof plot>, baseline: number): string {
  const runs: NonNullable<ReturnType<typeof plot>[number]>[][] = [];
  for (const point of points) {
    if (!point) { runs.push([]); continue; }
    if (runs.length === 0) runs.push([]);
    runs[runs.length - 1]!.push(point);
  }
  return runs.filter((run) => run.length > 1).map((run) => `${path(run)} L${run[run.length - 1]!.x} ${baseline} L${run[0]!.x} ${baseline} Z`).join(" ");
}

function summary({ values, format, splitAt, splitLabel }: SeriesProps): string {
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (known.length === 0) return "No known readings yet.";
  const missing = values.length - known.length;
  const inherited = splitAt !== undefined && splitAt > 0 ? ` The first ${splitAt} ${splitLabel ? `are ${splitLabel}` : "came before you"}.` : "";
  return `${known.length} reading${known.length === 1 ? "" : "s"}, from ${format(known[0]!)} to ${format(known[known.length - 1]!)}; lowest ${format(Math.min(...known))}, highest ${format(Math.max(...known))}.${missing ? ` ${missing} unknown observations shown as gaps.` : ""}${inherited}`;
}

function useReplay(index: number, count: number, choose: (index: number) => void) {
  const [playing, setPlaying] = useState(false);
  const restarting = useRef(false);
  useEffect(() => {
    if (!playing) return;
    if (restarting.current) {
      if (index !== 0) return;
      restarting.current = false;
    }
    if (index >= count - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => choose(index + 1), 800);
    return () => window.clearTimeout(timer);
  }, [playing, index, count, choose]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  return { playing, pause: () => { restarting.current = false; setPlaying(false); }, toggle: () => {
    if (!playing && index >= count - 1) { restarting.current = true; choose(0); }
    setPlaying((was) => !was);
  } };
}

function SeriesPlot({ values, domain = [0, 1], splitAt, reference, interactive, compact, format, variant, positions, index, detail }: Pick<SeriesProps, "values" | "domain" | "splitAt" | "reference" | "interactive" | "compact" | "format" | "variant" | "positions"> & { readonly index: number; readonly detail: boolean }) {
  const { ref, width } = usePlotWidth();
  const gradient = useId();
  const height = detail ? compact ? 96 : HEIGHT : 64;
  const pts = plot(values, domain, width, height, positions);
  const selected = pts[index];
  const split = splitAt !== undefined ? Math.max(0, splitAt - 1) : -1;
  const after = split >= 0 ? pts.slice(split) : pts;
  const refY = reference ? plot([reference.value], domain, width, height)[0]?.y : undefined;
  return (
      <div className="ui-series__graph">
        {detail ? <div className="ui-series__domain" aria-label="Scale"><span>{format(domain[1])}</span><span>{format(domain[0])}</span></div> : null}
        <svg ref={ref} className="ui-series__plot" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".24" /><stop offset="100%" stopColor="currentColor" stopOpacity=".02" /></linearGradient></defs>
          {detail ? [0, .5, 1].map((fraction) => <line key={fraction} className="ui-series__grid" x1={0} x2={width} y1={PAD + fraction * (height - PAD * 2)} y2={PAD + fraction * (height - PAD * 2)} />) : null}
          {variant === "area" ? <path className="ui-series__area" fill={`url(#${gradient})`} d={areaPath(interactive ? pts.slice(0, index + 1) : after, height - PAD)} /> : null}
          {refY !== undefined ? <line className="ui-series__reference" x1={0} x2={width} y1={refY} y2={refY} /> : null}
          {split >= 0 ? <path className="ui-series__line ui-series__line--before" d={path(pts.slice(0, split + 1), variant === "step")} /> : null}
          {interactive ? <path className="ui-series__line ui-series__line--context" d={path(pts, variant === "step")} /> : null}
          <path className="ui-series__line" d={path(interactive ? pts.slice(0, index + 1) : after, variant === "step")} />
          {interactive && selected ? <line className="ui-series__cursor" x1={selected.x} x2={selected.x} y1={0} y2={height} /> : null}
          {selected ? <circle className="ui-series__now" cx={selected.x} cy={selected.y} r={3} /> : null}
        </svg>
      </div>
  );
}

/** A responsive trend or a detailed recorded history; replay never advances simulation time. */
export function Series(props: SeriesProps) {
  const { label, values, domain = [0, 1], reference, tone = "reading", format, unitLabel, timeRange, showDomain, labels, interactive, onIndexChange } = props;
  const id = useId();
  const detail = showDomain || interactive;
  const [localIndex, setLocalIndex] = useState(values.length - 1);
  const index = Math.max(0, Math.min(interactive ? props.selectedIndex ?? localIndex : values.length - 1, values.length - 1));
  const choose = onIndexChange ?? setLocalIndex;
  const replay = useReplay(index, values.length, choose);
  const candidate = values[index];
  const selectedValue = candidate != null && Number.isFinite(candidate) ? candidate : null;
  return (
    <figure className="ui-series" data-tone={tone} data-detail={detail || undefined} data-compact={props.compact || undefined} aria-labelledby={`${id}-label`}>
      <figcaption id={`${id}-label`} className="ui-series__label">{label}</figcaption>
      {unitLabel ? <p className="ui-series__note">{unitLabel}</p> : null}
      {interactive ? <output className="ui-series__selected">{labels?.[index] ?? `Observation ${index + 1}`}: {selectedValue == null ? "Unknown" : format(selectedValue)}</output> : null}
      <SeriesPlot {...props} domain={domain} index={index} detail={!!detail} />
      {timeRange ? <div className="ui-series__range"><span>{timeRange[0]}</span><span>{timeRange[1]}</span></div> : null}
      <p className={detail ? "ui-series__note" : "ui-visually-hidden"}>{summary(props)}</p>
      {reference ? <p className="ui-series__note">{reference.label}</p> : null}
      {interactive && values.length > 1 ? <div className="ui-series__controls">
        <Button kind="secondary" size="sm" aria-pressed={replay.playing} onClick={replay.toggle}>{replay.playing ? "Pause replay" : "Replay history"}</Button>
        <input type="range" min={0} max={values.length - 1} value={index} aria-label={`${label}: recorded observation`} aria-valuetext={`${labels?.[index] ?? `Observation ${index + 1}`}: ${selectedValue == null ? "Unknown" : format(selectedValue)}`} onChange={(event) => { replay.pause(); choose(Number(event.target.value)); }} />
      </div> : null}
      {detail ? <div className="ui-series__evidence">
        <EvidencePanel title={`${label}: recorded observations`} label={`Inspect ${values.length} observations`}>
          <p className="ui-series__note">{summary(props)}{unitLabel ? ` ${unitLabel}` : ""}</p>
          <table className="ui-evidence-table"><caption>{label}{timeRange ? ` · ${timeRange[0]}–${timeRange[1]}` : ""}</caption>
            <thead><tr><th scope="col">Observation</th><th scope="col">Recorded value</th></tr></thead>
            <tbody>{values.map((value, i) => <tr key={i}><th scope="row">{labels?.[i] ?? `Observation ${i + 1}`}</th><td>{value == null || !Number.isFinite(value) ? "Unknown" : format(value)}</td></tr>)}</tbody>
          </table>
        </EvidencePanel>
        <ol className="ui-visually-hidden" aria-label={`${label}: accessible observations`}>{values.map((value, i) => <li key={i}>{labels?.[i] ?? `Observation ${i + 1}`}: {value == null || !Number.isFinite(value) ? "Unknown" : format(value)}</li>)}</ol>
      </div> : null}
    </figure>
  );
}
