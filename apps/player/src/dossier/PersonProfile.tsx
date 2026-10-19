import { useMemo, useState, type ReactNode } from "react";
import { institutionForRole, type Campaign } from "@admin/engine";
import { personRecord, place, type PersonFile } from "@admin/player-core";
import { Column, Icon, Row, Sticky, Surface, Text, View, type IconName } from "@admin/ui";
import { LinkText } from "../executive/parts";
import { Fitted, FilePart, byMinimum } from "./parts";
import { PersonReadings } from "./PersonReadings";
import { RecordInOffice } from "./PersonRecord";

/** A side note on the file: a mark, a short heading and what it says. */
function Note({ icon, title, children }: { readonly icon: IconName; readonly title: string; readonly children: ReactNode }) {
  return (
    <Surface level="raised" pad="md" flexGrow={1} gap="xs" role="region" aria-label={title}>
      <Row gap="xs">
        <Icon name={icon} size={16} tone="gold" />
        <Text variant="label" role="heading" aria-level={2} flex={1}>
          {title}
        </Text>
      </Row>
      {children}
    </Surface>
  );
}

/** What sits beside the record: their faction, what staff is watching, and how their loyalty has moved. Only the notes the file carries are drawn. */
function sideNotes(file: PersonFile): readonly ReactNode[] {
  const faction = file.dossier.faction;
  const office = faction ? institutionForRole(faction.role)?.offices[0] : undefined;
  const trend = file.dossier.loyaltyTrend;
  return [
    ...(faction
      ? [
          <Note key="faction" icon="layerBlocs" title="Faction">
            <Text variant="body">{`They belong to ${faction.name}, a group that broke with you. It has ${faction.members.length} ${faction.members.length === 1 ? "member" : "members"}, and ${faction.seated} ${faction.seated === 1 ? "is" : "are"} still in your cabinet.`}</Text>
            {office ? <LinkText href={place.office(office.id)}>{`Make peace with them from the ${office.title}'s office`}</LinkText> : null}
          </Note>,
        ]
      : []),
    ...(file.watch
      ? [
          <Note key="watch" icon="layerReading" title="What staff are watching">
            <Text variant="body">{file.watch.line}</Text>
          </Note>,
        ]
      : []),
    ...(trend && trend.movedPoints !== 0
      ? [
          <Note key="loyalty" icon={trend.movedPoints > 0 ? "favorable" : "adverse"} title="Loyalty since you appointed them">
            <Text variant="label" tone={trend.movedPoints > 0 ? "success" : "danger"}>{`${trend.movedPoints > 0 ? "Up" : "Down"} ${Math.abs(trend.movedPoints)} ${Math.abs(trend.movedPoints) === 1 ? "point" : "points"}`}</Text>
          </Note>,
        ]
      : []),
  ];
}

/** Below this width the side notes stop sitting beside the record and run as a row of equal cards above it. */
const SIDE_BESIDE = 860;

/** The record with the side notes beside it, pinned while the record scrolls; with no notes the record takes the full width. */
function RecordAndSide({ record, notes }: { readonly record: ReactNode; readonly notes: readonly ReactNode[] }) {
  const [width, setWidth] = useState(0);
  const beside = width >= SIDE_BESIDE && record !== null && notes.length > 0;
  const grid = notes.length > 0 ? (
    <Fitted count={notes.length} columnsFor={beside ? () => 1 : byMinimum(240, 8)} label="More about this person">
      {notes}
    </Fitted>
  ) : null;
  return (
    <View width="100%" onLayout={(event: { readonly nativeEvent: { readonly layout: { readonly width: number } } }) => setWidth(Math.round(event.nativeEvent.layout.width))}>
      {beside ? (
        <Row gap="xl" top>
          <Column flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0}>
            {record}
          </Column>
          <Sticky width={width >= 1100 ? 340 : 280}>{grid}</Sticky>
        </Row>
      ) : (
        <Column gap="xl">
          {grid}
          {record}
        </Column>
      )}
    </View>
  );
}

/** How the person reads, the full width first; then what they have done in the chair, with the notes on them beside it. */
export function PersonProfile({ campaign, file }: { readonly campaign: Campaign; readonly file: PersonFile }) {
  const record = useMemo(() => personRecord(campaign, file.person.id as string), [campaign, file.person.id]);
  return (
    <Column gap="xl">
      <FilePart title="What staff think of them" note="Each reading is your staff's best guess about one quality, like how loyal this person is. The meter has four steps, from weakest to strongest. Ambition works a little differently, because it shows how close they are to breaking away. Open any reading to see what staff base it on, how sure they are, and what it means for you.">
        <PersonReadings readings={file.readings} />
      </FilePart>
      <RecordAndSide record={record ? <RecordInOffice record={record} /> : null} notes={sideNotes(file)} />
    </Column>
  );
}
