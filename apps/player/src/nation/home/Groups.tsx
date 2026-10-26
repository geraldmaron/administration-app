import { useMemo } from "react";
import { COHORT_AXES, type CohortAxisId } from "@admin/world";
import type { Campaign } from "@admin/engine";
import { COHORT_AXIS_LABELS, STATE_GROUP_METHOD, place, stateGroupGrid, type CohortMemoryRow, type CrosstabGroup, type CrosstabRow, type GridRow, type MetricStance, type OpinionTrends, type TrendSeries } from "@admin/player-core";
import { Card, Column, Pressable, ReadingFrame, Row, Select, Surface, Text, View, sparklineKey } from "@admin/ui";
import { DataTable, Diverging, Track, sortRows, type SortState, type TableColumn } from "@admin/ui/nation";
import { go } from "../../shell/navigate";
import { markEntry, toneKey } from "../keys";
import { VALENCE_TEXT, VALENCE_TRACK, deltaValence, moveGlyph, percent, signValence, signedPoints, valenceOf } from "../format";
import { Course, recordStartDate } from "./Course";
import type { GroupSortKey, NationPatch, NationSearch } from "./search";

function CutRow({ row, topline, campaign, trends, series }: { readonly row: CrosstabRow; readonly topline: number; readonly campaign: Campaign; readonly trends: OpinionTrends; readonly series: TrendSeries | undefined }) {
  const valence = valenceOf(row.stance as MetricStance);
  const gap = row.support - topline;
  return (
    <Surface level="raised" pad="sm" role="listitem" aria-label={`${row.name}: ${row.figure}, ${row.word}, ${signedPoints(gap)} compared with the whole country`}>
      <Row gap="md" wrap>
        <Column width={180} gap="2xs">
          <Text variant="label">{row.name}</Text>
          <Row gap="xs">
            <Track value={row.share ?? 0} tone="neutral" slim />
            <Text variant="caption" tone="secondary" minWidth={90}>
              {row.share === undefined ? "No data" : `${percent(row.share)} of the country`}
            </Text>
          </Row>
        </Column>
        <View flex={1} minWidth={160}>
          <Track value={row.support} from={topline} tone={VALENCE_TRACK[valence]} marks={[{ at: topline, label: "Whole country", strong: true }]} />
        </View>
        <Text variant="title" tone={VALENCE_TEXT[valence]} tabular minWidth={48}>
          {row.figure}
        </Text>
        <Text variant="label" tone={VALENCE_TEXT[deltaValence(gap)]} minWidth={72}>
          {moveGlyph(gap)} {signedPoints(gap)}
        </Text>
        <Course campaign={campaign} start={trends.start} series={series} label={`${row.name}, week by week`} quiet />
      </Row>
    </Surface>
  );
}

function spread(group: CrosstabGroup): number {
  const values = group.rows.map((row) => row.support);
  return Math.max(...values) - Math.min(...values);
}

/**
 * The ways a pollster cuts the country, on one shared 0–100 axis: each
 * group's mark is where it stands, the dark line the country across the cuts,
 * and the fill between them the gap. The short bar is its share of the country.
 */
