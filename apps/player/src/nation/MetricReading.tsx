import type { ReactNode } from "react";
import type { Campaign, EffectActor, MetricSet } from "@admin/engine";
import { METRIC_MEANINGS, METRIC_PROVENANCE, formatDate, nowReadings, place, recordRows, type ReadingMove } from "@admin/player-core";
import { Column, Pressable, ReadingFrame, Row, Text } from "@admin/ui";
import { Collection, Diverging } from "@admin/ui/nation";
import { Panel } from "@admin/ui/world";
import { CompareChart } from "../compare/CompareChart";
import { go } from "../shell/navigate";
import { VALENCE_TEXT, valenceOf } from "./format";
import { toneKey } from "./keys";

/** A long enough window to hold the inherited quarter and the whole term so far. */
const WHOLE_RECORD = 520;

/**
 * One national reading where it is decided: the settled figure and its week's
 * move, its course against every benchmark the comparison engine defines, and
 * what it means. The Brief and this panel read the same `nowReadings`.
 */
export function MetricReading({ campaign, metric, children }: { readonly campaign: Campaign; readonly metric: keyof MetricSet; readonly children?: ReactNode }) {
  const reading = nowReadings(campaign).find((entry) => entry.key === metric);
  if (!reading) return null;
  const week = reading.week;
  return (
    <Panel title={reading.label} icon="graph" lede={METRIC_MEANINGS[metric]}>
      <Row gap="lg" wrap top>
        <Column gap="2xs" minWidth={160}>
          <Text variant="figure" tone={VALENCE_TEXT[valenceOf(reading.stance)]} tabular>
            {reading.figure}
          </Text>
          {week ? (
            <Text variant="label" tone={week.direction === "flat" ? "secondary" : week.direction === "up" ? "success" : "danger"}>
              {week.direction === "up" ? "▲" : week.direction === "down" ? "▼" : "▬"} {week.text} since last week
            </Text>
          ) : (
            <Text variant="caption" tone="secondary">
              Your first week isn't over yet, so there's nothing to compare.
            </Text>
          )}
        </Column>
        <Column flex={1} minWidth={280}>
          <CompareChart campaign={campaign} metric={metric} subjects={[{ kind: "self" }]} window={WHOLE_RECORD} title={`${reading.label}, week by week, with markers to compare against`} />
        </Column>
      </Row>
      {children}
      <Text variant="caption" tone="tertiary">
        {METRIC_PROVENANCE[metric]}
      </Text>
    </Panel>
  );
}

function MoveLine({ move, scale }: { readonly move: ReadingMove; readonly scale: number }) {
  return (
    <Row gap="sm">
      <Text variant="caption" tone="secondary" width={120} numberOfLines={1}>
        {move.label}
      </Text>
      <Diverging value={move.delta} scale={scale} />
      <Text variant="caption" weight="strong" tone={move.delta < 0 ? "danger" : "success"} minWidth={72} textAlign="right">
        {move.text}
      </Text>
    </Row>
  );
}

/**
 * The Record's entries that moved one reading, newest first. Each row draws
 * only that reading's move, so every bar in the list is on one scale.
 */
export function MetricActs({ campaign, metric, actor, title, empty, bare }: { readonly campaign: Campaign; readonly metric: keyof MetricSet; readonly actor?: EffectActor; readonly title: string; readonly empty: string; readonly bare?: boolean }) {
  const rows = recordRows(campaign, actor)
    .filter((row) => row.moves.some((move) => move.key === metric))
    .map((row) => ({ ...row, moves: row.moves.filter((move) => move.key === metric) }));
  const scale = Math.max(Number.EPSILON, ...rows.flatMap((row) => row.moves.map((move) => Math.abs(move.delta))));
  const list = (
    <ReadingFrame title={`What moved ${title.toLowerCase().replace(/^what /, "").replace(/ did to it$/, "")}`} unit="Points moved, all bars on one scale" legend={[{ id: "mid", kind: "tick", label: "Center line: no change", ink: "borderColorStrong", weight: 1 }, ...toneKey({ good: "Moved it up (right of the line)", bad: "Moved it down (left of the line)" })]} pressHint="Press an entry to open it on the Record." help={{ meaning: "Each entry on the Record moved this reading. A bar to the right pushed it up and a bar to the left pushed it down, all drawn on one scale so a longer bar is a bigger move." }}>
      <Collection
        items={rows}
        initial={6}
        noun="entries"
        empty={empty}
        render={(row) => (
          <Pressable key={row.id} role="link" aria-label={`${formatDate(row.date)}: ${row.headline}. See it on the Record`} href={place.event(row.id)} onPress={() => go(place.event(row.id))} padding="sm" borderWidth={1} borderColor="borderColor" borderRadius="chip" gap="xs">
            <Text variant="caption" tone="tertiary">
              {formatDate(row.date)}
            </Text>
            <Text variant="label">{row.headline}</Text>
            {row.moves.map((move) => (
              <MoveLine key={move.key} move={move} scale={scale} />
            ))}
          </Pressable>
        )}
      />
    </ReadingFrame>
  );
  // A screen that frames the list in its own card asks for it bare.
  return bare ? list : (
    <Panel title={title} icon="record">
      {list}
    </Panel>
  );
}
