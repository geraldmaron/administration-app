import { router } from "expo-router";
import type { Campaign } from "@admin/engine";
import { legacyReading, place, sealFor, type LegacyPoint, type LegacyReading } from "@admin/player-core";
import { BenchmarkChart, Button, Column, Meter, Page, ReadingFrame, Row, Seal, Tag, Text, View, type KeyEntry } from "@admin/ui";
import { CompareDoor } from "../compare/CompareDoor";
import { Segmented } from "@admin/ui/forms";
import { ShiftRow, Tally, TermLine, type ShiftView } from "@admin/ui/record";
import { termDoor } from "../handbook/term-door";
import { go } from "../news/story-parts";
import { RecordArea } from "../record/Panel";
import { SelfComparison } from "../record/RecordSections";
import { legacyDomain, legacyPosition } from "../record/course";
import { KIND_WORD, MARK_TONE, NotYet, TERM_MARK_KEY } from "./parts";

export const LEGACY_VIEWS = ["comparison", "timeline", "record"] as const;
export type LegacyView = (typeof LEGACY_VIEWS)[number];

const VIEWS: readonly { readonly value: LegacyView; readonly label: string }[] = [
  { value: "comparison", label: "Then and now" },
  { value: "timeline", label: "Timeline" },
  { value: "record", label: "What you did" },
];

const SHIFT_KEY: readonly KeyEntry[] = [
  { id: "start", kind: "tick", label: "Thin line: where it stood at your oath", ink: "colorSecondary", weight: 2 },
  { id: "end", kind: "tick", label: "Thick line: where it stood on your last day", ink: "color", weight: 3 },
  { id: "good", kind: "swatch", label: "Green: the change helped the country", ink: "successInk" },
  { id: "bad", kind: "swatch", label: "Red: the change hurt the country", ink: "danger" },
  { id: "neutral", kind: "swatch", label: "Blue: neither good nor bad", ink: "accent" },
];

const percent = (value: number): string => `${Number(value.toFixed(1))}%`;

/** A rate's own track runs a little past its larger end so a small move reads as one; approval runs the full 0 to 100. */
function shiftOf(label: string, points: readonly LegacyPoint[], higherIsBetter: boolean | undefined, full: boolean): ShiftView | undefined {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return undefined;
  const domain = legacyDomain([first.value, last.value], full);
  const delta = last.value - first.value;
  const better = higherIsBetter === undefined || Math.abs(delta) < 0.05 ? undefined : delta > 0 === higherIsBetter;
  const size = Number(Math.abs(delta).toFixed(1));
  return {
    label,
    from: legacyPosition(first.value, domain),
    to: legacyPosition(last.value, domain),
    fromText: percent(first.value),
    toText: percent(last.value),
    change: Math.abs(delta) < 0.05 ? "No change" : `${delta > 0 ? "Up" : "Down"} ${size} ${size === 1 ? "point" : "points"}`,
    tone: better === undefined ? "neutral" : better ? "good" : "bad",
    zero: legacyPosition(0, domain),
  };
}

/** The country at the oath beside the country on the last day, each reading's course, and the term against history. */
function Comparison({ campaign, legacy }: { readonly campaign: Campaign; readonly legacy: LegacyReading }) {
  const rows = [shiftOf("Approval", legacy.approval, true, true), shiftOf("Unemployment", legacy.unemployment, false, false), shiftOf("Inflation", legacy.inflation, undefined, false)].filter((row): row is ShiftView => row !== undefined);
  const series = [["Approval", legacy.approval], ["Unemployment", legacy.unemployment], ["Inflation", legacy.inflation]] as const;
  return (
    <Column gap="lg">
      <RecordArea id="then-and-now" icon="graph" title="How things were when you started and when you left" lede={legacy.countryLine}>
        <ReadingFrame
          title="Where each reading started and ended"
          unit="% on each reading's own scale"
          period="Oath to last day"
          legend={SHIFT_KEY}
          help={{ meaning: "Each bar is one reading on its own scale. The thin line is where it stood at your oath and the thick line is where it stood on your last day. The colored stretch between them is the change.", steps: ["Green means the change was good for the country, red means it was bad, and blue means it is not a matter of good or bad.", "A faint line marks zero where a reading has one."], term: termDoor("approval-rating", "Approval rating") }}
        >
          <Column gap="md">
            {rows.map((row) => <ShiftRow key={row.label} shift={row} />)}
          </Column>
        </ReadingFrame>
        <Text variant="caption" tone="secondary">These numbers show what changed while you were in office. They don't show why. Your Record explains the cause of each change, one entry at a time.</Text>
      </RecordArea>
      {series.map(([label, points]) => (points.length < 2 ? null : (
        <RecordArea key={label} id={`course-${label.toLowerCase()}`} icon="graph" title={label}>
          <BenchmarkChart door={<CompareDoor metric={label === "Approval" ? "approval" : label === "Unemployment" ? "unemployment" : "inflation"} />} title={`${label}, week by week`} unit="%" period="Oath to last day" help={{ meaning: `${label} each week of your term. Follow the line from left to right to see how it moved.` }} x={points.map((point) => point.label)} series={[{ id: label, label: "Your presidency", values: points.map((point) => point.value), kind: "self" }]} domain={legacyDomain(points.map((point) => point.value), label === "Approval")} format={percent} {...(label === "Unemployment" ? { better: "down" as const } : label === "Approval" ? { better: "up" as const } : {})} height={200} />
        </RecordArea>
      )))}
      <RecordArea id="compared" icon="graph" title="Compared with history and your own earlier weeks">
        <SelfComparison campaign={campaign} />
      </RecordArea>
    </Column>
  );
}

