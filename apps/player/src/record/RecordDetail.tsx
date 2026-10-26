import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { formatDate, formatMoney, impactReports, place, sealFor, type RecordEntryReading } from "@admin/player-core";
import { Button, Column, Empty, EntityLink, Icon, PressRow, Reading, Row, Seal, Surface, Tag, Text } from "@admin/ui";
import { CausalChain, Fact, MoveTable, StageTrack } from "@admin/ui/record";
import { stateById, worldNations } from "@admin/world";
import { BackButton } from "../shell/BackButton";
import { go } from "../shell/navigate";
import { entryInstitutions } from "./entry-view";
import { entrySubjects } from "./entry-subjects";
import { ImpactReportList } from "./Investigations";
import { recordHref } from "./record-params";

const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));

function EntryPart({ title, id, children }: { readonly title: string; readonly id?: string; readonly children: ReactNode }) {
  return (
    <Column gap="sm" {...(id ? { id } : {})}>
      <Text variant="eyebrow" tone="secondary" role="heading" aria-level={3}>
        {title}
      </Text>
      {children}
    </Column>
  );
}

/** The institutions whose subsystems the entry moved, each under its emblem and opening its office. */
function Institutions({ entry }: { readonly entry: RecordEntryReading }) {
  const bodies = entryInstitutions(entry.systems);
  if (bodies.length === 0) return null;
  return (
    <Row gap="md" wrap>
      {bodies.map((body) => (
        <PressRow key={body.id} label={`Open ${body.name}`} href={body.id.startsWith("INST-") ? place.office(body.id) : place.washington()} onPress={() => go(body.id.startsWith("INST-") ? place.office(body.id) : place.washington())} flexDirection="row" alignItems="center" gap="xs" paddingVertical="2xs" paddingHorizontal="xs" minHeight={44} borderRadius="control">
          <Seal spec={sealFor(body.id, body.name)} size={28} />
          <Text variant="label" tone="accent">{body.name}</Text>
        </PressRow>
      ))}
    </Row>
  );
}

function Terms({ entry }: { readonly entry: RecordEntryReading }) {
  return (
    <EntryPart title="Details">
      <Row gap="md" wrap>
        <Fact label="Recorded" value={formatDate(entry.date)} />
        <Fact label="Came from" value={entry.origin ?? "Unknown"} />
        <Fact label="Status" value={entry.status} />
        <Fact label="Takes effect" value={entry.effectiveDate ? formatDate(entry.effectiveDate) : "On the day it was recorded"} />
      </Row>
      <StageTrack label="Progress" stages={entry.stages.map((stage) => ({ key: stage.key, label: stage.label, state: stage.current ? "now" : stage.reached ? "done" : "ahead", note: stage.date ? formatDate(stage.date) : "Date not set" }))} />
    </EntryPart>
  );
}

function Readings({ entry }: { readonly entry: RecordEntryReading }) {
  return (
    <EntryPart id="rec-result" title="What changed">
      <MoveTable none="Nothing changed right away. Its effects come later, through the things it led to." moves={entry.moves.map((move) => ({ key: move.key, label: move.label, before: move.beforeText, after: move.afterText, change: move.text, up: move.delta > 0, good: move.delta > 0 }))} />
      {entry.judgments.length > 0 ? <Text variant="caption" tone="secondary">{`These changes came through how people judge ${entry.judgments.slice(0, 2).map((judgment) => `${judgment.label.toLowerCase()} (${judgment.text})`).join(" and ")}.`}</Text> : null}
    </EntryPart>
  );
}

/** The agency assessments this entry set off; with none, the entry says nothing rather than reporting zero. */
function FollowedBy({ campaign, entryId }: { readonly campaign: Campaign; readonly entryId: string }) {
  const reports = impactReports(campaign, { causedBy: entryId });
  if (reports.length === 0) return null;
  return (
    <EntryPart title="Damage reports that followed">
      <ImpactReportList campaign={campaign} reports={reports} initial={3} />
    </EntryPart>
  );
}

function Accounting({ entry }: { readonly entry: RecordEntryReading }) {
  if (entry.accounting.length === 0) return null;
  return (
    <EntryPart title="Expected and actual cost">
      {entry.accounting.map((cost, index) => (
        <Column key={index} gap="xs">
          <Row gap="md" wrap>
            <Reading name="Expected when you decided" value={formatMoney(cost.estimated)} basis="estimate" />
            <Reading name="Actual borrowing" value={formatMoney(cost.booked)} />
            <Reading name={cost.variance >= 0 ? "Over the estimate" : "Under the estimate"} value={formatMoney(Math.abs(cost.variance))} />
          </Row>
          <Text variant="caption" tone="secondary">{`${cost.source}. ${cost.method === "band" ? "A rough estimate. The exact parts of the cost aren't known." : "Worked out from the numbers given."} The difference between the two is based on planning guesses.`}</Text>
        </Column>
      ))}
    </EntryPart>
  );
}

