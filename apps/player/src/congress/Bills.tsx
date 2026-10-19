import { useMemo, useState } from "react";
import { legislativeAct, type Campaign } from "@admin/engine";
import { floorSchedule, settledBills, transmitComparison, transmitPacket, type ActColumn, type FloorGroup, type FloorRow } from "@admin/player-core";
import { Badge, Button, Card, CardLink, Column, Empty, Icon, ReadingFrame, Row, Select, Text, type IconName } from "@admin/ui";
import { Sponsor } from "./Sponsor";
import { voteFrame } from "./mood";
import { VoteCount } from "@admin/ui/legislature";
import { ActChooser, ChooserReceipt, STANCE_TONE } from "./ActChooser";
import type { ActCommit } from "./commit";
import { LAW, lineWords } from "./model";
import { Note, Paged, RowLink, go } from "./parts";
import { CitedLawHelp } from "../law/LawHelp";

const STAGE_ICON: Readonly<Record<string, IconName>> = { desk: "sign", floor: "gavel", markup: "review", referral: "dossier", conference: "subjectChamber" };

/** One bill: who wrote it, where it stands, and the line each count it faces must clear; a desk bill's count is the override. */
function BillRow({ campaign, row, group }: { readonly campaign: Campaign; readonly row: FloorRow; readonly group: FloorGroup["key"] }) {
  const desk = group === "desk";
  return (
    <CardLink label={`Open ${row.title}`} href={row.href} onPress={() => go(row.href)} pad="md" {...(desk ? { accentEdge: "gold" as const } : {})}>
      <Column gap="sm">
        <Row between wrap gap="sm">
          <Column flex={1} minWidth={200} gap="2xs">
            <Row gap="xs" top>
              <Icon name="dossier" size={16} tone="colorSecondary" />
              <Text variant="label" flexShrink={1}>{row.title}</Text>
            </Row>
            <Sponsor campaign={campaign} words={row.sponsor} />
          </Column>
          <Badge status={desk ? "warning" : "outline"} icon={STAGE_ICON[group] ?? "dossier"}>{row.stageName}</Badge>
        </Row>
        <Text variant="caption" tone={STANCE_TONE[row.stance]}>{row.line}</Text>
        {row.counts.length > 0 ? (
          <Column gap="sm">
            <Text variant="eyebrow" tone="secondary">{desk ? "Votes needed to override" : "Votes needed to pass"}</Text>
            <Row wrap gap="md">
              {row.counts.map((count) => (
                <Column key={count.chamber} flex={1} minWidth={200}>
                  <VoteCount name={`${count.name}${desk ? ", to override" : ""}`} seats={count.seats} required={count.required} requiredLabel={lineWords(count.required, count.seats, desk)} />
                </Column>
              ))}
            </Row>
            <Note tone="tertiary">No member has promised their vote yet. This shows what it takes to win, not who will vote which way.</Note>
          </Column>
        ) : null}
      </Column>
    </CardLink>
  );
}

function Group({ campaign, group }: { readonly campaign: Campaign; readonly group: FloorGroup }) {
  return (
    <ReadingFrame {...voteFrame(`${group.title} (${group.rows.length}): votes each bill needs`)}>
      <Column gap="sm">
        {group.rows.map((row) => <BillRow key={row.id} campaign={campaign} row={row} group={group.key} />)}
      </Column>
    </ReadingFrame>
  );
}

const topicOf = (column: ActColumn) => legislativeAct(column.id)?.topic ?? "National priorities";

