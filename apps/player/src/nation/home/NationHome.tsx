import { useMemo } from "react";
import type { Campaign, ConditionKind } from "@admin/engine";
import { electorateView, formatRatio, nationOverview, sealFor } from "@admin/player-core";
import { Card, CardGrid, Column, Page, Seal, Section, SectionNav, scrollToSection, type SectionNavItem } from "@admin/ui";
import type { MapPin } from "@admin/ui/map";
import { EMPTY_SELECTION, choose, selectAll, selectOnly, toggle, type Selection } from "../../batch/selection";
import { MetricActs } from "../MetricReading";
import { Attention, attentionCount } from "./Attention";
import { ConditionStrip } from "./ConditionStrip";
import { Cuts, Memory, StateGroups } from "./Groups";
import { Levers } from "./Levers";
import { NationStage } from "./NationStage";
import { Polarization, Problems } from "./Opinion";
import { StatesTable } from "./StatesTable";
import { Topline } from "./Topline";
import { STAGE_LENS_NAMES, tableLens } from "./stage-lens";
import { stateTableRows, type StateTableRow } from "./states-table";
import type { NationPatch, NationSearch } from "./search";

type Props = { readonly campaign: Campaign; readonly search: NationSearch; readonly onSearch: (patch: NationPatch) => void };

/** An old link that named a view lands on the section that now holds it. */
const VIEW_SECTION = { states: "nation-map", groups: "nation-groups", opinion: "nation-opinion" } as const;

/** The address's chosen states as a selection: the extra ones first, the one in focus last. */
function selectionOf(search: NationSearch): Selection {
  return search.state ? { members: [...(search.also ?? []), search.state], focus: search.state } : EMPTY_SELECTION;
}

/** A selection back into the address: the focus as the state, the rest beside it. */
function patchOf(selection: Selection, cause?: ConditionKind): NationPatch {
  const focus = selection.focus ?? selection.members[selection.members.length - 1];
  const also = selection.members.filter((id) => id !== focus);
  return { state: focus as NationSearch["state"], also: also.length > 0 ? (also as NationSearch["also"]) : undefined, cause: selection.members.length === 1 ? cause : undefined };
}

/** The pins: a declaration in force outranks an open matter. */
function marksOf(rows: readonly StateTableRow[]): ReadonlyMap<string, MapPin["kind"]> {
  return new Map(rows.flatMap((row): [string, MapPin["kind"]][] => (row.declared ? [[`state:${row.id}`, "declared"]] : row.needs > 0 ? [[`state:${row.id}`, "needs"]] : [])));
}

function sections(waiting: number): readonly SectionNavItem[] {
  return [
    { id: "nation-map", label: "Map", icon: "mapPin" },
    { id: "nation-condition", label: "Overview", icon: "flag" },
    { id: "nation-states", label: "All states", icon: "graph" },
    { id: "nation-conditions", label: "Needs you", icon: "caution", count: waiting },
    { id: "nation-opinion", label: "Opinion", icon: "ballot" },
    { id: "nation-levers", label: "Run the country", icon: "building" },
  ];
}

function OpinionCards({ campaign, search, onSearch }: Props) {
  const book = useMemo(() => electorateView(campaign), [campaign]);
  const groupCount = book.cuts.reduce((sum, cut) => sum + cut.rows.length, 0);
  return (
    <Column gap="lg">
      <Topline topline={book.topline} blocs={book.blocs} campaign={campaign} trends={book.trends} />
      <CardGrid columns={{ phone: 1, tablet: 1, desktop: 2, wide: 2 }} gap="lg">
        <Polarization campaign={campaign} trends={book.trends} />
        <Problems problems={book.problems} />
      </CardGrid>
      <CardGrid columns={{ phone: 1, tablet: 1, desktop: 2, wide: 2 }} gap="lg">
        <Card title="How your actions changed your approval" icon="record">
          <MetricActs bare campaign={campaign} metric="approval" actor="player" title="How your actions changed your approval" empty="None of your actions has changed your approval yet. Events outside your control still move it every week." />
        </Card>
        <Memory memory={book.memory} total={groupCount} />
      </CardGrid>
      <Cuts groups={book.cuts} topline={book.cutsAverage} campaign={campaign} trends={book.trends} {...(search.group ? { selectedGroup: search.group } : {})} onGroup={(group) => onSearch({ group: group as NationSearch["group"], groupSort: undefined, groupDirection: undefined })} />
      <StateGroups campaign={campaign} search={search} onSearch={onSearch} />
    </Column>
  );
}

