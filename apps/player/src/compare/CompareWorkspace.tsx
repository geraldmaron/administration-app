import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { STATE_IDS, type StateId } from "@admin/world";
import { COMPARE_METRICS, COMPARE_METRIC_IDS, PEER_RULES, compareSnapshot, historyOptions, peerSet, place, resolveHistory, selfVersus, subjectKey, weekLabel, type CompareMetricId, type CompareWindow, type PeerRule, type Subject } from "@admin/player-core";
import { Pane, Tag, Button, CheckCard, Column, Icon, Page, Row, Segmented, Select, Surface, Text, View, useMedia, type MatrixRow } from "@admin/ui";
import { go } from "../shell/navigate";
import { CompareChart } from "./CompareChart";
import { RankedMatrix } from "./RankedMatrix";
import { formatterFor, unitWords } from "./format";
import { hasSubject, matrixMetricIds, ownRecordTurns, snapshotRefusals, toggleSubject } from "./model";
import { MAX_SUBJECTS, WINDOWS, type CompareAddress } from "./subjects";

const STANDING = { better: "success", worse: "danger", level: "pending" } as const;

function windowLabel(span: CompareWindow): string {
  return span === "term" ? "Your term" : `${span} weeks`;
}

function nationLabel(campaign: Campaign, id: string): string {
  const runtime = campaign.nations[id as keyof typeof campaign.nations];
  return runtime?.base.identity.name ?? id;
}

/** The President against their own past and every defined line, said as a gap. */
function SelfVersusPanel({ campaign, metric }: { readonly campaign: Campaign; readonly metric: CompareMetricId }) {
  const versus = selfVersus(campaign, metric);
  const format = formatterFor(versus.format);
  return (
    <Pane title={`How your ${versus.label.toLowerCase()} compares`} icon="favorable" line={versus.now === undefined ? versus.unavailable : `This week: ${format(versus.now)}.`}>
      <Column gap="xs" role="list">
        {versus.comparisons.map((entry) => (
          <Row key={entry.id} gap="sm" top role="listitem">
            <View minWidth={64} alignItems="flex-start">{entry.standing ? <Tag tone={STANDING[entry.standing]}>{entry.standing === "better" ? "Better" : entry.standing === "worse" ? "Worse" : "Same"}</Tag> : <Tag tone="outline">No figure</Tag>}</View>
            <Column flex={1}>
              <Text variant="label">{entry.label}{entry.value === undefined ? "" : ` · ${format(entry.value)}`}</Text>
              <Text variant="body" tone="secondary">{entry.sentence}</Text>
            </Column>
          </Row>
        ))}
      </Column>
    </Pane>
  );
}

function Matrix({ campaign, metric, subjects }: { readonly campaign: Campaign; readonly metric: CompareMetricId; readonly subjects: readonly Subject[] }) {
  const ids = useMemo(() => matrixMetricIds(metric, subjects), [metric, subjects]);
  const snapshot = useMemo(() => compareSnapshot(campaign, ids, subjects), [campaign, ids, subjects]);
  const refusals = snapshotRefusals(snapshot);
  const rows: readonly MatrixRow[] = snapshot.rows.map((row) => {
    const door = row.subject.kind === "nation" ? place.country(row.subject.id) : row.subject.kind === "state" ? place.state(row.subject.id) : undefined;
    return { id: row.id, label: row.label, values: row.values, ...(row.self ? { self: true } : {}), ...(row.reference ? { reference: true } : {}), ...(door ? { onPress: () => go(door) } : {}) };
  });
  return (
    <Pane title="Side by side" icon="graph" line="Rows from the past are there for reference and aren't ranked against today's.">
      <RankedMatrix title={`${COMPARE_METRICS[metric].label} and related numbers`} initialSort={metric} metrics={snapshot.metrics.map((entry) => ({ id: entry.id, label: entry.label, better: entry.better, format: formatterFor(entry.format), ...(entry.benchmark ? { benchmark: entry.benchmark } : {}) }))} rows={rows} />
      {refusals.length > 0 ? (
        <Column gap="2xs">
          <Text variant="label">Why some boxes are empty</Text>
          {refusals.map((refusal) => (
            <Text key={`${refusal.row}:${refusal.metric}`} variant="caption" tone="secondary">
              <Text variant="caption" weight="strong">{refusal.row}, {refusal.metric.toLowerCase()}: </Text>
              {refusal.reason}
            </Text>
          ))}
        </Column>
      ) : null}
    </Pane>
  );
}

