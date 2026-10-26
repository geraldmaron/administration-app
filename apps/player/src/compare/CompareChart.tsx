import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { compareSeries, type CompareMetricId, type CompareWindow, type Subject } from "@admin/player-core";
import { BenchmarkChart, Button, Column, Icon, Row, Text } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { go } from "../shell/navigate";
import { chartModel, type ChartModel } from "./chart";
import { compareHref } from "./subjects";

/** The words a refused subject is shown in: who, and what is missing. */
export function Refusals({ model }: { readonly model: Pick<ChartModel, "refusals"> }) {
  if (model.refusals.length === 0) return null;
  return (
    <Column gap="xs" role="list" aria-label="Not shown, and why">
      {model.refusals.map((refusal) => (
        <Row key={refusal.id} gap="xs" top role="listitem">
          <Icon name="statusBlocked" size={16} tone="warningInk" />
          <Text variant="caption" flex={1}>
            <Text variant="caption" weight="strong">
              {refusal.label}:{" "}
            </Text>
            {refusal.reason}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

/** Where each line and benchmark comes from, one sentence each. */
export function ChartNotes({ model }: { readonly model: Pick<ChartModel, "notes"> }) {
  if (model.notes.length === 0) return null;
  return (
    <Column gap="2xs">
      {model.notes.map((note) => (
        <Text key={note.id} variant="caption" tone="tertiary">
          <Text variant="caption" weight="strong" tone="secondary">
            {note.label}.{" "}
          </Text>
          {note.note}
        </Text>
      ))}
    </Column>
  );
}

const TERMS: Readonly<Partial<Record<CompareMetricId, { readonly id: string; readonly label: string }>>> = {
  approval: { id: "approval-rating", label: "Approval rating" },
  stability: { id: "political-stability", label: "Political stability" },
  militaryReadiness: { id: "military-readiness", label: "Readiness" },
  standing: { id: "standing-abroad", label: "International standing" },
};

const periodWords = (span: CompareWindow): string => (span === "term" ? "Your term so far, by week" : `The last ${span} weeks, by week`);

function chartHelp(metric: CompareMetricId, better: ChartModel["better"]) {
  const term = TERMS[metric];
  return {
    meaning: `Your line is the thick one. Each thinner dashed line is something you chose to compare with, such as another country, a state, one of your own past weeks, or a past presidency. A gold line is a fixed reference from the record. ${better === "up" ? "Higher" : "Lower"} is better for this reading.`,
    ...(term ? { term: termDoor(term.id, term.label) } : {}),
  };
}

/**
 * A reading's course for the President and whoever it is set against, with
 * every defined benchmark, the refusals said in words, and a door to the full
 * comparison workspace on the same reading.
 */
export function CompareChart({ campaign, metric, subjects, window, title, height, more = true }: { readonly campaign: Campaign; readonly metric: CompareMetricId; readonly subjects: readonly Subject[]; readonly window: CompareWindow; readonly title?: string; readonly height?: number; readonly more?: boolean }) {
  const model = useMemo(() => chartModel(compareSeries(campaign, metric, subjects, window)), [campaign, metric, subjects, window]);
  return (
    <Column gap="sm">
      <BenchmarkChart title={title ?? model.title} unit={model.unit} period={periodWords(window)} help={chartHelp(metric, model.better)} x={model.x} series={model.series} benchmarks={model.benchmarks} format={model.format} {...(model.domain ? { domain: model.domain } : {})} better={model.better} {...(height ? { height } : {})} />
      <Refusals model={model} />
      <ChartNotes model={model} />
      {more ? (
        <Row>
          <Button kind="secondary" size="compact" icon="graph" onPress={() => go(compareHref({ metric, subjects, window }))}>
            Compare {model.title.toLowerCase()} further
          </Button>
        </Row>
      ) : null}
    </Column>
  );
}
