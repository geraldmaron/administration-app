import { PROJECTION_ENSEMBLE_SIZE } from "@admin/engine";
import type { ModelingAlternativeView, ModelingBand, ModelingChoice, ModelingGroupMove, ModelingMover, ModelingView } from "@admin/player-core";
import { CardGrid, Column, HelpButton, ReadingFrame, Row, Surface, Text, View } from "@admin/ui";
import { FanChart, fanKeyEntries, type FanLine } from "@admin/ui/review";
import { termRelated } from "../../handbook/term-door";
import { axisOf, deltaValence, formatFor, glyph, onAxis, type CellScale, type Valence } from "./readings";

const INK = { good: "successInk", bad: "danger", neutral: "colorSecondary" } as const;
const TONE = { good: "success", bad: "danger", neutral: "secondary" } as const;
const pct = (share: number): `${number}%` => `${(share * 100).toFixed(2)}%` as `${number}%`;

function Figure({ text, valence }: { readonly text: string; readonly valence: Valence }) {
  return (
    <Text variant="label" weight="strong" tone={TONE[valence]} tabular>
      {`${glyph(text)} ${text}`}
    </Text>
  );
}

/** A dot at the median and a line across the runs' range, on an axis with zero marked; hollow when the runs disagree on direction. */
function DotRange({ spread, scale, valence, split }: { readonly spread: ModelingBand; readonly scale: number; readonly valence: Valence; readonly split: boolean }) {
  const ink = INK[valence];
  return (
    <View height={14} position="relative" justifyContent="center" aria-hidden>
      <View position="absolute" left="50%" width={1} height={14} backgroundColor="colorTertiary" />
      <View position="absolute" left={pct(onAxis(spread.low, scale))} width={pct(onAxis(spread.high, scale) - onAxis(spread.low, scale))} height={2} backgroundColor={ink} />
      <View position="absolute" left={pct(onAxis(spread.median, scale))} marginLeft={-5} width={10} height={10} borderRadius="pill" borderWidth={2} borderColor={ink} backgroundColor={split ? "surface" : ink} />
    </View>
  );
}

/** One option's approval at the horizon against the comparison, laid into its card. */
export function Cell({ alternative, view, scale }: { readonly alternative: ModelingAlternativeView; readonly view: ModelingView; readonly scale: CellScale }) {
  const lines = view.metrics.find((metric) => metric.metric === "approval")?.lines ?? [];
  const line = lines.find((entry) => entry.alternative === alternative.id);
  const head = (
    <Text variant="eyebrow" tone="secondary">
      {`Likely approval in ${view.weeks} weeks`}
    </Text>
  );
  const quiet = (words: string) => (
    <Column gap="2xs">
      {head}
      <Text variant="caption" tone="secondary">
        {words}
      </Text>
    </Column>
  );
  if (alternative.refused !== undefined) return quiet(`Can't forecast this. ${alternative.refused}`);
  if (!line) return quiet("Projecting…");
  const end = line.points.at(-1)!;
  const approval = alternative.deltas[0];
  if (!approval) return quiet("Projecting…");
  const valence = deltaValence(approval);
  return (
    <Column gap="2xs" role="img" aria-label={`Change in approval compared with approving nothing, in ${view.weeks} weeks: ${approval.text}. Likely level ${formatFor("points")(end.median)}, with runs ranging from ${formatFor("points")(end.low)} to ${formatFor("points")(end.high)}. ${alternative.sureness ?? ""}`}>
      {head}
      <DotRange spread={approval} scale={scale.scale} valence={valence} split={approval.agreement === "mixed"} />
      <Row between>
        <Figure text={approval.text} valence={valence} />
        <Text variant="caption" tone="secondary">{`${formatFor("points")(end.median)} likely`}</Text>
      </Row>
    </Column>
  );
}

const DETAIL_METRICS = ["approval", "removalPressure", "stability", "standing", "militaryReadiness", "treasury"];

function MoverList({ movers }: { readonly movers: readonly ModelingMover[] }) {
  if (movers.length === 0) return <Text variant="caption" tone="secondary">Nothing changes by even a twentieth of a point.</Text>;
  return (
    <Column gap="xs" role="list">
      {movers.map((mover) => (
        <Row key={mover.metric} between gap="sm" role="listitem">
          <Text variant="body">{mover.label}</Text>
          <Figure text={mover.text} valence={deltaValence(mover)} />
        </Row>
      ))}
    </Column>
  );
}