/**
 * The country, run from one page. Top to bottom: the map with the chosen
 * state's panel beside it (where a state is managed and every federal act is
 * taken), the headline readings, every state as the map's list, what waits on
 * you, what the country thinks, and the four places you run it from. The map,
 * the list and Needs your attention share one selection, kept in the address.
 */
export function NationHome({ campaign, search, onSearch }: Props) {
  const overview = useMemo(() => nationOverview(campaign), [campaign]);
  const book = useMemo(() => electorateView(campaign), [campaign]);
  const lens = search.lens ?? "approval";
  const rows = useMemo(() => stateTableRows(campaign, overview, tableLens(lens), book.states), [campaign, overview, lens, book.states]);
  const marks = useMemo(() => marksOf(rows), [rows]);
  const selection = selectionOf(search);
  const commit = (next: Selection, cause?: ConditionKind) => onSearch(patchOf(next, cause));
  const actOn = (state: string, cause?: ConditionKind) => {
    commit(selectOnly(state), cause);
    scrollToSection("nation-selection");
  };
  const readingLabel = STAGE_LENS_NAMES[tableLens(lens)];
  return (
    <Page wide eyebrow="The country" icon="flag" title="Nation" lede={`${formatRatio(campaign.player.metrics.approval)} of Americans approve of you. Pick a state on the map to see how it feels about you and to act there.`} emblem={<Seal spec={sealFor("INST-STATES")} size={72} />}>
      <SectionNav label="Parts of the Nation page" items={sections(attentionCount(rows, overview))} {...(search.view ? { initial: VIEW_SECTION[search.view] } : {})} />
      <NationStage campaign={campaign} overview={overview} rows={rows} lens={lens} onLens={(next) => onSearch({ lens: next === "approval" ? undefined : next })} chosen={selection.members} {...(search.cause ? { cause: search.cause } : {})} onChoose={(state, additive) => commit(choose(selection, state, additive))} onMany={(ids) => commit(selectAll(selection, ids))} onCause={(cause) => commit(selection, cause)} onClear={() => commit(EMPTY_SELECTION)} onFocus={(focus) => { onSearch({ focus }); scrollToSection("nation-states"); }} marks={marks} />
      <Section id="nation-condition" icon="flag" title="How the country is doing" helper="The four numbers that sum up the country this week. Each change is since last week.">
        <ConditionStrip campaign={campaign} overview={overview} topline={book.topline} trends={book.trends} onCall={() => onSearch({ lens: "call" })} />
      </Section>
      <Section id="nation-states" icon="graph" title="All states" helper="Every state from the map in one list you can sort and filter. Check one or more states to manage them in the panel beside the map.">
        <StatesTable
          rows={rows}
          readingLabel={readingLabel}
          withRecord={tableLens(lens) === "approval"}
          chosen={selection.members}
          onToggle={(state) => commit(toggle(selection, state))}
          onChoose={(state) => actOn(state)}
          onMany={(ids) => {
            commit(selectAll(selection, ids));
            scrollToSection("nation-selection");
          }}
          filter={{ query: search.query ?? "", party: search.party ?? "any", flaggedOnly: search.flagged ?? false, focus: search.focus ?? "any" }}
          onFilter={(filter) => onSearch({ query: filter.query || undefined, party: filter.party === "any" ? undefined : filter.party, flagged: filter.flaggedOnly ? true : undefined, focus: filter.focus === "any" ? undefined : filter.focus })}
          sort={{ key: search.sort ?? "name", direction: search.direction ?? "ascending" }}
          onSort={(sort) => onSearch({ sort: sort.key === "name" ? undefined : sort.key, direction: sort.direction === "ascending" ? undefined : sort.direction })}
        />
      </Section>
      <Section id="nation-conditions" icon="caution" title="Needs your attention" helper="Everything at home that is waiting on you. Pick a state's problem to see what you can do about it on the map above.">
        <Attention campaign={campaign} overview={overview} rows={rows} onAct={actOn} />
      </Section>
      <Section id="nation-opinion" icon="ballot" title="Public opinion and groups" helper="What Americans think of you, why, and how different groups see you.">
        <OpinionCards campaign={campaign} search={search} onSearch={onSearch} />
      </Section>
      <Section id="nation-levers" icon="building" title="Run the country" helper="The four places where you set policy, spend money, steer the economy and handle emergencies.">
        <Levers campaign={campaign} declared={overview.emergencies.length} />
      </Section>
    </Page>
  );
}
