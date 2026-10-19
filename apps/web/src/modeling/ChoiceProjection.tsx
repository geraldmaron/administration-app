import { useMemo, useState, type ReactNode } from "react";
import { PROJECTION_ENSEMBLE_SIZE, PROJECTION_HORIZON_WEEKS, type Campaign, type ProjectionHorizon } from "@admin/engine";
import { forecastPacket, forecastSource, modelingChoice, modelingChoiceKey, modelingView, type ForecastSource, type ModelingAlternativeView, type ModelingActAlternative, type ModelingChoice, type ModelingChoiceSpec, type ModelingLine, type ModelingView } from "@admin/player-core";
import { Button, EvidencePanel, Icon, Tag, type ChoiceProjection } from "@admin/ui-web";
import { useStoresIfReady } from "../app/hooks";
import { fileForecastAfterAct } from "./file-forecast";
import { ProjectionChart, chartSeries, type ChartSeries } from "./ProjectionChart";
import { DotRange, Figure, GroupList, MoverList, axisOf, deltaValence, formatFor } from "./Readings";
import { useProjection, type ProjectionState } from "./useProjection";
import "./modeling.css";

// Projection inside the list a choice is made from: a header control to run it,
// one cell per option with approval's projected change against not acting, and
// the picked option's paths and groups when it is opened. Off until asked for,
// because a run costs seconds of every core; rows fill as their runs finish.

const CONFIDENCE_WORDS = { low: "Low confidence", moderate: "Moderate confidence", high: "High confidence" } as const;

/** Who made the forecast and how sure they are, said with every projection. */
function SourceLine({ source }: { readonly source: ForecastSource }) {
  const valence = source.confidence === "high" ? "good" : source.confidence === "moderate" ? "neutral" : "watch";
  const read = source.coverage === undefined ? "" : source.coverage >= 1 ? " The services read this government." : source.coverage <= 0 ? " The services cannot read this government, so its intentions are a plausible guess." : ` The services read ${Math.round(source.coverage * 100)}% of governments.`;
  return (
    <span className="mdl-control__source flex flex-wrap items-center gap-2">
      <Tag tone="neutral" icon="review">{source.label}</Tag><span className="ui-valence-ink" data-valence={valence}>{CONFIDENCE_WORDS[source.confidence]}</span>
      <EvidencePanel title="Forecast source and confidence" label="Forecast method"><p>Forecast by {source.label}. {CONFIDENCE_WORDS[source.confidence]}.{read}</p><p>Staff confidence reflects the adviser and available information. It does not assign odds to the shaded range. Each run plays the same rules forward on a copy of the world as your government believes it, with no further presidential decisions. The range is the spread across those runs, not a probability interval. Outcomes can fall outside it.</p></EvidencePanel>
    </span>
  );
}

function Control({ weeks, onWeeks, state, view, source }: { readonly weeks: ProjectionHorizon | undefined; readonly onWeeks: (weeks: ProjectionHorizon | undefined) => void; readonly state: ProjectionState; readonly view: ModelingView | undefined; readonly source: ForecastSource }) {
  const running = state.status === "running" ? state : undefined;
  return (
    <div className="mdl-control" role="group" aria-label="Project forward">
      <span className="mdl-control__label">
        <Icon name="graph" size={16} /> Project forward
      </span>
      <span className="mdl-control__horizons">
        {PROJECTION_HORIZON_WEEKS.map((horizon) => (
          <Button key={horizon} kind={weeks === horizon ? "primary" : "secondary"} size="sm" aria-pressed={weeks === horizon} onClick={() => onWeeks(weeks === horizon ? undefined : horizon)}>
            {horizon} weeks
          </Button>
        ))}
      </span>
      <span className="mdl-control__status" aria-live="polite">
        {running ? (
          <>
            <span className="mdl-control__track" role="progressbar" aria-label="Projected weeks run" aria-valuemin={0} aria-valuemax={running.weeksTotal} aria-valuenow={running.weeksDone}>
              <span className="mdl-control__fill" style={{ inlineSize: `${(running.weeksDone / Math.max(1, running.weeksTotal)) * 100}%` }} />
            </span>
            {view && view.members > 0 ? `${view.members} of ${PROJECTION_ENSEMBLE_SIZE} runs` : "Running"}
          </>
        ) : state.status === "done" ? (
          `${PROJECTION_ENSEMBLE_SIZE} runs · ${(state.ms / 1000).toFixed(1)} s`
        ) : state.status === "failed" ? (
          <span className="mdl-problem">{state.message}</span>
        ) : (
          "Off. A run takes a few seconds."
        )}
      </span>
      <SourceLine source={source} />
    </div>
  );
}

