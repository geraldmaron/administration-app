import { useMemo, useState } from "react";
import { PROJECTION_ENSEMBLE_SIZE, PROJECTION_HORIZON_WEEKS, type Campaign, type ProjectionHorizon } from "@admin/engine";
import { forecastPacket, forecastSource, modelingChoice, modelingChoiceKey, modelingView, type ForecastSource, type ModelingActAlternative, type ModelingChoice, type ModelingChoiceSpec, type ModelingView } from "@admin/player-core";
import { Column, HelpButton, Icon, Row, Segmented, Text, View } from "@admin/ui";
import type { CompareProjection } from "@admin/ui/review";
import { useStoresIfReady } from "../../device/hooks";
import { fileForecastAfterAct } from "../../review/file-forecast";
import { Cell, Detail } from "./ProjectionParts";
import { cellScale } from "./readings";
import { useProjection, type ProjectionState } from "./useProjection";

const CONFIDENCE_WORDS = { low: "Low confidence", moderate: "Moderate confidence", high: "High confidence" } as const;
type Horizon = "off" | `${ProjectionHorizon}`;

function coverageWords(source: ForecastSource): string {
  if (source.coverage === undefined) return "";
  if (source.coverage >= 1) return " Your intelligence agencies can see inside this government.";
  if (source.coverage <= 0) return " Your intelligence agencies can't see inside this government, so its plans are an educated guess.";
  return ` Your intelligence agencies can see inside ${Math.round(source.coverage * 100)}% of governments.`;
}

/** Who made the forecast and how sure they are, said with every projection. */
function SourceLine({ source }: { readonly source: ForecastSource }) {
  return (
    <Row gap="sm" wrap flexShrink={1}>
      <Icon name="review" size={16} tone="colorSecondary" />
      <Text variant="caption" weight="strong" flexShrink={1}>
        {`Forecast by ${source.label}`}
      </Text>
      <Text variant="caption" tone={source.confidence === "high" ? "success" : source.confidence === "moderate" ? "secondary" : "warning"}>
        {CONFIDENCE_WORDS[source.confidence]}
      </Text>
      <HelpButton
        label="Who made this forecast"
        content={{
          title: "Who made this forecast",
          meaning: `Forecast by ${source.label}. ${CONFIDENCE_WORDS[source.confidence]}.${coverageWords(source)}`,
          steps: [
            "How sure your staff are depends on who is advising and what they know. It doesn't give the odds of landing inside the shaded range.",
            "Each run plays the game's rules forward on a copy of the world as your government sees it, as if you made no more decisions.",
            "The shaded range shows how far apart those runs landed. It isn't a percent chance, and the real result can land outside it.",
          ],
        }}
      />
    </Row>
  );
}

function statusWords(state: ProjectionState, view: ModelingView | undefined): string {
  if (state.status === "running") return view && view.members > 0 ? `${view.members} of ${PROJECTION_ENSEMBLE_SIZE} runs` : "Running";
  if (state.status === "done") return `${PROJECTION_ENSEMBLE_SIZE} runs · ${(state.ms / 1000).toFixed(1)} s`;
  if (state.status === "failed") return state.message;
  return "Off. A forecast takes a few seconds.";
}

function Control({ weeks, onWeeks, state, view, source }: { readonly weeks: ProjectionHorizon | undefined; readonly onWeeks: (weeks: ProjectionHorizon | undefined) => void; readonly state: ProjectionState; readonly view: ModelingView | undefined; readonly source: ForecastSource }) {
  const running = state.status === "running" ? state : undefined;
  const options = [{ value: "off" as Horizon, label: "Off" }, ...PROJECTION_HORIZON_WEEKS.map((horizon) => ({ value: `${horizon}` as Horizon, label: `${horizon} wk` }))];
  return (
    <Column gap="sm" padding="md" borderRadius="card" borderWidth={1} borderColor="borderColor" backgroundColor="surfaceRaised">
      <Row gap="sm" wrap between>
        <Segmented label="Look ahead" options={options} value={weeks === undefined ? "off" : (`${weeks}` as Horizon)} onChange={(next) => onWeeks(next === "off" ? undefined : (Number(next) as ProjectionHorizon))} />
        <SourceLine source={source} />
      </Row>
      <Row gap="sm" aria-live="polite">
        <Icon name="graph" size={16} tone="colorSecondary" />
        {running ? (
          <View flex={1} maxWidth={240} height={6} borderRadius="pill" backgroundColor="borderColor" overflow="hidden" role="progressbar" aria-label="Weeks forecast so far" aria-valuemin={0} aria-valuemax={running.weeksTotal} aria-valuenow={running.weeksDone}>
            <View height={6} width={`${(running.weeksDone / Math.max(1, running.weeksTotal)) * 100}%`} backgroundColor="accent" />
          </View>
        ) : null}
        <Text variant="caption" tone={state.status === "failed" ? "danger" : "secondary"}>
          {statusWords(state, view)}
        </Text>
      </Row>
    </Column>
  );
}

function slotOf(choice: ModelingChoice, view: ModelingView | undefined, selected: string | undefined, control: React.ReactNode, onAuthorize: (id: string) => void): CompareProjection {
  if (!view) return { control, perItem: {} };
  const scale = cellScale(view, choice);
  const perItem = Object.fromEntries(view.alternatives.map((alternative) => [alternative.id, <Cell key={alternative.id} alternative={alternative} view={view} scale={scale} />]));
  const picked = view.alternatives.find((alternative) => alternative.id === selected);
  return { control, perItem, onAuthorize, ...(picked ? { detail: <Detail view={view} choice={choice} selected={picked} /> } : {}) };
}

/** A screen's own options as a choice to project: each option's id and label as the list shows them, and the act its commit makes. */
export function actsChoice(title: string, against: string, baselineMeaning: string, alternatives: readonly ModelingActAlternative[]): ModelingChoiceSpec {
  return { kind: "acts", title, against, baselineMeaning, alternatives };
}

/** The projection slot for a comparison, or nothing when the choice has no projectable alternatives here. */
export function useChoiceProjection(campaign: Campaign | undefined, spec: ModelingChoiceSpec | undefined, selected: string | undefined): CompareProjection | undefined {
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