function GroupList({ title, moves, scale, empty }: { readonly title: string; readonly moves: readonly ModelingGroupMove[]; readonly scale: number; readonly empty: string }) {
  return (
    <Column gap="xs" flexGrow={1}>
      <Text variant="eyebrow" tone="secondary">
        {title}
      </Text>
      {moves.length === 0 ? (
        <Text variant="caption" tone="secondary">
          {empty}
        </Text>
      ) : (
        moves.map((move) => {
          const valence: Valence = move.median > 0 ? "good" : "bad";
          return (
            <Column key={move.cohort} gap="2xs">
              <Row between gap="sm">
                <Text variant="caption" flex={1} numberOfLines={1}>
                  {move.name}
                </Text>
                <Figure text={move.text} valence={valence} />
              </Row>
              <DotRange spread={move} scale={scale} valence={valence} split={false} />
            </Column>
          );
        })
      )}
    </Column>
  );
}

/** The picked option's projected paths against the comparison, its biggest moves and the groups it helps and hurts. */
export function Detail({ view, choice, selected }: { readonly view: ModelingView; readonly choice: ModelingChoice; readonly selected: ModelingAlternativeView }) {
  if (selected.refused !== undefined || selected.deltas.length === 0) return null;
  const baselineId = choice.alternatives.find((entry) => entry.baseline)?.id;
  const shown = view.alternatives.map((alternative, index) => ({ alternative, index })).filter(({ alternative }) => alternative.id === selected.id || alternative.id === baselineId);
  const scale = axisOf([...selected.helped, ...selected.hurt], "points");
  return (
    <Surface level="raised" pad="lg">
      <Column gap="md">
        <Row gap="sm" wrap>
          <Text variant="body" tone="secondary" flex={1} minWidth={240}>
            {`A staff forecast from ${selected.paired} of ${PROJECTION_ENSEMBLE_SIZE} runs. The solid line is this option's middle result, and the shaded band is the range across runs. The dashed line is ${choice.against}. Real results can land outside the range.`}
          </Text>
          <HelpButton label="What shapes public opinion today" content={{ title: "What shapes public opinion today", meaning: `This is how people see things now and what's driving it. The forecast compares each option with ${choice.against}.`, steps: view.currentJudgments.map((judgment) => `${judgment.label}: ${judgment.leadingDetail ?? "Nothing big is driving this right now."}`), related: termRelated("approval-rating", "approval rating") }} />
        </Row>
        <ReadingFrame title="What your staff expects, week by week" unit="Each reading on its own scale" period={`The next ${view.weekDates.length} weeks`} legend={fanKeyEntries(shown.map(({ alternative, index }) => ({ id: alternative.id, label: alternative.label, baseline: alternative.baseline, index })))} help={{ meaning: "Each chart is a forecast for one reading. The solid line is the middle result across many simulated runs of this option, and the shaded band is where most of those runs ended up. The dashed line is what happens if you take the comparison option instead.", steps: ["Find where the line ends on the right. That is the most likely result.", "A wide band means your staff is less sure.", "Real results can land outside the band."] }}>
          <Row wrap gap="lg">
            {DETAIL_METRICS.flatMap((key) => {
              const metric = view.metrics.find((entry) => entry.metric === key);
              if (!metric) return [];
              const lines: readonly FanLine[] = shown.flatMap(({ alternative, index }) => {
                const line = metric.lines.find((entry) => entry.alternative === alternative.id);
                return line ? [{ id: alternative.id, label: alternative.label, baseline: alternative.baseline, index, points: line.points }] : [];
              });
              return [<FanChart key={key} title={metric.label} lines={lines} startLabel="Today" endLabel={view.weekDates.at(-1) ?? ""} format={formatFor(metric.unit)} bounded={metric.unit === "points"} />];
            })}
          </Row>
        </ReadingFrame>
        <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }} gap="xl">
          <Column gap="xs" flexGrow={1}>
            <Text variant="eyebrow" tone="secondary">
              Biggest changes
            </Text>
            <MoverList movers={view.movers.filter((mover) => mover.alternative === selected.id)} />
          </Column>
          <GroupList title="Groups helped" moves={selected.helped} scale={scale} empty="No group gains half a point." />
          <GroupList title="Groups hurt" moves={selected.hurt} scale={scale} empty="No group loses half a point." />
        </CardGrid>
      </Column>
    </Surface>
  );
}
