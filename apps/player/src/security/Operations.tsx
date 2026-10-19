import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { OPERATION_KIND_LABELS, place, serviceHoldings, type CovertReading, type OperationKind, type OperationRow, type OperationsTally, type ServiceReadiness } from "@admin/player-core";
import { Button, Column, Empty, Peek, ReadingFrame, Row, Text } from "@admin/ui";
import { Panel, Segments, SortTable, StateChip, type RowPress, type TableColumn } from "@admin/ui/world";
import { HoldingsTable } from "../world/forces";
import { serviceSeal } from "../world/law";
import { RowLink } from "../decision/parts";
import { ChooseOne, SealOf, TopicLaw, go } from "../world/parts";
import type { SecurityAct } from "./params";
import { FindingFile } from "./FindingFile";

type Open = (act: SecurityAct) => void;
const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Flagged first, then a watch stage, then the rest, so the opening order is what needs a President. */
const TONE_RANK = { bad: 0, watch: 1, good: 2, neutral: 3 } as const;

function columns(onOpen: Open): readonly TableColumn<OperationRow>[] {
  return [
    { id: "operation", label: "Operation", width: 260, sort: (row) => row.subject.name, render: (row) => <Column gap="2xs"><Text variant="label">{row.subject.name}</Text>{row.kind === "covert" ? <Text variant="caption" tone="secondary">{row.what}</Text> : null}{row.flag ? <Text variant="caption" tone={row.flag.tone === "bad" ? "danger" : "warning"}>⚠ {row.flag.text}</Text> : null}</Column> },
    { id: "kind", label: "Kind", width: 110, sort: (row) => row.kindLabel, render: (row) => <Text variant="caption">{row.kindLabel}</Text> },
    { id: "theater", label: "Region", width: 110, sort: (row) => row.theater?.abbr, render: (row) => (row.theater ? <Peek name={row.theater.abbr} role="Regional military command" onOpen={() => go(row.theater!.href)} openLabel="Open the command" /> : <Text variant="caption" tone="tertiary">—</Text>) },
    { id: "stage", label: "Stage", width: 150, sort: (row) => TONE_RANK[row.tone], render: (row) => <StateChip valence={row.tone}>{row.stage}</StateChip> },
    { id: "cost", label: "Weekly cost", width: 120, align: "end", first: "descending", sort: (row) => row.weekly, render: (row) => <Text variant="caption" tabular>{row.weeklyText ?? "—"}</Text> },
    { id: "weeks", label: "Weeks", detail: "running", width: 90, align: "end", first: "descending", sort: (row) => row.weeks, render: (row) => <Text variant="caption" tabular>{row.weeks}</Text> },
    { id: "review", label: "Next review", detail: "in", width: 110, align: "end", sort: (row) => row.reviewIn, render: (row) => <Text variant="caption">{row.reviewIn === undefined ? "No end date" : row.reviewIn <= 0 ? "Due" : `${row.reviewIn} ${row.reviewIn === 1 ? "week" : "weeks"}`}</Text> },
    { id: "act", label: "Change", width: 150, render: (row) => <Button kind="secondary" size="compact" onPress={() => onOpen(row.act)}>{row.act.kind === "close-finding" ? "Close the finding" : "Change it"}</Button> },
  ];
}

/** The whole row opens what the operation is aimed at: the country, the war or the organization. */
const OPEN_SUBJECT: RowPress<OperationRow> = {
  href: (row) => row.subject.href!,
  onPress: (row) => {
    if (row.subject.href) go(row.subject.href);
  },
  label: (row) => `Open ${row.subject.name}`,
  enabled: (row) => row.subject.href !== undefined,
};

function CovertRecord({ covert }: { readonly covert: CovertReading }) {
  return (
    <Column gap="sm">
      {covert.unfounded.length > 0 ? (
        <Column gap="xs">
          <Text variant="title" tone="danger">Secret actions taken without a finding</Text>
          {covert.unfounded.map((action) => <Text key={action.id} variant="body"><Text variant="body" weight="strong">{action.targetName}</Text>: {action.description}</Text>)}
          <Text variant="caption" tone="secondary">These stay on the record. Congress's intelligence committees will ask about them sooner or later.</Text>
        </Column>
      ) : null}
      {covert.closed.length > 0 ? (
        <Column gap="xs">
          <Text variant="title">Closed covert findings</Text>
          {covert.closed.map((row) => <RowLink key={row.id} label={`Open ${row.targetName}`} href={place.country(row.target)} onPress={() => go(place.country(row.target))}><Text variant="label" width={140}>{row.targetName}</Text><Text variant="caption" flexGrow={1} flexShrink={1} flexBasis={220} minWidth={0}>{row.objective} Signed {row.signed}. {row.activities} {row.activities === 1 ? "action was" : "actions were"} taken under it.</Text></RowLink>)}
        </Column>
      ) : null}
    </Column>
  );
}

