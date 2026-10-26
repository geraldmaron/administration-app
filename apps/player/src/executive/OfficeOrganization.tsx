import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { chairRead, formatDate, place, type OfficeFile } from "@admin/player-core";
import { Empty, Tag, Button, CardGrid, Column, Row, Surface, Text } from "@admin/ui";
import { DossierSection, StaffingBadge } from "@admin/ui/dossier";
import { CardTo, ChairReadBadge, ChairReadKey, InstitutionSeal, RowTo } from "./parts";
import { PersonFace } from "../dossier/PersonFace";
import { PersonName } from "../dossier/PersonPeek";
import { rosterRowsOf, type RosterRow } from "./roster";

function Unit({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const { node } = row;
  const person = node.holder ? campaign.people[node.holder]?.base : undefined;
  return (
    <CardTo href={node.href} label={`Open ${node.name}`} pad="md" gap="sm" flexGrow={1}>
      <Row gap="sm" top>
        <InstitutionSeal id={node.institution} name={node.name} size={44} />
        <Column flex={1}>
          <Text variant="label">{node.name}</Text>
          <Text variant="caption" tone="secondary">
            {node.title}
          </Text>
        </Column>
      </Row>
      <Row gap="sm">
        <PersonFace campaign={campaign} id={node.holder} name={node.holderName ?? "Vacant"} muted={!node.holder} size={32} />
        {node.holder ? <PersonName campaign={campaign} id={node.holder} name={node.holderName ?? "The leader"} variant="caption" /> : <Text variant="caption" tone="tertiary">Nobody in the job</Text>}
      </Row>
      <Row gap="xs" wrap>
        {node.staffing === "confirmed" ? null : <StaffingBadge staffing={node.staffing} />}
        {row.nominee ? <Tag tone="info" icon="appoint">{`Nominee: ${row.nominee.name}`}</Tag> : null}
        {person ? <ChairReadBadge read={chairRead(person)} /> : null}
      </Row>
      {node.alerts[0] ? <Text variant="caption" tone="danger">{node.alerts[0].text}</Text> : null}
    </CardTo>
  );
}

/** The agencies under an office drawn as the chart they are: the chair on top, a card per agency under it. */
function Chart({ campaign, file }: { readonly campaign: Campaign; readonly file: OfficeFile }) {
  const rows = rosterRowsOf(campaign, file.agencies);
  if (rows.length === 0) return <Empty title="No agencies report to this office" detail="It's a staff or a single office, with no agencies below it." />;
  return (
    <Column gap="md" alignItems="stretch">
      <Surface level="raised" pad="md" alignSelf="center" accentEdge="gold">
        <Row gap="sm">
          <InstitutionSeal id={file.institution.id} name={file.name} size={52} />
          <Column>
            <Text variant="label">{file.name}</Text>
            <Text variant="caption" tone="secondary">
              {file.holderName ?? "Nobody in the job"}
            </Text>
          </Column>
          <StaffingBadge staffing={file.staffing} />
        </Row>
      </Surface>
      <Column alignSelf="center" width={2} height={20} backgroundColor="borderColorStrong" />
      <ChairReadKey />
      <Column borderTopWidth={2} borderTopColor="borderColorStrong" paddingTop="md">
        <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 3 }} gap="sm" role="list" aria-label={`${rows.length} agencies under ${file.name}`}>
          {rows.map((row) => (
            <Unit key={row.node.office} campaign={campaign} row={row} />
          ))}
        </CardGrid>
      </Column>
    </Column>
  );
}

function Commands({ file }: { readonly file: OfficeFile }) {
  const [all, setAll] = useState(false);
  if (file.commands.length === 0) return null;
  const shown = all ? file.commands : file.commands.slice(0, 6);
  return (
    <DossierSection n={2} icon="shield" title="Military commands">
      {shown.map((command) => (
        <RowTo key={command.id} href={place.command(command.id)} label={`Open ${command.name}`} borderTopWidth={0} borderBottomWidth={1} borderBottomColor="borderColor">
          <Row gap="md" wrap padding="sm">
            <Text variant="label" width={104}>
              {command.abbr}
            </Text>
            <Text variant="body" flex={1} minWidth={160}>
              {command.name}
            </Text>
            <Tag tone="outline">{`Alert level: ${command.posture}`}</Tag>
          </Row>
        </RowTo>
      ))}
      {file.commands.length > 6 ? (
        <Button kind="quiet" size="compact" onPress={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${file.commands.length} commands`}
        </Button>
      ) : null}
    </DossierSection>
  );
}

export function OfficeOrganization({ campaign, file }: { readonly campaign: Campaign; readonly file: OfficeFile }) {
  return (
    <Column gap="xl">
      <DossierSection n={1} icon="building" title="Agencies under it">
        <Chart campaign={campaign} file={file} />
      </DossierSection>
      <Commands file={file} />
    </Column>
  );
}

/** What the Record says this office did, newest first, each a door to its entry. */
export function OfficeRecord({ file }: { readonly file: OfficeFile }) {
  return (
    <DossierSection n={1} icon="record" title="On the Record">
      {file.record.length === 0 ? <Empty title="The Record doesn't name this office yet" detail="No order, appointment or result involves it yet." /> : null}
      {file.record.map((row) => (
        <RowTo key={row.id} href={`/record/event/${encodeURIComponent(row.id)}`} label={`Open the Record entry: ${row.headline}`} borderTopWidth={0} borderBottomWidth={1} borderBottomColor="borderColor">
          <Row gap="md" between wrap padding="sm">
            <Column flex={1} minWidth={200}>
              <Text variant="label">{row.headline}</Text>
            </Column>
            <Text variant="caption" tone="secondary">
              {formatDate(row.date)}
            </Text>
          </Row>
        </RowTo>
      ))}
    </DossierSection>
  );
}
