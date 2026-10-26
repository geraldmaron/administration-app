import { useState } from "react";
import { sealFor, type InquiryPipeline, type InquiryRow } from "@admin/player-core";
import { Tag, Button, Card, CardGrid, CardLink, Column, Meter, ReadingFrame, Row, Seal, Sheet, Surface, Text, useMedia, View } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { Note } from "../congress/parts";
import { CitedLawHelp } from "../law/LawHelp";
import { LAW } from "./model";

export type InquiryDirection = "received" | "directed";

const WORDS = {
  received: { title: "Investigations of your government", none: "No one is investigating your government right now. Inspectors general and committees in Congress decide on their own when to start one.", noun: "investigations of you" },
  directed: { title: "Reviews you ordered", none: "None of the reviews you ordered are open. You can start one by sending an instruction that asks for a review.", noun: "reviews you ordered" },
} as const;

function Source({ row }: { readonly row: InquiryRow }) {
  return (
    <Row gap="xs">
      <Seal spec={row.institution ? sealFor(row.institution, row.source) : sealFor("INST-CONGRESS")} size={28} />
      <Text variant="caption" tone="secondary" flex={1} numberOfLines={2}>{row.source}</Text>
    </Row>
  );
}

function InquiryCard({ row, onOpen }: { readonly row: InquiryRow; readonly onOpen: () => void }) {
  return (
    <CardLink role="button" onPress={onOpen} label={`Open the record: ${row.subject}`} pad="sm" radius="chip" gap="xs" {...(row.obstructed ? { accentEdge: "danger" as const } : {})}>
      <Source row={row} />
      <Text variant="label">{row.subject}</Text>
      <Row gap="xs" wrap>
        <Tag tone={row.public ? "warning" : "outline"} icon={row.public ? "press" : "hidden"}>{row.public ? "Public" : "Not yet public"}</Tag>
        {row.obstructed ? <Tag tone="danger" icon="caution">Someone interfered with the inspector</Tag> : null}
      </Row>
      <Text variant="caption" tone="tertiary">{row.nextMove ? `Next step · ${row.nextMove}` : `Opened · ${row.opened}`}</Text>
    </CardLink>
  );
}

/** A stage board of open matters and a focused record of one; opening a record never commits an act. */
export function Inquiries({ pipeline, direction }: { readonly pipeline: InquiryPipeline; readonly direction: InquiryDirection }) {
  const media = useMedia();
  const [selected, setSelected] = useState<InquiryRow | undefined>(undefined);
  const [archive, setArchive] = useState(false);
  const words = WORDS[direction];
  const mine = (row: InquiryRow) => row.received === (direction === "received");
  const stages = pipeline.stages.map((stage) => ({ ...stage, matters: stage.matters.filter(mine) }));
  const closed = pipeline.closed.filter(mine);
  const open = stages.reduce((sum, stage) => sum + stage.matters.length, 0);
  if (open === 0 && closed.length === 0 && direction === "directed") return <Note>{words.none}</Note>;
  return (
    <Card title={words.title} icon="review" actions={closed.length ? <Button kind="secondary" size="compact" icon="archive" onPress={() => setArchive(true)}>{`Closed · ${closed.length}`}</Button> : undefined} help={<CitedLawHelp title="Who checks your government" meaning="Committees in Congress and the inspectors general look into the executive branch on their own. You have to answer what the law requires, but you can't stop an investigation." cites={[LAW.inspectors]} />}>
      {direction === "received" ? (
        <ReadingFrame title="Pressure from Congress" unit="% of the heaviest pressure, 0 to 100" period="Now" legend={[{ id: "pressure", kind: "swatch", label: "How much public investigation weighs on Congress's mood toward you", ink: "danger" }]} help={{ meaning: "The bar shows how much the investigations that have gone public weigh on the Hill. 0% means none do. The higher it is, the colder Congress is toward you. It counts public investigations only, and it doesn't show votes or odds.", term: termDoor("congressional-inquiry", "a congressional inquiry") }}>
          <Meter label="Pressure now" value={pipeline.pressure} figure={`${Math.round(pipeline.pressure * 100)}%`} tone="danger" />
        </ReadingFrame>
      ) : null}
      {open > 0 ? (
      <CardGrid columns={{ phone: 2, tablet: 3, desktop: 5, wide: 5 }} gap="md" role="list" aria-label="Investigation steps">
        {stages.map((stage) => (
          <Column key={stage.stage} role="listitem" flexGrow={1} gap="2xs">
            <Text variant="caption" tone="secondary">{stage.label}</Text>
            <Text variant="heading" tabular>{stage.matters.length}</Text>
            <View height={6} borderRadius="pill" backgroundColor="borderColor" aria-hidden><View height={6} borderRadius="pill" backgroundColor="accent" width={`${open ? (stage.matters.length / open) * 100 : 0}%`} /></View>
          </Column>
        ))}
      </CardGrid>
      ) : null}
      {open === 0 ? <Note>{words.none}</Note> : (
        <Row gap="sm" top wrap={!media.desktop}>
          {stages.filter((stage) => stage.matters.length).map((stage) => (
            <Surface key={stage.stage} level="sunken" pad="sm" flex={1} minWidth={media.desktop ? 0 : 220}>
              <Column gap="xs">
                <Row between><Text variant="eyebrow" tone="secondary">{stage.label}</Text><Text variant="label" tabular>{stage.matters.length}</Text></Row>
                {stage.matters.map((row) => <InquiryCard key={row.id} row={row} onOpen={() => setSelected(row)} />)}
              </Column>
            </Surface>
          ))}
        </Row>
      )}
      <Sheet open={selected !== undefined} onClose={() => setSelected(undefined)} title={selected?.subject ?? "Investigation record"} eyebrow={selected?.source ?? "Investigation"}>
        {selected ? (
          <Column gap="sm">
            <Source row={selected} />
            <Tag tone="info" icon="review">{selected.stageWord}</Tag>
            <Text variant="caption">Opened {selected.opened} · Next step {selected.nextMove ?? "not known"} · {selected.public ? "Public" : "Not yet public"}</Text>
            <Text variant="eyebrow" tone="secondary">Latest evidence</Text>
            <Text variant="body">{selected.latest}</Text>
            {selected.obstructed ? <Note tone="danger">What was done to this inspector counts as interference. The investigation keeps going.</Note> : null}
            <Note>{selected.received ? "This group runs its own investigation. Looking at the record doesn't slow it down or end it." : "This review started because of your instruction. Its current step, not the instruction itself, shows how far along it is."}</Note>
          </Column>
        ) : null}
      </Sheet>
      <Sheet open={archive} onClose={() => setArchive(false)} title={`Closed ${words.noun}`} eyebrow="Archive" wide>
        {closed.map((row) => (
          <Column key={row.id} gap="2xs" paddingVertical="xs" borderBottomWidth={1} borderColor="borderColor">
            <Row between gap="sm"><Text variant="label" flex={1}>{row.subject}</Text><Tag tone="outline">{row.stageWord}</Tag></Row>
            <Text variant="caption" tone="secondary">{row.source} · Opened {row.opened}</Text>
            <Text variant="caption">{row.latest}</Text>
          </Column>
        ))}
      </Sheet>
    </Card>
  );
}