export function Cuts({ groups, topline, campaign, trends, selectedGroup, onGroup }: { readonly groups: readonly CrosstabGroup[]; readonly topline: number; readonly campaign: Campaign; readonly trends: OpinionTrends; readonly selectedGroup?: string; readonly onGroup: (group: string) => void }) {
  const active = groups.find((group) => group.id === selectedGroup) ?? groups[0];
  if (!active) return null;
  const recordShort = !trends.start.fromOath || trends.cohorts.every((series) => series.points.length < 2);
  const courses = new Map(trends.cohorts.map((series) => [series.id, series] as const));
  return (
    <Card id="nation-groups" title="How different groups see you" icon="layerBlocs" helper={`Each bar runs from 0% to 100%. The dark line is the whole country, at ${percent(topline)}. The colored part shows how far each group is from that.`}>
      <Select label="Group people by" options={groups.map((group) => ({ value: group.id, label: group.name }))} value={active.id} onChange={onGroup} />
      <Text variant="caption" tone="tertiary">
        Each choice sorts the same people a different way. One person can be in several groups, so the shares won't add up to 100%.
      </Text>
      <ReadingFrame
        title={`Approval by ${active.name.toLowerCase()}`}
        unit="% of each group who approve of you"
        period={`Highest to lowest: ${Math.round(spread(active) * 100)} pts apart`}
        legend={[markEntry("country", `The whole country, ${percent(topline)}`), ...toneKey({ good: "Group leans your way", watch: "Group is wary", bad: "Group leans against you", neutral: "Share of the country (short bar)" }), ...sparklineKey("neutral")]}
        help={{ meaning: "Each long bar runs from 0% to 100% approval for one group. The dark line is the whole country, and the colored part is how far the group is from it. The short bar under the name is the group's share of the country." }}
      >
        <Column gap="xs" role="list" aria-label={active.name}>
          {active.rows.map((row) => (
            <CutRow key={row.id} row={row} topline={topline} campaign={campaign} trends={trends} series={courses.get(row.id)} />
          ))}
        </Column>
      </ReadingFrame>
      <Text variant="caption" tone="secondary">
        {recordShort ? `The small charts only show the weeks tracked so far, starting ${recordStartDate(campaign, trends.start)}. ` : ""}Each group sees the same country but cares about different things, and it remembers what you've done for it or to it. That's why its number differs from the whole country. It isn't a separate poll.
      </Text>
    </Card>
  );
}

/** What each group remembers of the administration, the sorest first, from its own balance of harms and favors. */
export function Memory({ memory, total }: { readonly memory: readonly CohortMemoryRow[]; readonly total: number }) {
  const reach = Math.max(...memory.map((row) => Math.abs(row.displacement)), 0.0001);
  return (
    <Card title="What each group remembers" icon="record" helper={memory.length === 0 ? undefined : `${memory.length} of ${total} groups remember something you did. Bars to the left mean they hold it against you. Bars to the right mean they give you credit. Longer bars mean stronger feelings. None of this changes your overall approval number.`}>
      {memory.length === 0 ? (
        <Text variant="body" tone="secondary">
          No group remembers anything you've done yet. A group starts to remember when one of your actions affects it. Memories fade over time, and people remember harm longer than help.
        </Text>
      ) : (
        <ReadingFrame title="What each group holds against you or credits you for" unit="Strength of feeling, longest bar is strongest" legend={toneKey({ bad: "Holds it against you (left of the line)", good: "Gives you credit (right of the line)" })} help={{ meaning: "Each bar starts at the center line. Left means the group remembers harm you did it, and right means it remembers help. A longer bar is a stronger memory." }}>
        <Column gap="sm" role="list">
          {memory.map((row) => {
            const valence = signValence(row.displacement);
            return (
              <Column key={row.cohort} gap="2xs" role="listitem">
                <Row gap="sm">
                  <Column width={180}>
                    <Text variant="label">{row.name}</Text>
                    <Text variant="caption" tone="tertiary">
                      {row.axisLabel} · {percent(row.share)}
                    </Text>
                  </Column>
                  <Diverging value={row.displacement} scale={reach} />
                </Row>
                <Text variant="caption">
                  <Text variant="caption" weight="strong" tone={VALENCE_TEXT[valence]}>
                    {row.displacement < 0 ? "▼ Holds it against you. " : row.displacement > 0 ? "▲ Gives you credit. " : "▬ Even. "}
                  </Text>
                  {row.reading}
                </Text>
              </Column>
            );
          })}
        </Column>
        </ReadingFrame>
      )}
    </Card>
  );
}

/** How far from even a cell has to be before its color is at full strength, in share. */
const FULL_HEAT = 0.3;