/** Approval's median path for one alternative with its band, and not acting dashed behind it. */
function Spark({ line, reference, low, high, index }: { readonly line: ModelingLine; readonly reference: ModelingLine | undefined; readonly low: number; readonly high: number; readonly index: number }) {
  const weeks = line.points.length - 1;
  const x = (week: number) => (week / Math.max(1, weeks)) * 100;
  const y = (value: number) => (1 - (value - low) / (high - low || 1)) * 100;
  const path = (values: readonly number[]) => values.map((value, week) => `${week === 0 ? "M" : "L"}${x(week)},${y(value)}`).join("");
  const band = `${path(line.points.map((point) => point.high))}${[...line.points].reverse().map((point, back) => `L${x(weeks - back)},${y(point.low)}`).join("")}Z`;
  return (
    <svg className="mdl-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {reference ? (
        <g className="mdl-series" data-series={0} data-baseline>
          <path className="mdl-chart__median" d={path(reference.points.map((point) => point.median))} />
        </g>
      ) : null}
      <g className="mdl-series" data-series={index}>
        <path className="mdl-chart__band" d={band} />
        <path className="mdl-chart__median" d={path(line.points.map((point) => point.median))} />
      </g>
    </svg>
  );
}

type CellContext = { readonly view: ModelingView; readonly scale: number; readonly approvalDomain: readonly [number, number]; readonly baselineId: string };

function Cell({ alternative, index, context }: { readonly alternative: ModelingAlternativeView; readonly index: number; readonly context: CellContext }) {
  const lines = context.view.metrics.find((metric) => metric.metric === "approval")!.lines;
  const line = lines.find((entry) => entry.alternative === alternative.id);
  const reference = lines.find((entry) => entry.alternative === context.baselineId);
  const [low, high] = context.approvalDomain;
  const head = <span className="mdl-cell__label">Approval in {context.view.weeks} weeks, projected</span>;
  if (alternative.refused !== undefined) return <div className="mdl-proj">{head}<span className="mdl-proj__quiet">Not projectable: {alternative.refused}</span></div>;
  if (!line) return <div className="mdl-proj">{head}<span className="mdl-proj__quiet">Projecting…</span></div>;
  if (alternative.baseline) {
    const end = line.points.at(-1)!;
    return (
      <div className="mdl-proj">
        {head}
        <span className="mdl-proj__quiet">The comparison: {formatFor("points")(end.median)} by {context.view.weekDates.at(-1)}</span>
        <Spark line={line} reference={undefined} low={low} high={high} index={index} />
      </div>
    );
  }
  const approval = alternative.deltas[0];
  if (!approval) return <div className="mdl-proj">{head}<span className="mdl-proj__quiet">Projecting…</span></div>;
  return (
    <div className="mdl-proj" role="img" aria-label={`Approval change versus the comparison in ${context.view.weeks} weeks: ${approval.text}. Projected level ${formatFor("points")(line.points.at(-1)!.median)}, run range ${formatFor("points")(line.points.at(-1)!.low)} to ${formatFor("points")(line.points.at(-1)!.high)}. ${alternative.sureness ?? ""}`}>
      {head}
      <DotRange spread={approval} scale={context.scale} valence={deltaValence(approval)} split={approval.agreement === "mixed"} />
      <Figure text={approval.text} valence={deltaValence(approval)} />
      <Spark line={line} reference={reference} low={low} high={high} index={index} />
    </div>
  );
}

const DETAIL_METRICS = ["approval", "removalPressure", "stability", "standing", "militaryReadiness", "treasury"];

function Detail({ view, choice, selected, series }: { readonly view: ModelingView; readonly choice: ModelingChoice; readonly selected: ModelingAlternativeView; readonly series: readonly ChartSeries[] }) {
  if (selected.baseline) return <p className="mdl-note">Pick an option to see its projected paths against {choice.against}.</p>;
  if (selected.refused !== undefined || selected.deltas.length === 0) return null;
  const baselineId = choice.alternatives.find((entry) => entry.baseline)!.id;
  const shown = series.filter((entry) => entry.id === selected.id || entry.id === baselineId);
  const scale = axisOf([...selected.helped, ...selected.hurt], "points");
  const movers = view.movers.filter((mover) => mover.alternative === selected.id);
  return (
    <div className="mdl-detail">
      <p className="mdl-note">
        A staff forecast using {selected.paired} of {PROJECTION_ENSEMBLE_SIZE} runs. Solid line: this option’s median. Shaded band: run range. Dashed line: {choice.against}. Outcomes can fall outside the range.
      </p>
      <EvidencePanel title="What shapes public opinion today">
        <p>These are current judgments and their recorded drivers. The projected differences below compare each option with {choice.against}.</p>
        <ul>
          {view.currentJudgments.map((judgment) => <li key={judgment.driver}>
            <strong>{judgment.label}:</strong> {judgment.leadingDetail ?? "No material driver is identified in the current assessment."}
          </li>)}
        </ul>
      </EvidencePanel>
      <div className="mdl-multiples">
        {DETAIL_METRICS.map((key) => {
          const metric = view.metrics.find((entry) => entry.metric === key)!;
          const lines = metric.lines.filter((line) => shown.some((entry) => entry.id === line.alternative));
          return <ProjectionChart key={key} metric={{ ...metric, lines }} series={shown} dates={view.weekDates} format={formatFor(metric.unit)} size="small" />;
        })}
      </div>
      <div className="mdl-detail__lists">
        <div className="mdl-groups__side">
          <h4 className="mdl-groups__head">Biggest moves</h4>
          {movers.length > 0 ? <MoverList movers={movers} /> : <p className="mdl-note">Nothing moves a twentieth of a point.</p>}
        </div>
        <GroupList title="Groups helped" moves={selected.helped} scale={scale} empty="No group gains half a point." />
        <GroupList title="Groups hurt" moves={selected.hurt} scale={scale} empty="No group loses half a point." />
      </div>
    </div>
  );
}