/** Browse the agenda, then read one proposal as its change from current law. Sending it starts committee work; it does not make it law. */
function Transmit({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const comparison = useMemo(() => transmitComparison(campaign), [campaign]);
  const proposals = comparison.columns;
  const [topic, setTopic] = useState("all");
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const topics = [...new Set(proposals.map(topicOf))].sort();
  const filtered = proposals.filter((column) => topic === "all" || topicOf(column) === topic);
  const selected = proposals.find((column) => column.id === picked);
  return (
    <Card title="Your agenda" icon="dispatch" help={<CitedLawHelp title="Proposing bills" meaning="The Constitution lets you suggest new laws to Congress. When you send a proposal, a committee starts working on it. Only Congress can pass it. If it does, the bill comes back to you to sign." cites={[LAW.recommend, LAW.presentment]} />}>
      {acts.committed && acts.by === "transmit" ? (
        <ChooserReceipt committed={acts.committed} again="Back to the agenda" onAgain={() => { setPicked(undefined); acts.dismiss(); }} />
      ) : selected ? (
        <Column gap="md">
          <Row>
            <Button kind="quiet" size="compact" icon="return" disabled={acts.busy} onPress={() => { setPicked(undefined); acts.dismiss(); }}>
              Back to the agenda
            </Button>
          </Row>
          <ActChooser key={selected.id} id="transmit" title={selected.label} comparison={{ rows: comparison.rows, columns: [selected] }} acts={acts} authority={LAW.recommend} packet={(id) => transmitPacket(campaign, id)} again="Back to the agenda" onAgain={() => setPicked(undefined)} />
        </Column>
      ) : proposals.length === 0 ? (
        <Note>You don't have any new proposals ready right now. You can follow the bills already in Congress above. New proposals open up as your term goes on.</Note>
      ) : (
        <Column gap="sm">
          <Select label="Policy area" options={[{ value: "all", label: "All policy areas" }, ...topics.map((entry) => ({ value: entry, label: entry }))]} value={topic} onChange={setTopic} />
          <Note>{filtered.length} {filtered.length === 1 ? "proposal" : "proposals"} you can send. Pick one to see what it costs, what it trades off, and its chances.</Note>
          <Paged items={filtered} initial={4} noun="proposals" render={(column) => (
            <CardLink key={column.id} role="button" onPress={() => setPicked(column.id)} label={`Open the proposal: ${column.label}`} pad="md" gap="2xs">
              <Text variant="eyebrow" tone="gold">{topicOf(column)}</Text>
              <Text variant="label">{column.label}</Text>
              <Text variant="caption" tone="secondary">{column.cells["does"]?.lines.join(" ")}</Text>
              <Text variant="caption" tone={column.cells["count"]?.stance ? STANCE_TONE[column.cells["count"].stance] : "primary"}>Your staff's estimate: {column.cells["count"]?.lines.join(" · ")}</Text>
              {column.refusal ? <Text variant="caption" tone="warning">You can't send it yet.</Text> : null}
            </CardLink>
          )} />
        </Column>
      )}
    </Card>
  );
}

/** Every bill that left the chambers this term, newest first, each with the vote as recorded. */
function Settled({ campaign }: { readonly campaign: Campaign }) {
  const settled = settledBills(campaign, Number.POSITIVE_INFINITY);
  return (
    <Card title="Finished bills" icon="record">
      <Paged items={settled} initial={8} noun="finished bills" empty="No bill has become law, been vetoed, or died yet this term." render={(row) => (
        <RowLink key={row.id} label={`Open ${row.title}`} href={row.href}>
          <Row gap="sm" wrap>
            <Column flex={1} minWidth={200}>
              <Text variant="label">{row.title}</Text>
              <Sponsor campaign={campaign} words={row.sponsor} />
            </Column>
            <Badge status={row.stageName === "Vetoed" ? "danger" : row.stageName.startsWith("Law") ? "success" : "outline"} icon={row.stageName === "Vetoed" ? "veto" : "statusIssued"}>{row.stageName}</Badge>
            <Text variant="caption" flex={1} minWidth={200}>Vote: {row.counts.length === 0 ? "No vote was taken." : row.line}</Text>
          </Row>
        </RowLink>
      )} />
    </Card>
  );
}

/** Every bill in full: the desk and the chambers when anything is moving, the agenda to propose from, and every settled bill. */
export function Bills({ campaign, acts }: { readonly campaign: Campaign; readonly acts: ActCommit }) {
  const groups = floorSchedule(campaign);
  const desk = groups.find((group) => group.key === "desk");
  const floor = groups.find((group) => group.key === "floor");
  const committee = groups.filter((group) => group.key === "conference" || group.key === "markup" || group.key === "referral");
  const moving = floor !== undefined || committee.length > 0;
  return (
    <Column gap="xl">
      {desk ? (
        <Card title="Waiting for you" icon="sign" edge="gold">
          <Group campaign={campaign} group={desk} />
        </Card>
      ) : null}
      {moving ? (
        <Card title="Moving through Congress" icon="gavel">
          {floor ? <Group campaign={campaign} group={floor} /> : <Empty title="Nothing is up for a vote this week" detail="A bill shows here once a chamber schedules its vote." />}
          {committee.map((group) => <Group key={group.key} campaign={campaign} group={group} />)}
        </Card>
      ) : null}
      {!desk && !moving ? <Empty title="No bills are moving right now" detail="A bill appears here when it's in committee, up for a vote, or waiting for your signature." /> : null}
      <Transmit campaign={campaign} acts={acts} />
      <Settled campaign={campaign} />
    </Column>
  );
}