function Places({ campaign, entry }: { readonly campaign: Campaign; readonly entry: RecordEntryReading }) {
  const stateId = entry.selection?.startsWith("state:") ? entry.selection.slice(6) : undefined;
  const links = [
    ...(stateId ? [{ label: stateById.get(stateId as never)?.name ?? stateId, href: place.state(stateId), icon: "mapPin" as const }] : []),
    ...entry.nations.map((id) => ({ label: NATION_NAMES.get(id) ?? id, href: place.country(id), icon: "flag" as const })),
    ...entrySubjects(campaign, entry.id).map((subject) => ({ label: subject.label, href: subject.href, icon: subject.icon })),
  ];
  if (links.length === 0 && entry.subjects.length === 0) return null;
  return (
    <EntryPart title="What it was about">
      <Row gap="md" wrap>
        {links.map((link) => <EntityLink key={link.href} label={link.label} icon={link.icon} href={link.href} onPress={() => go(link.href)} />)}
        {entry.subjects.map((subject) => <EntityLink key={subject.key} label={`${subject.name} (since week ${subject.originTurn})`} icon="dossier" href={recordHref({ subject: subject.id })} onPress={() => go(recordHref({ subject: subject.id }))} />)}
      </Row>
    </EntryPart>
  );
}

function RootRow({ root, onOpen }: { readonly root: RecordEntryReading["roots"][number]; readonly onOpen: (id: string) => void }) {
  return (
    <PressRow label={`Open the entry, ${root.description}`} onPress={() => onOpen(root.id)} flexDirection="row" alignItems="center" gap="sm" padding="xs" minHeight={44} borderRadius="control">
      <Icon name="record" size={16} tone="colorSecondary" />
      <Text variant="label" flex={1} minWidth={0}>{root.description}</Text>
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </PressRow>
  );
}

function Chain({ entry, onOpen }: { readonly entry: RecordEntryReading; readonly onOpen: (id: string) => void }) {
  const link = (row: { readonly id: string; readonly description: string; readonly date: Parameters<typeof formatDate>[0] }) => ({ href: place.event(row.id), id: row.id, label: row.description, date: formatDate(row.date) });
  const roots = entry.roots.filter((root) => !entry.causes.some((cause) => cause.id === root.id));
  return (
    <EntryPart title="What led to this and what followed">
      <CausalChain causes={entry.causes.slice(0, 6).map(link)} current={{ id: entry.id, label: entry.headline, date: formatDate(entry.date) }} consequences={entry.consequences.slice(0, 6).map(link)} onOpen={onOpen} />
      {roots.length > 0 ? <Column gap="xs"><Text variant="caption" tone="secondary">Where it all started</Text>{roots.map((root) => <RootRow key={root.id} root={root} onOpen={onOpen} />)}</Column> : null}
      {entry.downstreamCount > entry.consequences.length ? <Text variant="caption" tone="secondary">{`${entry.downstreamCount} later entries trace back to this one, directly or through other entries.`}</Text> : null}
    </EntryPart>
  );
}

type Props = { readonly campaign: Campaign; readonly entryId: string; readonly entry: RecordEntryReading | undefined; readonly standalone: boolean; readonly onOpen: (id: string) => void; readonly onClose: () => void };

/** One entry read whole: its terms as recorded, the readings it moved, the assessments it caused, its cost, and the records around it. */
export function RecordDetail({ campaign, entry, standalone, onOpen, onClose }: Props) {
  if (!entry) {
    return (
      <Surface level="sunken">
        <Empty title="We couldn't find this Record entry" detail="It may be from one of your other games." action={{ label: "All entries", icon: "return", onPress: onClose }} />
      </Surface>
    );
  }
  const lede = entry.headline === entry.description ? undefined : entry.description.slice(entry.headline.length).trim();
  return (
    <Surface pad="lg" role="article" aria-label={entry.headline}>
      <Column gap="lg">
        <Row>{standalone ? <BackButton parent="/record" parentLabel="All entries" /> : <Button kind="quiet" size="compact" icon="return" onPress={onClose}>All entries</Button>}</Row>
        <Column gap="sm">
          <Row gap="sm" wrap>
            <Tag tone={entry.actor === "player" ? "authority" : "outline"}>{entry.actorWord}</Tag>
            <Tag tone={entry.status.startsWith("Under way") ? "warning" : "success"}>{entry.status}</Tag>
          </Row>
          <Text variant="headline" role="heading" aria-level={2}>{entry.headline}</Text>
          {lede ? <Text variant="body" tone="secondary">{lede}</Text> : null}
          <Institutions entry={entry} />
        </Column>
        <Terms entry={entry} />
        <Readings entry={entry} />
        <FollowedBy campaign={campaign} entryId={entry.id} />
        <Accounting entry={entry} />
        <Places campaign={campaign} entry={entry} />
        <Chain entry={entry} onOpen={onOpen} />
      </Column>
    </Surface>
  );
}
