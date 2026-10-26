import { useDeferredValue, useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { place, formatDate, recordEntry, recordTimeline, type TimelineOption, type TimelineReading } from "@admin/player-core";
import { Button, Column, Empty, Icon, Pane, PressRow, ReadingFrame, Row, Sticky, Surface, Text, useMedia } from "@admin/ui";
import { Segmented, Select, TextInput } from "@admin/ui/forms";
import { WeekColumns, segmentKeyEntries } from "@admin/ui/news";
import { EntryRow } from "@admin/ui/record";
import { termDoor } from "../handbook/term-door";
import { termActivity } from "./course";
import { entryView } from "./entry-view";
import { RecordDetail } from "./RecordDetail";
import { filterOf, isFiltered, matchCount, type RecordParams, type RecordPatch } from "./record-params";

const PAGE = 40;
const ANY = "any";

type Props = { readonly campaign: Campaign; readonly params: RecordParams; readonly standalone: boolean; readonly onPatch: (patch: RecordPatch) => void };

function OptionSelect({ label, options, value, onChange }: { readonly label: string; readonly options: readonly TimelineOption[]; readonly value: string | undefined; readonly onChange: (next: string | undefined) => void }) {
  const missing = value !== undefined && !options.some((option) => option.value === value);
  return (
    <Column gap="2xs" flex={1} minWidth={160}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <Select label={label} value={value ?? ANY} onChange={(next) => onChange(next === ANY ? undefined : next)} options={[{ value: ANY, label: "Any" }, ...(missing ? [{ value: value!, label: `${value} (0)` }] : []), ...options.map((option) => ({ value: option.value, label: `${option.label} (${option.count})` }))]} />
    </Column>
  );
}

/** Search, who acted, and the domain, place and outcome an entry can be narrowed by, each with how many entries it keeps. */
function Filters({ reading, params, onPatch }: { readonly reading: TimelineReading; readonly params: RecordParams; readonly onPatch: (patch: RecordPatch) => void }) {
  const [words, setWords] = useState(params.q ?? "");
  const filtered = isFiltered(params);
  return (
    <Column gap="sm" role="form" aria-label="Search and filter the Record">
      <TextInput kind="search" icon="review" label="Search the Record" placeholder="A word, a state or a country" value={words} onChangeText={(text) => { setWords(text); onPatch({ q: text || undefined, entry: undefined }); }} />
      <Segmented label="Who acted" options={[{ value: "all", label: "Everything" }, { value: "player", label: "You" }, { value: "world", label: "The world" }]} value={params.actor ?? "all"} onChange={(actor) => onPatch({ actor: actor === "all" ? undefined : actor, entry: undefined })} />
      <Row gap="sm" wrap>
        <OptionSelect label="Topic" options={reading.domains} value={params.domain} onChange={(domain) => onPatch({ domain, entry: undefined })} />
        <OptionSelect label="Place" options={reading.subjects} value={params.subject} onChange={(subject) => onPatch({ subject, entry: undefined })} />
        <OptionSelect label="Outcome" options={reading.outcomes} value={params.outcome} onChange={(outcome) => onPatch({ outcome: outcome as RecordParams["outcome"], entry: undefined })} />
      </Row>
      <Row between gap="sm">
        <Text variant="caption" tone="secondary" role="status">{matchCount(reading.rows.length, reading.total, filtered)}</Text>
        {filtered ? <Button kind="quiet" size="compact" icon="close" onPress={() => { setWords(""); onPatch({ q: undefined, actor: undefined, domain: undefined, subject: undefined, outcome: undefined }); }}>Clear filters</Button> : null}
      </Row>
    </Column>
  );
}

/** The term's pace as columns: entries each month, the administration's against the world's. */
function Activity({ reading }: { readonly reading: TimelineReading }) {
  const { grain, columns: months } = useMemo(() => termActivity(reading.rows), [reading.rows]);
  if (months.length === 0) return null;
  const columns = months.map((month, i) => ({ key: i, label: month.label, total: month.player + month.world, spoken: `${month.label}: ${month.player} by you, ${month.world} by the world`, current: i === months.length - 1, segments: [{ key: "player", count: month.player, label: "You", ink: "gold" as const }, { key: "world", count: month.world, label: "The world", ink: "infoInk" as const }] }));
  const totals = [{ key: "player", count: months.reduce((sum, month) => sum + month.player, 0), label: "You", ink: "gold" as const }, { key: "world", count: months.reduce((sum, month) => sum + month.world, 0), label: "The world", ink: "infoInk" as const }];
  const unit = grain === "week" ? "week" : "month";
  const key = [...segmentKeyEntries(totals.filter((total) => total.count > 0)), { id: "now", kind: "swatch" as const, label: `Outline: the current ${unit}`, ink: "gold" as const, hollow: true }];
  const help = { meaning: `Each column counts the entries the Record made in one ${unit}. Gold is what your administration did, and blue is what the world did. The scale on the left is the number of entries.`, steps: [`Compare a column's gold and blue parts to see who drove that ${unit}.`, "A gold outline marks the current one, which is still filling.", "The totals in the key add up the whole term."], term: termDoor("the-record", "The Record") };
  return (
    <Surface>
      <ReadingFrame title={`Record entries each ${unit}`} unit="Entries" period="Your term so far" level={2} help={help} legend={key}>
        <WeekColumns columns={columns} minSlots={grain === "week" ? 13 : 6} />
      </ReadingFrame>
    </Surface>
  );
}

function List({ reading, selected, onOpen }: { readonly reading: TimelineReading; readonly selected: string | undefined; readonly onOpen: (id: string) => void }) {
  const [shown, setShown] = useState(PAGE);
  if (reading.total === 0) return <Surface level="sunken"><Empty title="Nothing in the Record yet" detail="Your first decision, order, or appointment will show up here." /></Surface>;
  if (reading.rows.length === 0) return <Surface level="sunken"><Empty title="No entries match these filters" detail="No entry carries those words and filters together." /></Surface>;
  const at = selected ? reading.rows.findIndex((row) => row.id === selected) : -1;
  const visible = Math.min(reading.rows.length, Math.max(shown, at < 0 ? 0 : Math.ceil((at + 1) / PAGE) * PAGE));
  return (
    <Column gap="sm">
      <Surface pad="sm" role="list" aria-label="Record entries, newest first">
        {reading.rows.slice(0, visible).map((row, i) => (
          <EntryRow href={place.event(row.id)} key={row.id} entry={entryView(row)} selected={row.id === selected} onPress={() => onOpen(row.id)} last={i === visible - 1} />
        ))}
      </Surface>
      <Row between gap="sm" wrap>
        <Text variant="caption" tone="secondary">{`Showing ${visible.toLocaleString("en-US")} of ${reading.rows.length.toLocaleString("en-US")} entries, newest first`}</Text>
        {visible < reading.rows.length ? <Button kind="secondary" size="compact" onPress={() => setShown(visible + PAGE)}>{`Show ${Math.min(PAGE, reading.rows.length - visible)} older`}</Button> : null}
      </Row>
    </Column>
  );
}

/** With no entry open: the newest three, dated in game time. */
function Orientation({ reading, onOpen }: { readonly reading: TimelineReading; readonly onOpen: (id: string) => void }) {
  return (
    <Pane kicker="The Record" title="Newest entries" icon="record" band="gold" level="raised">
      {reading.rows.length === 0 ? (
        <Text variant="body" tone="secondary">Nothing has been recorded yet.</Text>
      ) : (
        <Column>
          {reading.rows.slice(0, 3).map((row) => (
            <PressRow key={row.id} label={`Open the entry, ${row.headline}`} onPress={() => onOpen(row.id)} flexDirection="row" alignItems="center" gap="sm" paddingVertical="sm" paddingHorizontal="xs" minHeight={44} borderRadius="control">
              <Icon name="record" size={18} tone="colorSecondary" />
              <Column flex={1} minWidth={0} gap="2xs">
                <Text variant="caption" tone="secondary">{formatDate(row.date)}</Text>
                <Text variant="label">{row.headline}</Text>
              </Column>
              <Icon name="chevron" size={16} tone="colorTertiary" />
            </PressRow>
          ))}
        </Column>
      )}
    </Pane>
  );
}

/** The acts view: search and filters, the term's pace, the entries on a spine, and the open entry beside them (desktop) or in their place (phone). */
export function RecordWorkspace({ campaign, params, standalone, onPatch }: Props) {
  const media = useMedia();
  const query = useDeferredValue(params.q);
  const { actor, domain, subject, outcome } = params;
  const filter = useMemo(() => filterOf({ actor, domain, subject, outcome, q: query }), [actor, domain, subject, outcome, query]);
  const reading = useMemo(() => recordTimeline(campaign, filter), [campaign, filter]);
  const entry = useMemo(() => (params.entry ? recordEntry(campaign, params.entry) : undefined), [campaign, params.entry]);
  const open = (id: string) => onPatch({ entry: id });
  const detail = params.entry ? <RecordDetail campaign={campaign} entryId={params.entry} entry={entry} standalone={standalone} onOpen={open} onClose={() => onPatch({ entry: undefined })} /> : <Orientation reading={reading} onOpen={open} />;
  if (!media.desktop && params.entry) return detail;
  return (
    <Row gap="xl" top wrap={!media.desktop}>
      <Column gap="md" flex={1} minWidth={0}>
        <Filters reading={reading} params={params} onPatch={onPatch} />
        <Activity reading={reading} />
        <List key={JSON.stringify(filter)} reading={reading} selected={params.entry} onOpen={open} />
      </Column>
      {media.desktop ? <Sticky width={media.wide ? 620 : 460}>{detail}</Sticky> : null}
    </Row>
  );
}
