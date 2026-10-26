import { useMemo, useState, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { URGENCY_WORDS, collectionElements, collectionReports, formatDate, type CollectionReading, type CollectionReportRow, type PdbReading, type SecurityAssessmentRow, type TaskingRow } from "@admin/player-core";
import { Pane, Tag, BriefPaper, Button, Column, Empty, Icon, Meter, PressRow, ReadingFrame, Row, Text, View, classificationKey, type KeyEntry } from "@admin/ui";
import { Pips, SortTable, type RowPress, type TableColumn } from "@admin/ui/world";
import { useMarking } from "../shell/classification";
import { SealOf, TopicLaw, go } from "../world/parts";
import type { SecurityAct } from "./params";

type Open = (act: SecurityAct) => void;

const URGENCY_GLYPH = { hard: "escalate", soft: "caution", ambient: "info" } as const;
const URGENCY_STATUS = { hard: "danger", soft: "warning", ambient: "pending" } as const;
const CONFIDENCE_STEP: Readonly<Record<string, number>> = { low: 1, moderate: 2, high: 3 };

const EVEN_KEY: readonly KeyEntry[] = [{ id: "even", kind: "tick", label: "Even chance, the middle of the ladder", ink: "gold" }];

const sentence = (text: string): string => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/** How sure the community is, as three notches beside the word. */
function Confidence({ confidence }: { readonly confidence: string | undefined }) {
  const step = confidence ? CONFIDENCE_STEP[confidence] : undefined;
  return (
    <Row gap="xs">
      <Pips lit={step ?? 0} steps={3} valence="info" size={6} />
      <Text variant="caption">{confidence ? `${confidence[0]!.toUpperCase()}${confidence.slice(1)} confidence` : "No confidence level given"}</Text>
    </Row>
  );
}

/**
 * The morning's security items as the paper they are: the daily brief under
 * the marking the engine stamps on it, on the situation-room surface, the
 * items that need the President first. The frame's banner carries the same
 * marking while the brief is on screen.
 */
export function Daily({ campaign, pdb }: { readonly campaign: Campaign; readonly pdb: PdbReading }) {
  useMarking(pdb.marking.level);
  const caveat = pdb.marking.caveats.join("//");
  return (
    <Column gap="sm">
      <BriefPaper
        seal={<SealOf id="INST-ODNI" size={56} />}
        date={formatDate(campaign.calendar)}
        items={pdb.items.map((item) => ({ id: item.id, headline: item.headline }))}
        empty="Nothing from overnight intelligence needs your attention."
        level={classificationKey(pdb.marking.level)}
        {...(caveat ? { caveat } : {})}
      />
      {pdb.items.length > 0 ? (
        <Row gap="sm" wrap role="list" aria-label="Your staff's triage of the brief">
          <Text variant="caption" tone="secondary">Your staff's triage:</Text>
          {pdb.items.map((item, index) => (
            <Row key={item.id} gap="xs" role="listitem">
              <Text variant="caption" weight="strong">{`${index + 1}.`}</Text>
              <Tag tone={URGENCY_STATUS[item.urgency]} icon={URGENCY_GLYPH[item.urgency]}>{URGENCY_WORDS[item.urgency]}</Tag>
            </Row>
          ))}
        </Row>
      ) : null}
      <Text variant="caption" tone="secondary">{pdb.marking.helper}</Text>
    </Column>
  );
}

function filedWords(row: TaskingRow): string {
  if (!row.product) return "No report yet.";
  if (row.product.status === "findings") return `Filed ${row.product.filed}.`;
  return row.product.status === "no-result" ? `Filed ${row.product.filed}. It found nothing useful.` : `Filed ${row.product.filed}. This is an older note.`;
}

function taskingColumns(onOpen: Open, seals: ReadonlyMap<string, string>): readonly TableColumn<TaskingRow>[] {
  return [
    { id: "element", label: "Agency", width: 170, sort: (row) => row.element, render: (row) => <Row gap="xs"><SealOf id={seals.get(row.element) ?? row.element} name={row.elementName} size={28} /><Column><Text variant="label">{row.element}</Text><Text variant="caption" tone="tertiary">{row.discipline}</Text></Column></Row> },
    { id: "target", label: "Looking at", width: 300, sort: (row) => row.target, render: (row) => <Column gap="2xs"><Text variant="label">{row.target}</Text><Text variant="caption" tone="secondary">{row.question}</Text>{row.focus ? <Text variant="caption" tone="tertiary">Focus: {row.focus}.</Text> : null}{row.note ? <Text variant="caption" tone="tertiary">Your note: {sentence(row.note)}</Text> : null}</Column> },
    { id: "weeks", label: "Weeks", detail: "running", width: 90, align: "end", first: "descending", sort: (row) => row.weeks, render: (row) => <Text variant="label" tabular>{row.weeks}</Text> },
    { id: "filed", label: "Last report", detail: "how sure", width: 200, first: "descending", sort: (row) => (row.product?.confidence ? CONFIDENCE_STEP[row.product.confidence] : undefined), render: (row) => <Column gap="2xs"><Confidence confidence={row.product?.status === "findings" ? row.product.confidence : undefined} /><Text variant="caption" tone="secondary">{filedWords(row)}</Text></Column> },
    { id: "act", label: "Change", width: 130, render: (row) => <Button kind="secondary" size="compact" onPress={() => onOpen({ kind: "close-tasking", id: row.id })}>Stop</Button> },
  ];
}

/** The whole row opens the file the request is aimed at, where it has one. */
const OPEN_TARGET: RowPress<TaskingRow> = {
  href: (row) => row.href!,
  onPress: (row) => {
    if (row.href) go(row.href);
  },
  label: (row) => `Open ${row.target}`,
  enabled: (row) => row.href !== undefined,
};

/** Standing taskings, each with the confidence of what it last filed, and the way to point the community at something else. */
export function CollectionLedger({ reading, onOpen }: { readonly reading: CollectionReading; readonly onOpen: Open }) {
  const seals = useMemo(() => new Map(collectionElements().map((element) => [element.abbr, element.id] as const)), []);
  return (
    <Pane title="Intelligence gathering" icon="instrumentCovert" count={reading.taskings.length} actions={<TopicLaw topic="intelligence-collection" />}>
      <SortTable caption="Open requests" columns={taskingColumns(onOpen, seals)} rows={reading.taskings} rowKey={(row) => row.id} initialSort={{ key: "weeks", direction: "descending" }} rowPress={OPEN_TARGET} empty="You haven't asked any agency to gather anything yet." />
      {reading.declined > 0 ? <Text variant="caption" tone="secondary">Agency lawyers turned down {reading.declined} {reading.declined === 1 ? "request" : "requests"}{reading.referred > 0 ? `, and ${reading.referred} ${reading.referred === 1 ? "has" : "have"} gone to an inspector general, the official who looks into wrongdoing inside an agency` : ""}. They stay on the record.</Text> : null}
      <Row><Button kind="secondary" size="compact" icon="intel" onPress={() => onOpen({ kind: "task" })}>Ask an agency</Button></Row>
    </Pane>
  );
}

const ENTRY = { gap: "xs", paddingVertical: "sm", paddingHorizontal: "xs", borderTopWidth: 1, borderTopColor: "borderColor" } as const;

/** One filed paper in a list: the whole entry opens what it is about, and its own buttons still do their own jobs. */
function Entry({ href, label, children }: { readonly href: string | undefined; readonly label: string; readonly children: ReactNode }) {
  if (!href) return <Column {...ENTRY}>{children}</Column>;
  return (
    <PressRow label={label} href={href} onPress={() => go(href)} {...ENTRY}>
      {children}
    </PressRow>
  );
}

/** The cue at the end of an entry's first line that the entry itself opens something. */
function Opens() {
  return (
    <View marginLeft="auto">
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </View>
  );
}

function Report({ row, onOpen }: { readonly row: CollectionReportRow; readonly onOpen: Open }) {
  const [open, setOpen] = useState(false);
  return (
    <Entry href={row.href} label={`Open ${row.target}`}>
      <Row gap="sm" wrap>
        <Text variant="label">{row.target}</Text>
        <Text variant="label" tone="secondary">{row.status}</Text>
        <Confidence confidence={row.confidence === "Not recorded" ? undefined : row.confidence} />
        {row.stale ? <Tag tone="warning">Out of date</Tag> : null}
        <Button kind="secondary" size="compact" onPress={() => onOpen({ kind: "share-report", id: row.id })}>Share it</Button>
        {row.href ? <Opens /> : null}
      </Row>
      <Text variant="body">{row.question}</Text>
      <Text variant="caption" tone="tertiary">Filed {row.filed}. How sure the report is overall doesn't tell you how sure each finding is, and it isn't a percent chance.</Text>
      <Text variant="body">{row.summary}</Text>
      {row.findings.map((finding, index) => <Text key={`${finding.topic}:${index}`} variant="caption">· {finding.observation} <Text variant="caption" tone="tertiary">Source: {finding.source}.</Text></Text>)}
      <Row><Button kind="quiet" size="compact" icon={open ? "restorePanel" : "expandPanel"} onPress={() => setOpen(!open)}>{open ? "Hide limits and who has it" : "Limits and who has it"}</Button></Row>
      {open ? (
        <Column gap="2xs">
          {row.gaps.map((gap) => <Text key={gap} variant="caption" tone="secondary">· {gap}</Text>)}
          <Text variant="caption" tone="secondary">· {row.exposure}</Text>
          {row.shared.length ? row.shared.map((share, index) => <Text key={`${share.recipient}:${index}`} variant="caption" tone="secondary">· Shared {share.findings.length ? `${share.findings.length} findings` : "this report"} with {share.recipient} on {share.date}.</Text>) : <Text variant="caption" tone="secondary">· Not shared outside your government.</Text>}
        </Column>
      ) : null}
    </Entry>
  );
}

/** Reports stay in the order they were filed, newest first: the date is the order. */
export function CollectionReports({ campaign, onOpen }: { readonly campaign: Campaign; readonly onOpen: Open }) {
  const rows = useMemo(() => collectionReports(campaign), [campaign]);
  const [shown, setShown] = useState(6);
  return (
    <Pane title="Intelligence reports" icon="intel" count={rows.length} line="What the agencies actually found. Each report keeps the judgment it had when it was filed, even after you stop the request.">
      {rows.length === 0 ? <Empty title="No reports yet" detail="No agency has filed a collection report." /> : null}
      {rows.slice(0, shown).map((row) => <Report key={row.id} row={row} onOpen={onOpen} />)}
      {rows.length > shown ? <Button kind="quiet" size="compact" onPress={() => setShown(rows.length)}>{`Show all ${rows.length} reports`}</Button> : null}
    </Pane>
  );
}

function Judgment({ row, onOpen }: { readonly row: SecurityAssessmentRow; readonly onOpen: Open }) {
  const [open, setOpen] = useState(false);
  return (
    <Entry href={row.href} label={`Open ${row.targetName}`}>
      <Row gap="sm" wrap>
        <Text variant="label">{row.targetName}</Text>
        <Text variant="label" tone="secondary" flex={1}>{row.questionLabel}</Text>
        <Button kind="secondary" size="compact" onPress={() => onOpen({ kind: "press", id: row.id })}>Ask for new wording</Button>
        <Opens />
      </Row>
      <Text variant="voice">{row.judgment}</Text>
      <ReadingFrame title="How likely, in the analysts' words" unit="Five steps, from remote to almost certain" legend={EVEN_KEY} help={{ meaning: "The analysts answer with one of five phrases: remote, unlikely, even chance, likely or almost certain. The bar places the phrase on that ladder and the gold tick marks the middle, an even chance. The phrase is the reading, not a percent chance." }}>
        <Meter label="Analysts' words" value={row.rung} figure={row.likelihood} marks={[{ id: "even", label: "even chance", at: 0.5, kind: "historical" }]} />
      </ReadingFrame>
      <Confidence confidence={row.confidence} />
      <Text variant="caption" tone="secondary">{row.confidenceBasis}</Text>
      <Row><Button kind="quiet" size="compact" icon={open ? "restorePanel" : "expandPanel"} onPress={() => setOpen(!open)}>{open ? "Hide sources, gaps, and disagreements" : "Sources, gaps, and disagreements"}</Button></Row>
      {open ? [...row.sources, ...row.gaps, ...row.dissents, row.alternative].map((line) => <Text key={line} variant="caption" tone="secondary">· {line}</Text>) : null}
      {row.changes.map((change) => <Row key={change} gap="xs"><Icon name="caution" size={14} tone="warningInk" /><Text variant="caption" tone="warning">{change}</Text></Row>)}
      <Text variant="caption" tone="tertiary">Written {row.issued}.</Text>
    </Entry>
  );
}

/** The community's judgments, newest first, and the way to ask for another. */
export function Assessments({ rows, onOpen }: { readonly rows: readonly SecurityAssessmentRow[]; readonly onOpen: Open }) {
  return (
    <Pane title="Assessments" icon="intel" count={rows.length} emblem={<SealOf id="INST-ODNI" size={32} />}>
      {rows.length === 0 ? <Text variant="body" tone="secondary">The intelligence agencies have not filed an assessment of another government's intentions, capabilities, or stability.</Text> : null}
      {rows.map((row) => <Judgment key={row.id} row={row} onOpen={onOpen} />)}
      <Row><Button kind="secondary" size="compact" icon="review" onPress={() => onOpen({ kind: "commission" })}>Ask for an assessment</Button></Row>
    </Pane>
  );
}
