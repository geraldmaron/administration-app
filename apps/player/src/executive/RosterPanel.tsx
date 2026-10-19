import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { chairRead, personFile } from "@admin/player-core";
import { Empty, Badge, Button, Column, Row, Surface, Text, useMedia } from "@admin/ui";
import { Select } from "@admin/ui/forms";
import { BandSteps, Monogram, StaffingBadge } from "@admin/ui/dossier";
import { InstitutionSeal, RowTo } from "./parts";
import { PersonName } from "../dossier/PersonPeek";
import { readingTone } from "./present";
import { onlyNeedingYou, type RosterRow, type RosterScope } from "./roster";

type Sort = "order" | "office" | "holder" | "read" | "needs";

const READ_RANK = { good: 3, watch: 2, bad: 1 } as const;
const PAGE = 15;

function sortValue(campaign: Campaign, sort: Sort, row: RosterRow): string | number {
  if (sort === "office") return row.node.name;
  if (sort === "holder") return row.node.holderName ?? "~";
  if (sort === "needs") return -(row.node.alerts.length + (row.backlog && row.backlog > 0 ? 1 : 0));
  const person = row.node.holder ? campaign.people[row.node.holder]?.base : undefined;
  return sort === "read" ? -(person ? READ_RANK[chairRead(person).tone] : 0) : 0;
}

/** An agency answers to the department above it, so sorting moves each department with its agencies and orders the agencies within it. */
export function sortRoster(campaign: Campaign, rows: readonly RosterRow[], sort: Sort): readonly RosterRow[] {
  if (sort === "order") return rows;
  const cmp = (a: RosterRow, b: RosterRow): number => {
    const x = sortValue(campaign, sort, a);
    const y = sortValue(campaign, sort, b);
    return typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
  };
  const groups = rows.reduce<readonly (readonly RosterRow[])[]>((acc, row) => (row.depth === 0 || acc.length === 0 ? [...acc, [row]] : [...acc.slice(0, -1), [...acc.at(-1)!, row]]), []);
  return [...groups].sort((a, b) => cmp(a[0]!, b[0]!)).flatMap(([lead, ...agencies]) => [lead!, ...[...agencies].sort(cmp)]);
}

