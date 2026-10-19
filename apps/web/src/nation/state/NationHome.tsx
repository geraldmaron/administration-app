import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { NATION_LENSES, electorateView, formatRatio, nationOverview, NATION_LENS_NAMES, type NationLensId } from "@admin/player-core";
import { Icon, Tabs } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { Screen } from "../../shell/Screen";
import { ApprovalActs } from "../electorate/ApprovalActs";
import { Cuts } from "../electorate/Cuts";
import { Memory } from "../electorate/Memory";
import { Polarization } from "../electorate/Polarization";
import { Problems } from "../electorate/Problems";
import { StateGroups } from "../electorate/StateGroups";
import { Topline } from "../electorate/Topline";
import "../electorate/electorate.css";
import { ConditionList, EmergencyList } from "./Conditions";
import { NATION_LENS_ABOUT, NATION_MAP_LENS } from "./lenses";
import { NationKpis } from "./NationKpis";
import { StatesTable } from "./StatesTable";
import { stateTableRows } from "./states-table";
import "./nation-kpis.css";
import "./state.css";

import { isNationView, type NationViewId, type NationSearch, type NationPatch } from "./nation-search";
export { isNationView };
export type { NationViewId };

const TABS = [
  { id: "opinion", label: "Public opinion" },
  { id: "groups", label: "Groups" },
  { id: "states", label: "States" },
] as const;

export type NationHomeProps = {
  readonly campaign: Campaign;
  readonly search: NationSearch;
  readonly onSearch: (patch: NationPatch) => void;
  readonly view: NationViewId;
  readonly lens: NationLensId;
  readonly onView: (view: NationViewId) => void;
  readonly onLens: (lens: NationLensId) => void;
};

/**
 * The one screen for the country and what it thinks: the week's readings,
 * the shared map by the chosen lens, then three views under them. Public
 * opinion is the topline and the six judgments behind it; Groups cut the
 * electorate ten ways and say what each remembers; States lists every state
 * and what it is living through. Every figure is read off the same engine
 * values the Brief and the Digest quote.
 */
type PairProps = { readonly rows: ReturnType<typeof stateTableRows>; readonly lens: NationLensId; readonly median: number; readonly onLens: (lens: NationLensId) => void; readonly search: NationSearch; readonly onSearch: (patch: NationPatch) => void };

/** The map and the full states table side by side: a state chosen on either is lit in both, and its name opens it. */
function MapAndTable({ rows, lens, median, onLens, search, onSearch }: PairProps) {
  const chosen = search.state;
  return (
    <div className="nhome-pair">
      <MapView
        title={`The states by ${NATION_LENS_NAMES[lens].toLowerCase()}`}
        lens={NATION_MAP_LENS[lens]}
        camera="us"
        note={NATION_LENS_ABOUT[lens]}
        lenses={NATION_LENSES.map((id) => ({ id: NATION_MAP_LENS[id], label: NATION_LENS_NAMES[id] }))}
        onLens={(id) => onLens(NATION_LENSES.find((candidate) => NATION_MAP_LENS[candidate] === id) ?? "approval")}
        {...(chosen ? { selection: `state:${chosen}` } : {})}
        onChoose={(ref) => ref.startsWith("state:") && onSearch({ state: rows.find((row) => row.id === ref.slice("state:".length))?.id as NationSearch["state"] })}
      />
      <section className="elec-panel nhome-pair__table" aria-labelledby="nation-states-title">
        <h2 id="nation-states-title" className="elec-panel__title">
          All states
        </h2>
        <p className="elec-note">Choose a state on the map or pin one here to light it; its name opens the state. The middle state approves at {formatRatio(median)}.</p>
        <StatesTable rows={rows} readingLabel={NATION_LENS_NAMES[lens]} withRecord={lens === "approval"} compact selected={chosen} onSelect={(state) => onSearch({ state: state as NationSearch["state"] })} filter={{ query: search.query ?? "", party: search.party ?? "any", flaggedOnly: search.flagged ?? false }} onFilter={(filter) => onSearch({ query: filter.query || undefined, party: filter.party === "any" ? undefined : filter.party, flagged: filter.flaggedOnly ? true : undefined })} sort={{ key: search.sort ?? "name", direction: search.direction ?? "ascending" }} onSortChange={(sort) => onSearch({ sort: sort.key, direction: sort.direction })} />
      </section>
    </div>
  );
}

export function NationHome({ campaign, view, lens, onView, onLens, search, onSearch }: NationHomeProps) {
  const overview = useMemo(() => nationOverview(campaign), [campaign]);
  const book = useMemo(() => electorateView(campaign), [campaign]);
  const rows = useMemo(() => stateTableRows(campaign, overview, lens, book.states), [campaign, overview, lens, book.states]);
  const groupCount = book.cuts.reduce((sum, cut) => sum + cut.rows.length, 0);
  return (
    <Screen
      title="Nation"
      icon="flag"
      eyebrow="The country and its opinion"
      lede={`${formatRatio(campaign.player.metrics.approval)} approve nationwide. Compare the judgments, communities and state conditions behind that figure.`}
      screenClass="workspace"
      measure="data"
      camera="us"
    >
      <div className="nation-room nhome">
        <NationKpis campaign={campaign} overview={overview} topline={book.topline} trends={book.trends} />
        <Tabs label="Views of the country" tabs={TABS} selected={view} onSelect={(next) => onView(next as NationViewId)}>
          {view === "groups" ? (
            <>
              <Cuts selectedGroup={search.group} onGroup={(group) => onSearch({ group: group as NationSearch["group"], groupSort: undefined, groupDirection: undefined })} groups={book.cuts} topline={book.cutsAverage} campaign={campaign} trends={book.trends} />
              <Memory memory={book.memory} total={groupCount} />
            </>
          ) : view === "states" ? (
            <>
              <MapAndTable rows={rows} lens={lens} median={overview.median} onLens={onLens} search={search} onSearch={onSearch} />
              <section className="elec-panel" aria-labelledby="nation-conditions-title">
                <h2 id="nation-conditions-title" className="elec-panel__title">
                  <Icon name="caution" size={16} /> What the states are living through
                </h2>
                <EmergencyList emergencies={overview.emergencies} />
                <ConditionList conditions={overview.conditions} none="No state is living through a condition this week." />
              </section>
              <StateGroups campaign={campaign} search={search} onSearch={onSearch} />
            </>
          ) : (
            <>
              <Topline topline={book.topline} blocs={book.blocs} campaign={campaign} trends={book.trends} />
              <ApprovalActs campaign={campaign} />
              <Polarization campaign={campaign} trends={book.trends} />
              <Problems problems={book.problems} />
            </>
          )}
        </Tabs>
      </div>
    </Screen>
  );
}