/** Covert findings and commitments abroad as one operations picture: a table to filter, sort and page, the week's bill, and the way to sign another finding. */
export function Operations({ rows, tally, covert, onOpen, signer }: { readonly rows: readonly OperationRow[]; readonly tally: OperationsTally; readonly covert: CovertReading; readonly onOpen: Open; readonly signer: string }) {
  const [kind, setKind] = useState<OperationKind | "all">("all");
  const kinds = (Object.keys(OPERATION_KIND_LABELS) as OperationKind[]).filter((entry) => rows.some((row) => row.kind === entry));
  const owed = rows.filter((row) => row.kind === "covert" && row.flag).length;
  const shown = kind === "all" ? rows : rows.filter((row) => row.kind === kind);
  return (
    <Panel title="Operations" icon="summit" count={tally.total} aside={<TopicLaw topic="intelligence-findings" />} lede={`${tally.total === 0 ? "You have no operations running." : `${tally.total} running. ${tally.weeklyBill === "No weekly payments" ? "None of them costs money." : `The ones that cost money add up to ${tally.weeklyBill}.`}`}${owed > 0 ? ` You still owe Congress's intelligence committees your reasons for ${owed} ${owed === 1 ? "finding" : "findings"}. You can give them on the Oversight screen.` : ""}`}>
      {kinds.length > 1 ? <ChooseOne label="Type" value={kind} onChange={setKind} options={[{ value: "all", label: `All ${rows.length}` }, ...kinds.map((entry) => ({ value: entry, label: `${OPERATION_KIND_LABELS[entry]} ${rows.filter((row) => row.kind === entry).length}` }))]} /> : null}
      <SortTable caption="Running operations" columns={columns(onOpen)} rows={shown} rowKey={(row) => row.id} initialSort={{ key: "stage", direction: "ascending" }} highlight={(row) => row.flag !== undefined} rowPress={OPEN_SUBJECT} empty="You have no operations running." page={10} />
      <Row><Button kind="secondary" size="compact" icon="instrumentCovert" onPress={() => onOpen({ kind: "sign-finding" })}>Sign a finding</Button></Row>
      <FindingFile findings={covert.open} signer={signer} />
      <CovertRecord covert={covert} />
    </Panel>
  );
}

/**
 * What each service fields, one asset per row, in the asset's own unit.
 * Counts are never added across units; the strip above each table averages
 * the assets' own shares.
 */
export function ForcesView({ campaign, services, service, onService }: { readonly campaign: Campaign; readonly services: readonly ServiceReadiness[]; readonly service: string | undefined; readonly onService: (service: string | undefined) => void }) {
  const known = service === undefined || services.some((entry) => entry.id === service);
  const shown = service === undefined || !known ? services : services.filter((entry) => entry.id === service);
  const holdings = useMemo(() => new Map(services.map((entry) => [entry.id, serviceHoldings(campaign, entry.id)] as const)), [campaign, services]);
  return (
    <Column gap="lg">
      <ChooseOne label="Service" value={known && service ? service : "all"} onChange={(next) => onService(next === "all" ? undefined : next)} options={[{ value: "all", label: "All services" }, ...services.map((entry) => ({ value: entry.id, label: entry.name }))]} />
      {!known ? <Text variant="body" tone="warning">We couldn't find a service by that name, so every service is shown.</Text> : null}
      {services.length === 0 ? <Empty title="No service has reported its numbers yet" detail="Each service's forces will show up here once it has a count on file." /> : null}
      {shown.map((entry) => (
        <Panel key={entry.id} title={entry.name} emblem={<SealOf id={serviceSeal(entry.id)} name={entry.name} size={44} />} aside={<Button kind="quiet" size="compact" icon="building" onPress={() => go(place.office(entry.id))}>The service's office</Button>}>
          <ReadingFrame title={`${entry.name}: free, abroad and not ready`} unit="Average across its units, share of the force this week" help={{ meaning: "The bar splits the service's forces three ways. Free means ready to go this week, committed abroad means tied up in ongoing commitments overseas, and not ready means the forces exist but can't go this week. The three add up to the whole." }}>
            <Segments label={`${entry.name}, average across its units`} keyed parts={[{ key: "f", count: Math.round(entry.ready * 1000), word: "", text: `${pct(entry.ready)} free this week`, valence: "good" }, { key: "a", count: Math.round(entry.abroad * 1000), word: "", text: `${pct(entry.abroad)} committed abroad`, valence: "abroad" }, { key: "n", count: Math.round(entry.resting * 1000), word: "", text: `${pct(entry.resting)} not ready`, valence: "bad" }]} />
          </ReadingFrame>
          <HoldingsTable holdings={holdings.get(entry.id) ?? []} caption={`What the ${entry.name} has, by type`} drawn />
        </Panel>
      ))}
      <Text variant="caption" tone="secondary">Committed abroad means tied up in ongoing commitments overseas. Not ready means the forces exist and aren't committed, but they can't go this week.</Text>
    </Column>
  );
}
