import { useMemo } from "react";
import { ALIGNMENT_RANK, ALIGNMENT_WORDS, WORLD_REGIONS, WORLD_REGION_NAMES, place, type Stance, type WorldGovernment, type WorldRegionId } from "@admin/player-core";
import { Badge, CardGrid, Column, Field, Key, ReadingFrame, Row, Select, Sparkline, Text, TextInput, swatchEntries, type KeyEntry } from "@admin/ui";
import { Panel, ShareBar, SortTable, StateChip, valenceFill, type RowPress, type TableColumn } from "@admin/ui/world";
import { termDoor } from "../../handbook/term-door";
import { NationName, go, stanceValence } from "../parts";
import { stanceParts } from "./stance-parts";

const STANCE_RANK: Readonly<Record<Stance, number>> = { adverse: 1, caution: 2, neutral: 3, favorable: 4 };
const TREND_VALENCE = { warming: "good", steady: "neutral", cooling: "bad" } as const;

const TABLE_KEY: readonly KeyEntry[] = [
  ...swatchEntries(stanceParts({ favorable: 0, neutral: 0, caution: 0, adverse: 0, unread: 0 }).map((part) => ({ key: `view-${part.key}`, label: `Views of us: ${part.word}`, ink: valenceFill(part.valence as "good") }))),
  { id: "warming", kind: "line", label: "Trend: warming toward us", ink: "successInk" },
  { id: "steady", kind: "line", label: "Trend: steady", ink: "accent" },
  { id: "cooling", kind: "line", label: "Trend: cooling", ink: "danger" },
];

function matches(row: WorldGovernment, query: string): boolean {
  const text = query.trim().toLowerCase();
  return text === "" || [row.name, row.capital, row.adjective].some((field) => field.toLowerCase().includes(text));
}

function StandingCell({ row }: { readonly row: WorldGovernment }) {
  if (row.trust === undefined || row.stance === undefined || row.stance === "unread") {
    return (
      <Text variant="caption" tone="tertiary">
        {row.standingWord}
      </Text>
    );
  }
  return (
    <Column gap="2xs" width="100%">
      <ShareBar value={row.trust} valence={stanceValence(row.stance)} label={`${row.name}, how it sees the United States: ${row.standingWord}`} />
      <Text variant="caption" weight="strong">
        {row.standingWord}
      </Text>
    </Column>
  );
}

function DirectionCell({ row }: { readonly row: WorldGovernment }) {
  if (!row.trend) {
    return (
      <Text variant="caption" tone="tertiary">
        {row.stance === "unread" ? "Unknown" : "No history yet"}
      </Text>
    );
  }
  const valence = TREND_VALENCE[row.trend.direction];
  return (
    <Row gap="xs">
      <Sparkline values={row.trend.values} valence={valence} width={56} height={20} />
      <Text variant="caption" weight="strong" tone={valence === "good" ? "success" : valence === "bad" ? "danger" : "secondary"}>
        {row.trend.word}
      </Text>
    </Row>
  );
}

const COLUMNS: readonly TableColumn<WorldGovernment>[] = [
  {
    id: "name",
    label: "Country",
    width: 210,
    sort: (row) => row.name,
    render: (row) => (
      <Column gap="2xs">
        <NationName nation={row.nation} name={row.name} height={16} role={`${row.capital} · ${row.regionName}`} />
        <Text variant="caption" tone="tertiary">
          {row.capital}
        </Text>
        {row.atWar ? <Badge status="danger" icon="conflict">At war with the US</Badge> : null}
      </Column>
    ),
  },
  { id: "region", label: "Region", width: 120, sort: (row) => row.regionName, render: (row) => <Text variant="caption">{row.regionName}</Text> },
  { id: "standing", label: "Views of us", width: 140, first: "descending", sort: (row) => row.trust, render: (row) => <StandingCell row={row} /> },
  { id: "direction", label: "Trend", detail: "four weeks", width: 140, first: "descending", sort: (row) => row.trend?.change, render: (row) => <DirectionCell row={row} /> },
  {
    id: "ours",
    label: "Your view of them",
    width: 120,
    first: "descending",
    sort: (row) => (row.ours ? STANCE_RANK[row.ours.stance] : undefined),
    render: (row) => (row.ours ? <StateChip valence={stanceValence(row.ours.stance)}>{row.ours.word}</StateChip> : <Text variant="caption" tone="tertiary">None</Text>),
  },
  {
    id: "alignment",
    label: "Sides with us",
    width: 130,
    first: "descending",
    sort: (row) => ALIGNMENT_RANK[row.alignment],
    render: (row) => (
      <Column gap="2xs">
        <Text variant="caption">{ALIGNMENT_WORDS[row.alignment]}</Text>
        {row.allied ? <Badge status="success">Treaty ally</Badge> : row.treaties > 0 ? <Text variant="caption" tone="tertiary">{row.treaties} {row.treaties === 1 ? "treaty" : "treaties"}</Text> : null}
      </Column>
    ),
  },
  { id: "trade", label: "US trade", detail: "share", width: 90, align: "end", first: "descending", sort: (row) => row.tradeShare, render: (row) => <Text variant="caption" tabular>{row.tradeText}</Text> },
  { id: "forces", label: "US forces", width: 100, first: "descending", sort: (row) => row.forces, render: (row) => <Text variant="caption">{row.forcesText}</Text> },
];