function Holder({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const { node } = row;
  return (
    <Row gap="sm" flexBasis={200} flexGrow={1} top>
      <Monogram name={node.holderName ?? "Vacant"} muted={!node.holder} size={32} />
      <Column flex={1} gap="2xs">
        {node.holder ? <PersonName campaign={campaign} id={node.holder} name={node.holderName ?? "The leader"} /> : <Text variant="caption" tone="tertiary">{row.nominee ? "Nobody in the job yet" : "Nobody in the job or nominated"}</Text>}
        <Row gap="xs" wrap>
          {node.staffing === "confirmed" ? null : <StaffingBadge staffing={node.staffing} />}
          {row.nominee ? <Badge status="info" icon="appoint">{`Nominee: ${row.nominee.name}, ${row.nominee.stage}`}</Badge> : null}
        </Row>
      </Column>
    </Row>
  );
}

function Read({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const file = row.node.holder ? personFile(campaign, row.node.holder) : undefined;
  if (!file) {
    return (
      <Column flexBasis={180} flexGrow={1}>
        <Text variant="caption" tone="tertiary">
          Nobody to rate
        </Text>
      </Column>
    );
  }
  return (
    <Column gap="xs" flexBasis={180} flexGrow={1}>
      {file.readings
        .filter((reading) => reading.key === "loyalty" || reading.key === "competence")
        .map((reading) => (
          <BandSteps key={reading.key} label={reading.label} lit={reading.band + 1} word={reading.word} tone={readingTone(reading)} />
        ))}
    </Column>
  );
}

const AGENCY_FILL = { backgroundColor: { default: "backgroundStrong", hover: "surfaceHover", press: "backgroundPress" } } as const;

function Line({ campaign, row, first }: { readonly campaign: Campaign; readonly row: RosterRow; readonly first: boolean }) {
  const media = useMedia();
  const { node } = row;
  const backlog = row.backlog !== undefined && row.backlog > 0 ? row.backlog : 0;
  return (
    <RowTo first={first} href={node.href} label={`Open ${node.name}`} {...(row.depth === 1 ? AGENCY_FILL : {})}>
      <Row gap="md" wrap top padding="md">
        <Row gap="sm" flexBasis={media.phone ? "100%" : 240} flexGrow={1} top paddingLeft={row.depth === 1 && !media.phone ? "xl" : 0}>
          <InstitutionSeal id={node.institution} name={node.name} size={row.depth === 0 ? 36 : 28} />
          <Column flex={1} gap="2xs">
            <Text variant="label">{node.name}</Text>
            {node.title !== node.name ? <Text variant="caption" tone="secondary">{node.title}</Text> : null}
          </Column>
        </Row>
        <Holder campaign={campaign} row={row} />
        <Read campaign={campaign} row={row} />
        <Column flexBasis={160} flexGrow={1} gap="2xs">
          {node.alerts.length === 0 && backlog === 0 ? <Text variant="caption" tone="tertiary">Nothing waiting</Text> : null}
          {node.alerts.map((alert) => (
            <Badge key={alert.kind} status="danger" icon="caution">
              {alert.text}
            </Badge>
          ))}
          {backlog > 0 ? <Text variant="caption" tone="secondary">{`${backlog} items of work piled up`}</Text> : null}
        </Column>
      </Row>
    </RowTo>
  );
}

/**
 * Every chair in a scope: the office under its seal, who holds it and how,
 * one read of the holder, and what waits on the President. An agency sits
 * under the department it answers to.
 */
export function RosterPanel({ campaign, scopes, scope, need, onScope }: { readonly campaign: Campaign; readonly scopes: readonly RosterScope[]; readonly scope: string | undefined; readonly need: boolean; readonly onScope: (scope: string) => void }) {
  const shown = need ? scopes.map(onlyNeedingYou).filter((entry) => entry.rows.length > 0) : scopes;
  const current = shown.find((entry) => entry.key === scope) ?? shown.find((entry) => entry.key === "departments") ?? shown[0];
  const [sort, setSort] = useState<Sort>("order");
  const [all, setAll] = useState(false);
  const rows = useMemo(() => (current ? sortRoster(campaign, current.rows, sort) : []), [campaign, current, sort]);
  if (!current) return <Empty title="No offices match this filter" detail="Choose another group or clear the filter to see every office." />;
  const visible = all ? rows : rows.slice(0, PAGE);
  return (
    <Column gap="md" role="region" aria-label="Every office and its agencies">
      <Text variant="heading" role="heading" aria-level={2}>
        Every office and its agencies
      </Text>
      <Row gap="md" wrap>
        <Column flexBasis={260} flexGrow={1}>
          <Select label="Show" value={current.key} onChange={(key) => { setAll(false); onScope(key); }} options={shown.map((entry) => ({ value: entry.key, label: `${entry.title} (${entry.rows.length})` }))} />
        </Column>
        <Column flexBasis={220} flexGrow={1}>
          <Select<Sort> label="Order by" value={sort} onChange={setSort} options={[{ value: "order", label: "Organization chart" }, { value: "office", label: "Office" }, { value: "holder", label: "Leader" }, { value: "read", label: "Best rated" }, { value: "needs", label: "Needs you" }]} />
        </Column>
      </Row>
      <Text variant="body" tone="secondary">
        {current.lead}
      </Text>
      <Surface pad="none" overflow="hidden">
        {visible.map((row, index) => (
          <Line key={`${row.node.institution}:${row.node.office}`} campaign={campaign} row={row} first={index === 0} />
        ))}
      </Surface>
      {rows.length > PAGE ? (
        <Row gap="sm">
          <Text variant="caption" tone="secondary">{`Showing ${visible.length} of ${rows.length} offices`}</Text>
          <Button kind="quiet" size="compact" onPress={() => setAll(!all)}>
            {all ? "Show fewer" : `Show all ${rows.length}`}
          </Button>
        </Row>
      ) : null}
    </Column>
  );
}