function PeerPicker({ campaign, subjects, onToggle }: { readonly campaign: Campaign; readonly subjects: readonly Subject[]; readonly onToggle: (subject: Subject) => void }) {
  const [rule, setRule] = useState<PeerRule>("g7");
  const set = peerSet(campaign, rule);
  return (
    <Column gap="sm">
      <Segmented<PeerRule> label="Other countries, grouped by" options={PEER_RULES.map((value) => ({ value, label: peerSet(campaign, value).label }))} value={rule} onChange={setRule} />
      <Text variant="caption" tone="secondary">{set.empty ?? set.basis}</Text>
      <Row gap="xs" wrap>
        {set.nations.map((id) => (
          <Column key={id} flexBasis={170} flexGrow={1}>
            <CheckCard label={nationLabel(campaign, id)} checked={hasSubject(subjects, { kind: "nation", id })} onChange={() => onToggle({ kind: "nation", id })} />
          </Column>
        ))}
      </Row>
    </Column>
  );
}

function SubjectBuilder({ campaign, metric, subjects, onToggle }: { readonly campaign: Campaign; readonly metric: CompareMetricId; readonly subjects: readonly Subject[]; readonly onToggle: (subject: Subject) => void }) {
  const spec = COMPARE_METRICS[metric];
  const histories = historyOptions(spec);
  const states = STATE_IDS.filter((id) => campaign.states[id]);
  const [state, setState] = useState<StateId | undefined>(undefined);
  return (
    <Pane title="Compare with" icon="layerBlocs" line={`Up to ${MAX_SUBJECTS} lines, counting yours. ${spec.label} can be shown for: ${spec.subjects.map((kind) => ({ self: "you", "self-at": "your own past weeks", nation: "other countries", state: "the states", history: "real history" })[kind]).join(", ")}. Missing figures retain their source's explanation.`}>
      <Column gap="xs">
        <Text variant="label">Your own past</Text>
        <Row gap="xs" wrap>
          {ownRecordTurns(campaign.turn).map((option) => (
            <Column key={option.turn} flexBasis={170} flexGrow={1}>
              <CheckCard label={option.label} detail={weekLabel(option.turn)} checked={hasSubject(subjects, { kind: "self-at", turn: option.turn })} onChange={() => onToggle({ kind: "self-at", turn: option.turn })} />
            </Column>
          ))}
          {ownRecordTurns(campaign.turn).length === 0 ? <Text variant="caption" tone="secondary">This is your first week, so there's no earlier week to compare.</Text> : null}
        </Row>
      </Column>
      <PeerPicker campaign={campaign} subjects={subjects} onToggle={onToggle} />
      <Column gap="xs">
        <Text variant="label">A state</Text>
        <Row gap="sm" wrap>
          <Column flex={1} minWidth={200}>
            <Select label="State to add" options={states.map((id) => ({ value: id, label: campaign.states[id]?.base.name ?? id }))} value={state} onChange={setState} placeholder="No state added" />
          </Column>
          <Button kind="secondary" size="compact" icon="mapPin" disabled={!state} onPress={() => state && onToggle({ kind: "state", id: state })}>
            {state && hasSubject(subjects, { kind: "state", id: state }) ? "Remove the state" : "Add the state"}
          </Button>
        </Row>
      </Column>
      <Column gap="xs">
        <Text variant="label">Real history</Text>
        {histories.length === 0 ? <Text variant="caption" tone="secondary">There's no real history for {spec.label.toLowerCase()} measured this way, so the game doesn't make one up.</Text> : null}
        <Row gap="xs" wrap>
          {histories.map((option) => (
            <Column key={option.id} flexBasis={220} flexGrow={1}>
              <CheckCard label={option.label} {...(option.ok ? {} : { detail: option.reason })} disabled={!option.ok} checked={hasSubject(subjects, { kind: "history", benchmarkId: option.id })} onChange={() => onToggle({ kind: "history", benchmarkId: option.id })} />
            </Column>
          ))}
        </Row>
      </Column>
    </Pane>
  );
}

function Chosen({ campaign, metric, subjects, onToggle }: { readonly campaign: Campaign; readonly metric: CompareMetricId; readonly subjects: readonly Subject[]; readonly onToggle: (subject: Subject) => void }) {
  const name = (subject: Subject): string => {
    switch (subject.kind) {
      case "self": return "You";
      case "self-at": return `You, ${weekLabel(subject.turn).toLowerCase()}`;
      case "nation": return nationLabel(campaign, subject.id);
      case "state": return campaign.states[subject.id]?.base.name ?? subject.id;
      case "history": return resolveHistory(COMPARE_METRICS[metric], subject.benchmarkId).label;
    }
  };
  return (
    <Row gap="xs" wrap aria-label="Lines in the chart">
      <Text variant="caption" tone="secondary">
        Lines in the chart:
      </Text>
      {subjects.map((subject) => subject.kind === "self" ? (
        <Tag key="self" tone="info" icon="flag">You</Tag>
      ) : (
        <Button key={subjectKey(subject)} kind="secondary" size="compact" iconAfter="close" label={`Remove ${name(subject)}`} onPress={() => onToggle(subject)}>
          {name(subject)}
        </Button>
      ))}
    </Row>
  );
}

/**
 * The comparison workspace: one reading at a time, set against the defined
 * benchmarks, the President's own past, other governments and the states,
 * as a chart, a ranked matrix and the gaps in words. Every figure is the
 * comparison engine's; where it has none, it says why.
 */
export function CompareWorkspace({ campaign, address, onAddress }: { readonly campaign: Campaign; readonly address: CompareAddress; readonly onAddress: (address: CompareAddress) => void }) {
  const media = useMedia();
  const { metric, subjects, window: span } = address;
  const spec = COMPARE_METRICS[metric];
  const toggle = (subject: Subject) => onAddress({ ...address, subjects: toggleSubject(subjects, subject) });
  return (
    <Page eyebrow="Office of the Chief of Staff · performance" icon="graph" title="Compare" lede={`Your ${spec.label.toLowerCase()} beside the available records.`}>
      <Surface pad="lg">
        <Row gap="md" wrap top>
          <Column flex={1} minWidth={220} gap="2xs">
            <Select<CompareMetricId> label="What to compare" options={COMPARE_METRIC_IDS.map((id) => ({ value: id, label: COMPARE_METRICS[id].label, detail: COMPARE_METRICS[id].visibility === "assessed" ? "An estimate from U.S. spy agencies. Not every country has one." : unitWords(COMPARE_METRICS[id].format, COMPARE_METRICS[id].unit) }))} value={metric} onChange={(next) => onAddress({ ...address, metric: next })} />
            <Row gap="xs">
              <Icon name="info" size={14} tone="colorSecondary" />
              <Text variant="caption" tone="secondary" flex={1}>
                {unitWords(spec.format, spec.unit)} · {spec.better === "up" ? "higher is better" : "lower is better"}{spec.visibility === "assessed" ? " · a spy agency estimate, not a public number" : ""}
              </Text>
            </Row>
          </Column>
          <Segmented<string> label="Time span" options={WINDOWS.map((entry) => ({ value: String(entry), label: windowLabel(entry) }))} value={String(span)} onChange={(next) => onAddress({ ...address, window: next === "term" ? "term" : Number(next) })} />
        </Row>
      </Surface>
      <Row gap="lg" top wrap={!media.desktop}>
        <Column flex={3} minWidth={300} gap="lg">
          <Pane title="Over time" icon="graph" line={`${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"} over ${span === "term" ? "your term" : `the last ${span} weeks`}.`}>
            <Chosen campaign={campaign} metric={metric} subjects={subjects} onToggle={toggle} />
            <CompareChart campaign={campaign} metric={metric} subjects={subjects} window={span} more={false} height={media.phone ? 220 : 280} />
          </Pane>
        </Column>
        <Column flex={2} minWidth={300} gap="lg">
          <SelfVersusPanel campaign={campaign} metric={metric} />
          <SubjectBuilder campaign={campaign} metric={metric} subjects={subjects} onToggle={toggle} />
        </Column>
      </Row>
      <Matrix campaign={campaign} metric={metric} subjects={subjects} />
    </Page>
  );
}