/** A share shaded by how far it sits from half; with a link it opens that group in that state. */
function HeatCell({ support, link }: { readonly support: number; readonly link?: { readonly href: string; readonly label: string } }) {
  const heat = Math.min(1, Math.abs(support - 0.5) / FULL_HEAT);
  const body = (
    <>
      <View position="absolute" top={0} bottom={0} left={0} right={0} backgroundColor={support >= 0.5 ? "goodInk" : "badInk"} opacity={0.08 + heat * 0.32} />
      <Text variant="label" tabular textAlign="right">
        {percent(support)}
      </Text>
    </>
  );
  const frame = { paddingHorizontal: "xs", paddingVertical: "2xs", minHeight: 24, justifyContent: "center", borderRadius: "chip", position: "relative", overflow: "hidden", alignSelf: "stretch" } as const;
  if (!link) return <View {...frame}>{body}</View>;
  return (
    <Pressable role="link" aria-label={`${link.label}. See this group`} href={link.href} onPress={() => go(link.href)} {...frame}>
      {body}
    </Pressable>
  );
}

/** Every state against every group of one cut of the country, colored around half, sortable by any column. */
export function StateGroups({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: NationSearch; readonly onSearch: (patch: NationPatch) => void }) {
  const axis: CohortAxisId = search.group ?? "place";
  const sort: SortState<GroupSortKey> = { key: search.groupSort ?? "approval", direction: search.groupDirection ?? "descending" };
  const grid = useMemo(() => stateGroupGrid(campaign, axis), [campaign, axis]);
  const read = useMemo(() => {
    const cohorts = Object.fromEntries(grid.groups.map((group) => [group.cohort, (row: GridRow) => row.cells.find((cell) => cell.cohort === group.cohort)?.support ?? 0]));
    return { name: (row: GridRow) => row.name, approval: (row: GridRow) => row.approval, ...cohorts } as Readonly<Record<GroupSortKey, (row: GridRow) => number | string>>;
  }, [grid]);
  const rows = useMemo(() => sortRows(grid.rows, sort, read, (a, b) => a.name.localeCompare(b.name)), [grid, sort, read]);
  if (grid.rows.length === 0) return null;
  const peopleHref = (row: GridRow, cohort?: string) => `${place.state(row.state)}?view=people${cohort ? `&cohort=${cohort}` : ""}`;
  const columns: readonly TableColumn<GridRow, GroupSortKey>[] = [
    { id: "name", label: "State", sortKey: "name", render: (row) => <Text variant="label">{row.name}</Text> },
    { id: "approval", label: "All", detail: "approval", sortKey: "approval", first: "descending", align: "end", render: (row) => <HeatCell support={row.approval} /> },
    ...grid.groups.map((group, index): TableColumn<GridRow, GroupSortKey> => ({
      id: group.cohort,
      label: group.name,
      detail: `${percent(group.national)} nationally`,
      sortKey: group.cohort,
      first: "descending",
      align: "end",
      render: (row) => {
        const cell = row.cells[index];
        return cell ? <HeatCell support={cell.support} link={{ href: peopleHref(row, cell.cohort), label: `${group.name} in ${row.name}: ${percent(cell.support)}` }} /> : <Text variant="caption">—</Text>;
      },
    })),
  ];
  return (
    <Card title="Groups in each state" icon="layerBlocs" helper={STATE_GROUP_METHOD}>
      <Select label="Group people by" options={COHORT_AXES.map((value) => ({ value, label: COHORT_AXIS_LABELS[value] }))} value={axis} onChange={(group) => onSearch({ group, groupSort: undefined, groupDirection: undefined })} />
      <ReadingFrame
        title={`Approval by state and ${grid.axisName.toLowerCase()} group`}
        unit="% who approve"
        legend={[{ id: "above", kind: "swatch", label: "Half or more approve (darker is further from half)", ink: "goodInk" }, { id: "below", kind: "swatch", label: "Fewer than half approve", ink: "badInk" }]}
        pressHint="Press a row to open that state's groups. Press a group's figure to open it there."
        help={{ meaning: "Every cell is the share of one group in one state who approve of you. The shade only says how far that share is from half." }}
      >
      <DataTable caption={`Approval among each ${grid.axisName.toLowerCase()} group in every state`} columns={columns} rows={rows} rowKey={(row) => row.state} rowPress={{ href: (row) => peopleHref(row), onPress: (row) => go(peopleHref(row)), label: (row) => `See the groups in ${row.name}` }} selected={(row) => row.state === search.state} sort={sort} onSort={(next) => onSearch({ groupSort: next.key, groupDirection: next.direction })} initial={15} noun="states" />
      </ReadingFrame>
    </Card>
  );
}

