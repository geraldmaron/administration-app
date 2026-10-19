import { useMemo } from "react";
import { useMedia } from "@tamagui/core";
import type { UsParty } from "@admin/engine";
import { place } from "@admin/player-core";
import { Badge, Button, Column, EntityLink, Icon, Peek, Pressable, ReadingFrame, Row, Segmented, Sparkline, Text, TextInput, Toggle, sparklineKey, type KeyEntry } from "@admin/ui";
import { DataTable, Track, type TableColumn } from "@admin/ui/nation";
import { go } from "../../shell/navigate";
import { VALENCE_TEXT, VALENCE_TRACK, type Valence } from "../format";
import { NO_FILTER, filterStates, sortStates, weekPoints, type StateFilter, type StateTableRow } from "./states-table";
import type { Direction, StateFocus, StateSortKey } from "./search";

const PARTY_LETTER: Readonly<Record<UsParty, string>> = { democrat: "D", republican: "R", independent: "I" };
const BAND_VALENCE: Readonly<Record<NonNullable<StateTableRow["relationshipBand"]>, Valence>> = { allied: "good", cooperative: "good", guarded: "watch", opposed: "bad" };
const GLYPH = { good: "▲ ", watch: "⚠ ", bad: "▼ ", neutral: "" } as const;

function Move({ row }: { readonly row: StateTableRow }) {
  if (row.change === undefined) {
    return (
      <Text variant="caption" tone="tertiary">
        No week to compare yet
      </Text>
    );
  }
  const flat = Math.abs(row.change) < 0.0005;
  const valence = flat ? "neutral" : row.change > 0 ? "good" : "bad";
  return (
    <Row gap="xs">
      <Text variant="label" tone={VALENCE_TEXT[valence]}>
        {flat ? "▬" : row.change > 0 ? "▲" : "▼"} {weekPoints(row.change)}
      </Text>
      {row.history.length > 1 ? <Sparkline values={row.history} valence={valence} width={64} height={20} /> : null}
    </Row>
  );
}

function GovernorLine({ row }: { readonly row: StateTableRow }) {
  if (!row.governor) {
    return (
      <Text variant="caption" tone="tertiary">
        No governor
      </Text>
    );
  }
  return (
    <Row gap="2xs" wrap>
      {row.governorId ? <Peek name={row.governor} role={`Governor of ${row.name}`} openLabel="Open their file" onOpen={() => go(place.person(row.governorId!))} /> : <Text variant="label">{row.governor}</Text>}
      {row.party ? <Text variant="caption" tone="secondary">({PARTY_LETTER[row.party]})</Text> : null}
    </Row>
  );
}

function Flags({ row }: { readonly row: StateTableRow }) {
  if (row.conditions === 0 && !row.declared) return <Text variant="caption" tone="tertiary" aria-label="None">—</Text>;
  return (
    <Row gap="2xs" wrap justifyContent="flex-end">
      {row.conditions > 0 ? (
        <Badge status="warning" icon="caution">
          {row.conditions} {row.conditions === 1 ? "problem" : "problems"}
        </Badge>
      ) : null}
      {row.declared ? (
        <Badge status="gold" icon="order">
          Emergency
        </Badge>
      ) : null}
    </Row>
  );
}

function Relationship({ row }: { readonly row: StateTableRow }) {
  const valence = row.relationshipBand ? BAND_VALENCE[row.relationshipBand] : undefined;
  return (
    <Column gap="2xs" alignItems="flex-end">
      <Text variant="label" tone={valence ? VALENCE_TEXT[valence] : "tertiary"} textAlign="right">
        {valence ? GLYPH[valence] : ""}
        {row.relationship}
      </Text>
      {row.relationshipMeaning ? (
        <Text variant="caption" tone="secondary" textAlign="right">
          {row.relationshipMeaning}
        </Text>
      ) : null}
    </Column>
  );
}

function Needs({ row, withFlags }: { readonly row: StateTableRow; readonly withFlags?: boolean }) {
  const flagged = withFlags && (row.conditions > 0 || row.declared);
  if (row.needs === 0) {
    return (
      <Column gap="2xs" alignItems="flex-end">
        <Text variant="caption" tone="tertiary" aria-label="Nothing needs you">Nothing waiting</Text>
        {flagged ? <Flags row={row} /> : null}
      </Column>
    );
  }
  return (
    <Column gap="2xs" alignItems="flex-end">
      <Badge status="warning" icon="caution">
        {row.needs} to answer
      </Badge>
      <Text variant="caption" tone="secondary" textAlign="right">
        {row.needTitles.join(", ")}
      </Text>
      {flagged ? <Flags row={row} /> : null}
    </Column>
  );
}