function cellContext(view: ModelingView, choice: ModelingChoice): CellContext {
  const baselineId = choice.alternatives.find((entry) => entry.baseline)!.id;
  const approvals = view.alternatives.flatMap((alternative) => (alternative.deltas[0] ? [alternative.deltas[0]] : []));
  const points = view.metrics.find((metric) => metric.metric === "approval")!.lines.flatMap((line) => line.points.flatMap((point) => [point.low, point.high]));
  const pad = Math.max(0.005, (Math.max(...points) - Math.min(...points)) * 0.1);
  return { view, scale: axisOf(approvals, "points"), approvalDomain: [Math.min(...points) - pad, Math.max(...points) + pad], baselineId };
}

function slotOf(choice: ModelingChoice, view: ModelingView | undefined, selected: string | undefined, control: ReactNode, onAuthorize: (id: string) => void): ChoiceProjection {
  if (!view) return { control, perItem: {} };
  const series = chartSeries(view.alternatives);
  const context = cellContext(view, choice);
  const perItem = Object.fromEntries(view.alternatives.map((alternative, index) => [alternative.id, <Cell key={alternative.id} alternative={alternative} index={index} context={context} />]));
  const picked = view.alternatives.find((alternative) => alternative.id === selected);
  return { control, perItem, onAuthorize, ...(picked ? { detail: <Detail view={view} choice={choice} selected={picked} series={series} /> } : {}) };
}

/** A screen's own options as a choice to project: each option's id and label as the list shows them, and the act its commit makes. */
export function actsChoice(title: string, against: string, baselineMeaning: string, alternatives: readonly ModelingActAlternative[]): ModelingChoiceSpec {
  return { kind: "acts", title, against, baselineMeaning, alternatives };
}

/** The projection slot for a choice list, or nothing when the choice has no projectable alternatives here. */
export function useChoiceProjection(campaign: Campaign | undefined, spec: ModelingChoiceSpec | undefined, selected: string | undefined): ChoiceProjection | undefined {
  const store = useStoresIfReady();
  const [weeks, setWeeks] = useState<ProjectionHorizon | undefined>(undefined);
  // Keyed on the choice's content: a screen hands a fresh object each render, and a decision's alternatives are not free to rebuild.
  const key = spec ? modelingChoiceKey(spec) : undefined;
  const choice = useMemo(() => (campaign && spec ? modelingChoice(campaign, spec) : undefined), [campaign, key]);
  const state = useProjection(campaign, choice ? spec : undefined, weeks);
  const runs = state.status === "running" || state.status === "done" ? state.runs : undefined;
  const view = useMemo(() => (campaign && choice && runs && weeks && runs.length > 0 ? modelingView(campaign, choice, runs, weeks) : undefined), [campaign, choice, runs, weeks]);
  const source = useMemo(() => (campaign && spec ? forecastSource(campaign, spec) : undefined), [campaign, key]);
  if (!choice || !campaign || !spec || !source) return undefined;
  const control = <Control weeks={weeks} onWeeks={setWeeks} state={state} view={view} source={source} />;
  // The forecast shown for the option taken goes on the Record behind the act: the median and range of approval at the horizon.
  const onAuthorize = (id: string) => {
    const line = view?.metrics.find((metric) => metric.metric === "approval")?.lines.find((entry) => entry.alternative === id);
    const option = choice.alternatives.find((entry) => entry.id === id);
    if (!store || !line || !option || option.baseline || !weeks) return;
    const packet = forecastPacket(campaign, { source, subject: choice.title, option: option.label, weeks, approval: line.points.at(-1)! });
    if (packet) fileForecastAfterAct(store, campaign, packet);
  };
  return slotOf(choice, weeks === undefined ? undefined : view, selected, control, onAuthorize);
}