const OPEN_FILE: RowPress<WorldGovernment> = { href: (row) => place.country(row.nation), onPress: (row) => go(place.country(row.nation)), label: (row) => `Open ${row.name}'s file` };

type Props = {
  readonly governments: readonly WorldGovernment[];
  readonly region: WorldRegionId | null;
  readonly onRegion: (region: WorldRegionId | null) => void;
  readonly query: string;
  readonly onQuery: (query: string) => void;
};

function countLine(shown: number, total: number, region: WorldRegionId | null): string {
  const where = region ? ` in ${WORLD_REGION_NAMES[region]}` : "";
  return shown === total ? `${total} countries${where}.` : `${shown} of ${total} countries${where}.`;
}

/** Every government on the columns a President compares them by: sorted by any header, paged, each row a door to its file. */
export function GovernmentsTable({ governments, region, onRegion, query, onQuery }: Props) {
  const inRegion = useMemo(() => (region ? governments.filter((row) => row.region === region) : governments), [governments, region]);
  const found = useMemo(() => inRegion.filter((row) => matches(row, query)), [inRegion, query]);
  return (
    <Panel title="Countries" icon="world" count={found.length}>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 2 }} gap="lg">
        <Column flexGrow={1}>
          <Field label="Find a country" help="Search by name, capital, or what its people are called, like French or Kenyan.">
            {(control) => <TextInput {...control} kind="search" value={query} onChangeText={onQuery} icon="dossier" />}
          </Field>
        </Column>
        <Column flexGrow={1}>
          <Field label="Region">
            {(control) => <Select {...control} label="Region" value={region ?? "all"} onChange={(value) => onRegion(value === "all" ? null : (value as WorldRegionId))} options={[{ value: "all", label: "Every region" }, ...WORLD_REGIONS.map((id) => ({ value: id, label: WORLD_REGION_NAMES[id] }))]} />}
          </Field>
        </Column>
      </CardGrid>
      <Text variant="caption" tone="secondary" role="status">
        {countLine(found.length, inRegion.length, region)}
      </Text>
      <ReadingFrame title="How to read the bars and trend lines" unit="Bar: how much that country trusts the United States. Trend: the last four weeks" pressHint="Press a country's row to open its file. Press a column's name to sort by it." help={{ meaning: "The bar under Views of us fills with how much the country trusts the United States, in the color of its word. The small line under Trend is the last four weeks of that trust, ending in an arrow for the way it moved.", term: termDoor("trust-in-us", "What moves a country's trust in you") }}>
        <Key entries={TABLE_KEY} label="Key: views of us and trend" />
        <SortTable
          caption="Every country, with how it sees the United States, its trend, which side it's on, trade, and US forces there"
          columns={COLUMNS}
          rows={found}
          rowKey={(row) => row.nation}
          initialSort={{ key: "standing", direction: "descending" }}
          tie={(a, b) => a.name.localeCompare(b.name)}
          highlight={(row) => row.atWar}
          rowPress={OPEN_FILE}
          empty="No country matches. Clear the search or pick a different region to see more."
        />
      </ReadingFrame>
    </Panel>
  );
}