function Reading({ row, withMove }: { readonly row: StateTableRow; readonly withMove?: boolean }) {
  return (
    <Column gap="2xs" alignSelf="stretch">
      <Text variant="label" tone={row.valence ? VALENCE_TEXT[row.valence] : "primary"} textAlign="right">
        {row.valence ? GLYPH[row.valence] : ""}
        {row.reading}
      </Text>
      {row.meter ? <Track value={row.meter.value} tone={row.valence ? VALENCE_TRACK[row.valence] : "reading"} slim {...(row.meter.mark === undefined ? {} : { marks: [{ at: row.meter.mark, label: "Even" }] })} {...(row.meter.from === undefined ? {} : { from: row.meter.from })} /> : null}
      {withMove ? (
        <Column alignItems="flex-end">
          <Move row={row} />
        </Column>
      ) : null}
    </Column>
  );
}

export type StatesTableProps = {
  readonly rows: readonly StateTableRow[];
  readonly readingLabel: string;
  /** Approval is the only lens with a weekly record to show beside it. */
  readonly withRecord: boolean;
  /** The chosen states; each row's box adds or takes out its state. */
  readonly chosen?: readonly string[];
  readonly onToggle?: (id: string) => void;
  /** The whole row chooses its state alone, for the panel beside the map. */
  readonly onChoose?: (id: string) => void;
  /** Chooses every state the filters show. */
  readonly onMany?: (ids: readonly string[]) => void;
  /** Beside a map: the search and the readings only. */
  readonly compact?: boolean;
  readonly filter: StateFilter;
  readonly onFilter: (filter: StateFilter) => void;
  readonly sort: { readonly key: StateSortKey; readonly direction: Direction };
  readonly onSort: (sort: { readonly key: StateSortKey; readonly direction: Direction }) => void;
};

/** What a lens's figure counts, so the frame says the unit and not only the lens. */
function readingUnit(label: string): string {
  return /population/i.test(label) ? "People" : /lean/i.test(label) ? "Points toward one party" : "% of the state";
}

/** The marks the reading column draws on this lens, and the weekly path beside approval. */
function readingKey(rows: readonly StateTableRow[], withRecord: boolean): readonly KeyEntry[] {
  const halfway = rows.some((row) => row.meter?.mark !== undefined);
  const center = rows.some((row) => row.meter?.from !== undefined);
  return [
    ...(halfway ? [{ id: "halfway", kind: "tick" as const, label: "Even: half the state each way", ink: "colorSecondary" as const }] : []),
    ...(center ? [{ id: "center", kind: "tick" as const, label: "Even: neither party ahead", ink: "colorSecondary" as const }] : []),
    ...(withRecord ? sparklineKey("neutral") : []),
  ];
}

type Tier = "phone" | "tablet" | "desktop" | "wide";

/** Below the wide breakpoint the content column is too narrow for eight columns, so secondary facts fold under the one they qualify. */
function useTier(): Tier {
  const media = useMedia();
  return media.wide ? "wide" : media.desktop ? "desktop" : media.tablet ? "tablet" : "phone";
}

/** The row's box: checked when the state is chosen, so the list and the map always show the same set. */
function Pick({ row, on, onToggle }: { readonly row: StateTableRow; readonly on: boolean; readonly onToggle: (id: string) => void }) {
  return (
    <Pressable role="checkbox" aria-checked={on} aria-label={on ? `${row.name} is selected. Take it out` : `Select ${row.name}`} onPress={() => onToggle(row.id)} width={28} height={28} alignItems="center" justifyContent="center" borderRadius="control" borderWidth={2} borderColor={on ? "accent" : "borderColorStrong"} backgroundColor={on ? { default: "accentFill", hover: "accentFillHover" } : { default: "surface", hover: "surfaceHover" }}>
      {on ? <Icon name="approve" size={16} tone="accentInk" weight="bold" /> : null}
    </Pressable>
  );
}