function Timeline({ legacy }: { readonly legacy: LegacyReading }) {
  return (
    <RecordArea id="timeline" icon="decision" title="Timeline of decisions">
      <ReadingFrame title="Marked decisions across your term" unit="One dot for each marked decision" period={`${legacy.from} to ${legacy.to}`} legend={TERM_MARK_KEY} help={{ meaning: "The line is your whole term, from the oath to the last day. Each dot is a decision or event the game marked, placed on the day it happened. The list below names each one." }}>
        <TermLine marks={legacy.marks.map((mark) => ({ key: mark.key, at: mark.at, label: mark.label, tone: mark.tone }))} span={legacy.span} from={legacy.from} to={legacy.to} />
      </ReadingFrame>
      {legacy.marks.length === 0 ? <Text variant="body" tone="secondary">No decisions were marked this term.</Text> : null}
      {legacy.marks.map((mark) => (
        <Row key={mark.key} gap="sm" top>
          <View width={80}><Tag tone={MARK_TONE[mark.tone]}>{KIND_WORD[mark.kind]}</Tag></View>
          <Column flex={1}><Text variant="label">{mark.label}</Text><Text variant="caption" tone="tertiary">{mark.date}</Text></Column>
        </Row>
      ))}
    </RecordArea>
  );
}

function Commitments({ legacy }: { readonly legacy: LegacyReading }) {
  const { kept, broken, open } = legacy.promises;
  const total = kept + broken + open;
  const { unauthorizedForce, struckDownOrders, overriddenVetoes, removalSteps } = legacy.record;
  return (
    <Column gap="lg">
      <RecordArea id="laws" icon="law" title="Laws" lede={legacy.laws.line}>
        {legacy.laws.titles.map((title) => <Text key={title} variant="body">{title}</Text>)}
      </RecordArea>
      <RecordArea id="promises" icon="sign" title="Promises" lede={legacy.promises.line}>
        {total > 0 ? (
          <ReadingFrame title="Promises kept" unit="Share of the promises you made" period="Whole term" legend={[{ id: "kept", kind: "swatch", label: "Kept", ink: "successInk", figure: kept }, { id: "rest", kind: "swatch", label: "Broken or still open", ink: "borderColorStrong", figure: total - kept }]} help={{ meaning: "The filled part of the bar is the share of your promises you kept by the end.", term: termDoor("pledge", "Pledge") }}>
            <Meter label="Kept" value={kept / total} figure={`${kept} of ${total}`} tone="successInk" />
          </ReadingFrame>
        ) : null}
      </RecordArea>
      <RecordArea id="wars" icon="conflict" title="Wars" {...(legacy.wars.list.length === 0 && legacy.wars.line ? { lede: legacy.wars.line } : {})}>
        {legacy.wars.list.map((war) => (
          <Row key={war.key} gap="sm" top><Tag tone={MARK_TONE[war.tone]}>War</Tag><Column flex={1}><Text variant="label">{war.name}</Text><Text variant="caption" tone="secondary">{war.outcome}</Text></Column></Row>
        ))}
      </RecordArea>
      <RecordArea id="marks" icon="caution" title="Marks on your record">
        <Tally items={[{ label: "Military force used without Congress's approval", count: unauthorizedForce }, { label: "Orders the courts struck down", count: struckDownOrders }, { label: "Vetoes Congress overrode", count: overriddenVetoes }, { label: "Steps toward removing you from office", count: removalSteps }]} />
      </RecordArea>
    </Column>
  );
}

/** What the administration leaves: the country against what it inherited, the term as a line of decisions, and the commitments and counts a history would print. */
export function Legacy({ campaign, view }: { readonly campaign: Campaign; readonly view: LegacyView }) {
  const legacy = legacyReading(campaign);
  if (!legacy) return <NotYet eyebrow="The legacy" title="Your legacy is written when your time in office ends" body="Until then, your Record shows everything that's happened so far." door={{ label: "Open the Record", href: place.record() }} />;
  return (
    <Page eyebrow={`The legacy · ${legacy.from} to ${legacy.to}`} icon="record" title="Legacy" lede={legacy.timelineLine} emblem={<Seal spec={sealFor("SEAL-PRESIDENT")} size={72} label="Seal of the President of the United States" />}>
      <Segmented label="Views of the legacy" options={VIEWS} value={view} onChange={(next) => router.setParams({ view: next === "comparison" ? undefined : next })} />
      {view === "comparison" ? <Comparison campaign={campaign} legacy={legacy} /> : null}
      {view === "timeline" ? <Timeline legacy={legacy} /> : null}
      {view === "record" ? <Commitments legacy={legacy} /> : null}
      <Text variant="title" serif weight="regular">{legacy.closing}</Text>
      <Row gap="sm" wrap>
        <Button kind="secondary" icon="record" onPress={() => go(place.ending())}>How it ended</Button>
        <Button kind="quiet" icon="record" onPress={() => go(place.record())}>Open the Record</Button>
      </Row>
    </Page>
  );
}
