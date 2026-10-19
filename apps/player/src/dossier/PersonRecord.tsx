import { useState } from "react";
import type { OfficeRecordRow, PersonFile, PersonRecord } from "@admin/player-core";
import { Button, Column, Icon, ReadingFrame, Row, Surface, Text, type IconName } from "@admin/ui";
import { Select } from "@admin/ui/forms";
import { CareerBands } from "@admin/ui/dossier";
import { CardTo, RowTo } from "../executive/parts";
import { Fitted, FilePart, byMinimum } from "./parts";
import { careerBands, vitalsOf } from "./person-view";

type Sort = "order" | "matter" | "outcome" | "cast" | "standing";

const CAST_MARK: Readonly<Record<OfficeRecordRow["castKey"], IconName | undefined>> = { yea: "approve", nay: "reject", strike: "adverse", uphold: "approve", agreed: "approve", declined: "reject", acted: undefined };
const PAGE = 8;

function sorted(rows: readonly OfficeRecordRow[], sort: Sort): readonly OfficeRecordRow[] {
  if (sort === "order") return rows;
  const field = sort === "matter" ? "title" : sort;
  return [...rows].sort((a, b) => a[field].localeCompare(b[field]));
}

function RecordRows({ record }: { readonly record: PersonRecord }) {
  const [sort, setSort] = useState<Sort>("order");
  const [all, setAll] = useState(false);
  const { columns } = record;
  const rows = sorted(record.rows, sort);
  const shown = all ? rows : rows.slice(0, PAGE);
  const options = [{ value: "order" as const, label: "Newest first" }, { value: "matter" as const, label: columns.matter }, ...(columns.outcome ? [{ value: "outcome" as const, label: columns.outcome }] : []), ...(columns.cast ? [{ value: "cast" as const, label: columns.cast }] : []), ...(columns.standing ? [{ value: "standing" as const, label: columns.standing }] : [])];
  return (
    <Column gap="sm">
      <Select<Sort> label="Sort by" value={sort} onChange={setSort} options={options} />
      <Surface pad="none" overflow="hidden">
        {shown.map((row, index) => {
          const mark = CAST_MARK[row.castKey];
          return (
            <RowTo key={row.key} first={index === 0} href={row.href} label={`Open ${row.title}`}>
              <Row gap="md" wrap padding="sm" top>
                <Column flex={1} minWidth={200} gap="2xs">
                  <Text variant="label">{row.title}</Text>
                  <Text variant="caption" tone="tertiary">
                    {row.detail}
                  </Text>
                </Column>
                {columns.outcome ? <Text variant="caption" minWidth={100}>{row.outcome}</Text> : null}
                {columns.cast ? (
                  <Row gap="xs" minWidth={90}>
                    {mark ? <Icon name={mark} size={14} tone="colorSecondary" /> : null}
                    <Text variant="label">{row.cast}</Text>
                  </Row>
                ) : null}
                {columns.standing ? <Text variant="caption" tone="secondary" minWidth={100}>{row.standing}</Text> : null}
              </Row>
            </RowTo>
          );
        })}
      </Surface>
      {rows.length > PAGE ? (
        <Button kind="quiet" size="compact" onPress={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${rows.length} decisions`}
        </Button>
      ) : null}
    </Column>
  );
}

/** Facts as equal tiles: a label above its value, the value a door where it has one. */
function RecordFacts({ facts, label }: { readonly facts: readonly { readonly label: string; readonly value: string; readonly href?: string; readonly icon?: IconName }[]; readonly label: string }) {
  if (facts.length === 0) return null;
  return (
    <Fitted count={facts.length} columnsFor={byMinimum(200, 8)} label={label}>
      {facts.map((fact) => {
        const body = (
          <>
            <Row gap="xs">
              {fact.icon ? <Icon name={fact.icon} size={16} tone="gold" /> : null}
              <Text variant="caption" tone="secondary" flex={1}>
                {fact.label}
              </Text>
              {fact.href ? <Icon name="chevron" size={16} tone="colorTertiary" /> : null}
            </Row>
            <Text variant="label">{fact.value}</Text>
          </>
        );
        return fact.href ? (
          <CardTo key={fact.label} href={fact.href} label={`Open ${fact.value}`} pad="md" flexGrow={1} gap="2xs">
            {body}
          </CardTo>
        ) : (
          <Surface key={fact.label} pad="md" flexGrow={1} gap="2xs">
            {body}
          </Surface>
        );
      })}
    </Fitted>
  );
}

/** What this person has done in the chair they hold: the decisions with the vote, or the facts a governor or foreign leader has. */
export function RecordInOffice({ record }: { readonly record: PersonRecord }) {
  return (
    <FilePart title={record.title} {...(record.note ? { note: record.note } : {})}>
      <RecordFacts facts={record.facts} label={`${record.title}, key facts`} />
      {record.rows.length > 0 ? <RecordRows record={record} /> : <Text variant="body" tone="secondary">{record.empty}</Text>}
    </FilePart>
  );
}

const eventHref = (id: string | undefined): string | undefined => (id ? `/record/event/${encodeURIComponent(id)}` : undefined);

const STANCE = { for: { word: "Backed it", icon: "approve" }, wary: { word: "Had doubts", icon: "caution" }, against: { word: "Argued against it", icon: "reject" } } as const;

/** The facts a reader checks first, then the working life as bands along the years, what they have done under this administration and the counsel they gave, each a door to its Record entry. */
export function CareerAndCounsel({ file }: { readonly file: PersonFile }) {
  const during = file.career.filter((entry) => !entry.key.startsWith("career:"));
  return (
    <Column gap="xl">
      <RecordFacts facts={vitalsOf(file)} label="Key facts" />
      <FilePart title="Career" note={`${file.person.career.length} ${file.person.career.length === 1 ? "job" : "jobs"} before you took office${during.length > 0 ? `, and ${during.length} ${during.length === 1 ? "entry" : "entries"} on your Record since` : ""}.`}>
        <ReadingFrame title="Their working life" unit="Jobs along the years" period="Before they joined your administration" help={{ meaning: "Each band is a job, drawn along the years it lasted. A longer band is a longer stretch in that job." }}>
          <CareerBands bands={careerBands(file)} />
        </ReadingFrame>
        {during.length > 0 ? (
          <Surface pad="none" overflow="hidden">
            {during.map((entry, index) => (
              <RowTo key={entry.key} first={index === 0} href={eventHref(entry.eventId)} label={`Open the Record entry from ${entry.when}`}>
                <Row gap="sm" top padding="sm">
                  <Icon name="record" size={14} tone="gold" />
                  <Text variant="caption" tone="secondary" minWidth={90}>
                    {entry.when}
                  </Text>
                  <Text variant="caption" flex={1}>
                    {entry.text}
                  </Text>
                </Row>
              </RowTo>
            ))}
          </Surface>
        ) : null}
      </FilePart>
      <FilePart title="Advice they've given you">
        {file.dossier.counsel.length === 0 ? <Text variant="body" tone="secondary">They haven't advised you on a hard decision yet. When they do, you'll see here whether they backed it, had doubts, or argued against it.</Text> : null}
        {file.dossier.counsel.length > 0 ? (
          <Surface pad="none" overflow="hidden">
            {file.dossier.counsel.map((row, index) => (
              <RowTo key={row.entry.causal?.eventId ?? `${row.entry.turn}:${row.entry.description}`} first={index === 0} href={eventHref(row.entry.causal?.eventId)} label={`Open the Record entry where they ${STANCE[row.stance].word.toLowerCase()}`}>
                <Row gap="sm" top padding="sm">
                  <Icon name={STANCE[row.stance].icon} size={16} tone={row.stance === "for" ? "successInk" : row.stance === "against" ? "danger" : "warningInk"} />
                  <Column flex={1} gap="2xs">
                    <Text variant="label">{`${STANCE[row.stance].word}${row.primary ? " (your main adviser on this)" : ""}`}</Text>
                    <Text variant="caption">{row.entry.description}</Text>
                  </Column>
                </Row>
              </RowTo>
            ))}
          </Surface>
        ) : null}
      </FilePart>
    </Column>
  );
}