function columnsFor({ readingLabel, withRecord, compact, chosen, onToggle, tier }: Pick<StatesTableProps, "readingLabel" | "withRecord" | "compact" | "chosen" | "onToggle"> & { readonly tier: Tier }): readonly TableColumn<StateTableRow, StateSortKey>[] {
  const roomy = tier === "wide" || tier === "phone";
  const foldMove = tier === "tablet" && withRecord;
  return [
    {
      id: "name",
      label: "State",
      sortKey: "name",
      flex: tier === "tablet" ? 2.2 : 2,
      render: (row) => (
        <Column gap="2xs">
          <Row gap="xs">
            {onToggle ? <Pick row={row} on={chosen?.includes(row.id) === true} onToggle={onToggle} /> : null}
            <EntityLink label={row.name} href={row.href} onPress={() => go(row.href)} />
          </Row>
          {!roomy && !compact ? <GovernorLine row={row} /> : null}
        </Column>
      ),
    },
    ...(compact || !roomy ? [] : [{ id: "governor", label: "Governor", sortKey: "governor" as const, render: (row: StateTableRow) => <GovernorLine row={row} /> }]),
    ...(compact
      ? []
      : [
          { id: "relationship", label: "Relationship", sortKey: "relationship" as const, align: "end" as const, flex: tier === "tablet" ? 1.7 : 1.4, render: (row: StateTableRow) => <Relationship row={row} /> },
          { id: "needs", label: roomy ? "Needs you" : "Needs you and alerts", sortKey: "needs" as const, first: "descending" as const, align: "end" as const, flex: 1, render: (row: StateTableRow) => <Needs row={row} withFlags={!roomy} /> },
        ]),
    { id: "reading", label: readingLabel, sortKey: "reading", first: "descending", align: "end", render: (row) => <Reading row={row} withMove={foldMove} /> },
    ...(withRecord && !foldMove ? [{ id: "change", label: "Since last week", sortKey: "change" as const, first: "descending" as const, align: "end" as const, render: (row: StateTableRow) => <Move row={row} /> }] : []),
    ...(compact || !roomy ? [] : [{ id: "flags", label: "Alerts", sortKey: "flags" as const, first: "descending" as const, align: "end" as const, render: (row: StateTableRow) => <Flags row={row} /> }]),
  ];
}

/**
 * All the states in one sortable, filterable table: the map's list. A press
 * anywhere on a row chooses its state for the panel beside the map, the box
 * adds it to or takes it out of a set of several, and the name opens the
 * state's own page for deeper reading.
 */
export function StatesTable(props: StatesTableProps) {
  const { rows, readingLabel, withRecord, chosen, onChoose, onMany, compact, filter, onFilter, sort, onSort } = props;
  const tier = useTier();
  const shown = useMemo(() => sortStates(filterStates(rows, filter), sort.key, sort.direction), [rows, filter, sort]);
  const filtering = filter.query !== "" || filter.party !== "any" || filter.flaggedOnly || filter.focus !== "any";
  return (
    <Column gap="sm">
      <TextInput kind="search" label="Find a state or governor" icon="mapPin" value={filter.query} onChangeText={(query) => onFilter({ ...filter, query })} placeholder="Find a state or governor" />
      {compact ? null : (
        <Row gap="md" wrap>
          <Segmented<UsParty | "any"> label="Governor's party" options={[{ value: "any", label: "Any governor" }, { value: "democrat", label: "Democratic" }, { value: "republican", label: "Republican" }]} value={filter.party} onChange={(party) => onFilter({ ...filter, party })} />
          <Segmented<StateFocus | "any"> label="Show" options={[{ value: "any", label: "All" }, { value: "needs", label: "Needs you" }, { value: "against", label: "Against you" }, { value: "declared", label: "Emergency" }]} value={filter.focus} onChange={(focus) => onFilter({ ...filter, focus })} />
          <Toggle label="Only states with a problem or an emergency" value={filter.flaggedOnly} onChange={(flaggedOnly) => onFilter({ ...filter, flaggedOnly })} />
        </Row>
      )}
      <Row gap="sm" wrap>
        {onMany && shown.length > 0 ? (
          <Button kind="secondary" size="compact" icon="mapPin" onPress={() => onMany(shown.map((row) => row.id))}>
            {filter.focus === "needs" ? `Select all ${shown.length} that need you` : `Select all ${shown.length} shown`}
          </Button>
        ) : null}
        {filtering ? (
          <Button kind="quiet" size="compact" icon="close" onPress={() => onFilter(NO_FILTER)}>
            Clear filters
          </Button>
        ) : null}
      </Row>
      <ReadingFrame
        title={`${readingLabel} in every state`}
        unit={readingUnit(readingLabel)}
        {...(withRecord ? { period: "Change since last week" } : {})}
        legend={readingKey(rows, withRecord)}
        pressHint={onChoose ? "Press a row to manage that state on the map. The state's name opens its page." : "Press a state's name to open its page."}
        help={{ meaning: "Each row is a state. The bar in the reading column shows where its figure sits, and the thin line across it is the halfway point where the state is evenly split.", steps: ["Sort by any column heading.", "Check the boxes to manage several states at once."] }}
      >
        <DataTable caption={`All states, by ${readingLabel.toLowerCase()}`} columns={columnsFor({ ...props, tier })} rows={shown} rowKey={(row) => row.id} sort={sort} onSort={onSort} initial={compact ? 10 : 15} noun="states" empty={`No states match. Clear the filters to see all ${rows.length}.`} selected={(row) => chosen?.includes(row.id) === true} {...(onChoose ? { rowPress: { onPress: (row: StateTableRow) => onChoose(row.id), label: (row: StateTableRow) => `Manage ${row.name} on the map` } } : {})} />
      </ReadingFrame>
    </Column>
  );
}
